import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { getZodErrorMessage } from '../utils/zodError';
import { periodQuerySchema } from '../schemas/periodSchemas';

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

      const totalIncomes = transactions
        .filter((transaction) => transaction.type === 'income')
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      const totalExpenses = transactions
        .filter((transaction) => transaction.type === 'expense')
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      const balance = totalIncomes - totalExpenses;

      return res.status(200).json({
        totalIncomes,
        totalExpenses,
        balance,
        totalTransactions: transactions.length,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Erro ao gerar resumo do período.',
      });
    }
  }
}

export default new SummaryController();