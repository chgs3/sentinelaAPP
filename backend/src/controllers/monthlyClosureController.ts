import { Request, Response } from 'express';
import prisma from '../config/prisma';
import {
  createMonthlyClosureSchema,
  listMonthlyClosuresQuerySchema,
} from '../schemas/monthlyClosureSchemas';
import { getZodErrorMessage } from '../utils/zodError';

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

      const totalIncomes = transactions
        .filter((transaction) => transaction.type === 'income')
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      const totalExpenses = transactions
        .filter((transaction) => transaction.type === 'expense')
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      const balance = totalIncomes - totalExpenses;
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
        closure,
      });
    } catch (error) {
      console.error(error);
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
      });

      return res.status(200).json(closures);
    } catch (error) {
      console.error(error);
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
      console.error(error);
      return res.status(500).json({
        message: 'Erro ao reabrir o mês.',
      });
    }
  }
}

export default new MonthlyClosureController();