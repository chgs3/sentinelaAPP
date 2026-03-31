import { Request, Response } from 'express';
import prisma from '../config/prisma';

class SummaryController {
  async monthly(req: Request, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const transactions = await prisma.transaction.findMany({
        where: {
          userId,
          transactionAt: {
            gte: startOfMonth,
            lt: startOfNextMonth,
          },
        },
      });

      const expenses = transactions.filter(
        (transaction) => transaction.type === 'expense'
      );
      const incomes = transactions.filter(
        (transaction) => transaction.type === 'income'
      );

      const totalExpenses = expenses.reduce(
        (sum, transaction) => sum + transaction.amount,
        0
      );

      const totalIncomes = incomes.reduce(
        (sum, transaction) => sum + transaction.amount,
        0
      );

      return res.status(200).json({
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        totalTransactions: transactions.length,
        totalExpenses,
        totalIncomes,
        balance: totalIncomes - totalExpenses,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Erro ao gerar resumo mensal.',
      });
    }
  }
}

export default new SummaryController();