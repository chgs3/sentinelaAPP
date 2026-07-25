import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { getZodErrorMessage } from '../utils/zodError';
import { periodQuerySchema } from '../schemas/periodSchemas';
import { summaryComparisonQuerySchema } from '../schemas/summaryComparisonSchemas';
import { summaryDailyQuerySchema } from '../schemas/summaryDailySchemas';
import {
  addMoney,
  subtractMoney,
  sumMoney,
} from '../utils/serializeFinancial';
import { logError } from '../utils/logger';

function buildPeriodSummary(
  transactions: Array<{
    type: string;
    amount: unknown;
  }>
) {
  const totalIncomes = sumMoney(
    transactions
      .filter((transaction) => transaction.type === 'income')
      .map((transaction) => transaction.amount)
  );

  const totalExpenses = sumMoney(
    transactions
      .filter((transaction) => transaction.type === 'expense')
      .map((transaction) => transaction.amount)
  );

  const balance = subtractMoney(totalIncomes, totalExpenses);

  return {
    totalIncomes,
    totalExpenses,
    balance,
    totalTransactions: transactions.length,
  };
}

function getMonthDateRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  return { start, end };
}

function getPreviousMonthYear(month: number, year: number) {
  if (month === 1) {
    return { month: 12, year: year - 1 };
  }

  return { month: month - 1, year };
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

class SummaryController {
  async getPeriodSummary(req: Request, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const parsedQuery = periodQuerySchema.safeParse(req.query);

      if (!parsedQuery.success) {
        return res.status(400).json({
          message: getZodErrorMessage(parsedQuery.error),
        });
      }

      const { startDate, endDate } = parsedQuery.data;

      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return res.status(400).json({
          message: 'Período inválido.',
        });
      }

      const transactions = await prisma.transaction.findMany({
        where: {
          userId,
          transactionAt: {
            gte: start,
            lte: end,
          },
        },
      });

      return res.status(200).json(buildPeriodSummary(transactions));
    } catch (error) {
      logError('summary_period_failed', error, {
        requestId: req.requestId,
        userId: req.userId,
      });
      return res.status(500).json({
        message: 'Erro ao gerar resumo do período.',
      });
    }
  }

  async getCategoriesSummary(req: Request, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const parsedQuery = periodQuerySchema.safeParse(req.query);

      if (!parsedQuery.success) {
        return res.status(400).json({
          message: getZodErrorMessage(parsedQuery.error),
        });
      }

      const { startDate, endDate } = parsedQuery.data;

      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return res.status(400).json({
          message: 'Período inválido.',
        });
      }

      const expenseTransactions = await prisma.transaction.findMany({
        where: {
          userId,
          type: 'expense',
          transactionAt: {
            gte: start,
            lte: end,
          },
        },
        orderBy: {
          transactionAt: 'desc',
        },
      });

      const grouped = expenseTransactions.reduce<
        Record<string, { category: string; total: number; count: number }>
      >((acc, transaction) => {
        const key = transaction.category;

        if (!acc[key]) {
          acc[key] = {
            category: transaction.category,
            total: 0,
            count: 0,
          };
        }

        acc[key].total = addMoney(acc[key].total, transaction.amount);
        acc[key].count += 1;

        return acc;
      }, {});

      const categories = Object.values(grouped).sort((a, b) => b.total - a.total);

      return res.status(200).json(categories);
    } catch (error) {
      logError('summary_categories_failed', error, {
        requestId: req.requestId,
        userId: req.userId,
      });
      return res.status(500).json({
        message: 'Erro ao gerar resumo por categoria.',
      });
    }
  }

  async getMonthComparison(req: Request, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const parsedQuery = summaryComparisonQuerySchema.safeParse(req.query);

      if (!parsedQuery.success) {
        return res.status(400).json({
          message: getZodErrorMessage(parsedQuery.error),
        });
      }

      const { month, year } = parsedQuery.data;
      const previousPeriod = getPreviousMonthYear(month, year);

      const currentRange = getMonthDateRange(year, month);
      const previousRange = getMonthDateRange(
        previousPeriod.year,
        previousPeriod.month
      );

      const [currentTransactions, previousTransactions] = await Promise.all([
        prisma.transaction.findMany({
          where: {
            userId,
            transactionAt: {
              gte: currentRange.start,
              lte: currentRange.end,
            },
          },
        }),
        prisma.transaction.findMany({
          where: {
            userId,
            transactionAt: {
              gte: previousRange.start,
              lte: previousRange.end,
            },
          },
        }),
      ]);

      const currentSummary = buildPeriodSummary(currentTransactions);
      const previousSummary = buildPeriodSummary(previousTransactions);

      return res.status(200).json({
        current: {
          month,
          year,
          ...currentSummary,
        },
        previous: {
          month: previousPeriod.month,
          year: previousPeriod.year,
          ...previousSummary,
        },
        diff: {
          totalIncomes:
            subtractMoney(
              currentSummary.totalIncomes,
              previousSummary.totalIncomes
            ),
          totalExpenses:
            subtractMoney(
              currentSummary.totalExpenses,
              previousSummary.totalExpenses
            ),
          balance: subtractMoney(
            currentSummary.balance,
            previousSummary.balance
          ),
          totalTransactions:
            currentSummary.totalTransactions - previousSummary.totalTransactions,
        },
      });
    } catch (error) {
      logError('summary_comparison_failed', error, {
        requestId: req.requestId,
        userId: req.userId,
      });
      return res.status(500).json({
        message: 'Erro ao gerar comparativo mensal.',
      });
    }
  }

  async getDailySummary(req: Request, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const parsedQuery = summaryDailyQuerySchema.safeParse(req.query);

      if (!parsedQuery.success) {
        return res.status(400).json({
          message: getZodErrorMessage(parsedQuery.error),
        });
      }

      const { month, year } = parsedQuery.data;
      const { start, end } = getMonthDateRange(year, month);

      const transactions = await prisma.transaction.findMany({
        where: {
          userId,
          transactionAt: {
            gte: start,
            lte: end,
          },
        },
        orderBy: {
          transactionAt: 'asc',
        },
      });

      const daysInMonth = getDaysInMonth(year, month);

      const dailyMap = new Map<
        number,
        {
          day: number;
          date: string;
          totalIncomes: number;
          totalExpenses: number;
          balance: number;
          totalTransactions: number;
        }
      >();

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(Date.UTC(year, month - 1, day));
        dailyMap.set(day, {
          day,
          date: date.toISOString().slice(0, 10),
          totalIncomes: 0,
          totalExpenses: 0,
          balance: 0,
          totalTransactions: 0,
        });
      }

      for (const transaction of transactions) {
        const transactionDate = new Date(transaction.transactionAt);
        const day = transactionDate.getUTCDate();
        const current = dailyMap.get(day);

        if (!current) continue;

        if (transaction.type === 'income') {
          current.totalIncomes = addMoney(
            current.totalIncomes,
            transaction.amount
          );
        } else if (transaction.type === 'expense') {
          current.totalExpenses = addMoney(
            current.totalExpenses,
            transaction.amount
          );
        }

        current.balance = subtractMoney(
          current.totalIncomes,
          current.totalExpenses
        );
        current.totalTransactions += 1;
      }

      return res.status(200).json(Array.from(dailyMap.values()));
    } catch (error) {
      logError('summary_daily_failed', error, {
        requestId: req.requestId,
        userId: req.userId,
      });
      return res.status(500).json({
        message: 'Erro ao gerar evolução diária.',
      });
    }
  }
}

export default new SummaryController();
