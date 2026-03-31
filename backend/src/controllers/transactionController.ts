import { Request, Response } from 'express';
import prisma from '../config/prisma';

class TransactionController {
  async create(req: Request, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const {
        type,
        amount,
        description,
        category,
        transactionAt,
        paymentMethod,
        accountOrCard,
      } = req.body;

      if (!type || amount === undefined || !description || !category || !transactionAt) {
        return res.status(400).json({
          message: 'Campos obrigatórios ausentes para criar transação manualmente.',
        });
      }

      const parsedDate = new Date(transactionAt);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          message: 'transactionAt inválido.',
        });
      }

      const transaction = await prisma.transaction.create({
        data: {
          type,
          amount,
          description,
          category,
          transactionAt: parsedDate,
          paymentMethod: paymentMethod ?? null,
          accountOrCard: accountOrCard ?? null,
          userId,
        },
      });

      return res.status(201).json(transaction);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao criar transação' });
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

      const transactions = await prisma.transaction.findMany({
        where: {
          userId,
        },
        orderBy: {
          transactionAt: 'desc',
        },
      });

      return res.status(200).json(transactions);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao listar transações' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const { id } = req.params;
      const transactionId = Number(id);

      if (Number.isNaN(transactionId)) {
        return res.status(400).json({
          message: 'ID inválido.',
        });
      }

      const {
        type,
        amount,
        description,
        category,
        transactionAt,
        paymentMethod,
        accountOrCard,
      } = req.body;

      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          id: transactionId,
          userId,
        },
      });

      if (!existingTransaction) {
        return res.status(404).json({
          message: 'Transação não encontrada.',
        });
      }

      let parsedDate = existingTransaction.transactionAt;

      if (transactionAt !== undefined) {
        const newDate = new Date(transactionAt);

        if (Number.isNaN(newDate.getTime())) {
          return res.status(400).json({
            message: 'transactionAt inválido.',
          });
        }

        parsedDate = newDate;
      }

      const updatedTransaction = await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          type: type ?? existingTransaction.type,
          amount: amount ?? existingTransaction.amount,
          description: description ?? existingTransaction.description,
          category: category ?? existingTransaction.category,
          transactionAt: parsedDate,
          paymentMethod: paymentMethod ?? existingTransaction.paymentMethod,
          accountOrCard: accountOrCard ?? existingTransaction.accountOrCard,
        },
      });

      return res.status(200).json(updatedTransaction);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao atualizar transação' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const { id } = req.params;
      const transactionId = Number(id);

      if (Number.isNaN(transactionId)) {
        return res.status(400).json({
          message: 'ID inválido.',
        });
      }

      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          id: transactionId,
          userId,
        },
      });

      if (!existingTransaction) {
        return res.status(404).json({
          message: 'Transação não encontrada.',
        });
      }

      await prisma.transaction.delete({
        where: { id: transactionId },
      });

      return res.status(200).json({
        message: 'Transação removida com sucesso.',
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao remover transação' });
    }
  }
}

export default new TransactionController();