import { Request, Response } from 'express';
import prisma from '../config/prisma';

class TransactionController {
  async create(req: Request, res: Response) {
    try {
      const {
        type,
        amount,
        description,
        category,
        transactionAt,
        paymentMethod,
      } = req.body;

      if (!type || !amount || !description || !category || !transactionAt) {
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
        },
      });

      return res.status(201).json(transaction);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Erro ao criar transação' });
    }
  }

  async list(_req: Request, res: Response) {
    try {
      const transactions = await prisma.transaction.findMany({
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
      const { id } = req.params;
      const {
        type,
        amount,
        description,
        category,
        transactionAt,
        paymentMethod,
      } = req.body;

      const transaction = await prisma.transaction.findUnique({
        where: { id: Number(id) },
      });

      if (!transaction) {
        return res.status(404).json({
          message: 'Transação não encontrada.',
        });
      }

      const updatedTransaction = await prisma.transaction.update({
        where: { id: Number(id) },
        data: {
          type: type ?? transaction.type,
          amount: amount ?? transaction.amount,
          description: description ?? transaction.description,
          category: category ?? transaction.category,
          transactionAt: transactionAt ? new Date(transactionAt) : transaction.transactionAt,
          paymentMethod: paymentMethod ?? transaction.paymentMethod,
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
      const { id } = req.params;

      const transaction = await prisma.transaction.findUnique({
        where: { id: Number(id) },
      });

      if (!transaction) {
        return res.status(404).json({
          message: 'Transação não encontrada.',
        });
      }

      await prisma.transaction.delete({
        where: { id: Number(id) },
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