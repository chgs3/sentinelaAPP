import { Request, Response } from 'express';
import prisma from '../config/prisma';
import {
  createMonthlyClosureSchema,
  listMonthlyClosuresQuerySchema,
} from '../schemas/monthlyClosureSchemas';
import { getZodErrorMessage } from '../utils/zodError';
import {
  serializeMonthlyClosure,
  subtractMoney,
  sumMoney,
} from '../utils/serializeFinancial';
import { logError } from '../utils/logger';

function getMonthDateRange(year: number, month: number) {
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  return { startDate, endDate };
}

class MonthlyClosureController {
  async create(req: Request, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const parsedBody = createMonthlyClosureSchema.safeParse(req.body);

      if (!parsedBody.success) {
        return res.status(400).json({
          message: getZodErrorMessage(parsedBody.error),
        });
      }

      const { month, year } = parsedBody.data;

      const existingClosure = await prisma.monthlyClosure.findUnique({
        where: {
          userId_month_year: {
            userId,
            month,
            year,
          },
        },
      });

      if (existingClosure) {
        return res.status(409).json({
          message: 'Este mês já foi fechado anteriormente.',
        });
      }

      const { startDate, endDate } = getMonthDateRange(year, month);

      const transactions = await prisma.transaction.findMany({
        where: {
          userId,
          transactionAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

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
      const totalTransactions = transactions.length;

      const closure = await prisma.monthlyClosure.create({
        data: {
          month,
          year,
          startDate,
          endDate,
          totalIncomes,
          totalExpenses,
          balance,
          totalTransactions,
          userId,
        },
      });

      return res.status(201).json({
        message: 'Mês fechado com sucesso.',
        closure: serializeMonthlyClosure(closure),
      });
    } catch (error) {
      logError('monthly_closure_create_failed', error, {
        requestId: req.requestId,
        userId: req.userId,
      });
      return res.status(500).json({
        message: 'Erro ao fechar o mês.',
      });
    }
  }

  async list(req: Request, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const parsedQuery = listMonthlyClosuresQuerySchema.safeParse(req.query);

      if (!parsedQuery.success) {
        return res.status(400).json({
          message: getZodErrorMessage(parsedQuery.error),
        });
      }

      const { year } = parsedQuery.data;

      const closures = await prisma.monthlyClosure.findMany({
        where: {
          userId,
          ...(year ? { year } : {}),
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: parsedQuery.data.limit,
        skip: parsedQuery.data.offset,
      });

      return res
        .status(200)
        .json(closures.map((closure) => serializeMonthlyClosure(closure)));
    } catch (error) {
      logError('monthly_closure_list_failed', error, {
        requestId: req.requestId,
        userId: req.userId,
      });
      return res.status(500).json({
        message: 'Erro ao listar fechamentos mensais.',
      });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const userId = req.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const existingClosure = await prisma.monthlyClosure.findFirst({
        where: {
          id: Number(id),
          userId,
        },
      });

      if (!existingClosure) {
        return res.status(404).json({
          message: 'Fechamento mensal não encontrado.',
        });
      }

      await prisma.monthlyClosure.delete({
        where: {
          id: Number(id),
        },
      });

      return res.status(200).json({
        message: 'Mês reaberto com sucesso.',
      });
    } catch (error) {
      logError('monthly_closure_delete_failed', error, {
        requestId: req.requestId,
        userId: req.userId,
      });
      return res.status(500).json({
        message: 'Erro ao reabrir o mês.',
      });
    }
  }
}

export default new MonthlyClosureController();
