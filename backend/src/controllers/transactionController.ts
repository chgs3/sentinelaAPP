import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { getZodErrorMessage } from '../utils/zodError';
import { periodQuerySchema } from '../schemas/periodSchemas';
import {
  createTransactionSchema,
  updateTransactionSchema,
} from '../schemas/transactionSchemas';
import { serializeTransaction } from '../utils/serializeFinancial';
import { paginationQuerySchema } from '../schemas/commonSchemas';
import { logError } from '../utils/logger';

class TransactionController {
  async create(req: Request, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ message: 'Usuário não autenticado.' });
      }

      const parsedBody = createTransactionSchema.safeParse(req.body);

      if (!parsedBody.success) {
        return res.status(400).json({
          message: getZodErrorMessage(parsedBody.error),
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
      } = parsedBody.data;

      const parsedDate = new Date(transactionAt);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: 'Data inválida.' });
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

      return res.status(201).json(serializeTransaction(transaction));
    } catch (error) {
      logError('transaction_create_failed', error, {
        requestId: req.requestId,
        userId: req.userId,
      });
      return res.status(500).json({
        message: 'Erro ao criar transação.',
      });
    }
  }

  async list(req: Request, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ message: 'Usuário não autenticado.' });
      }

      const hasPeriodFilter =
        req.query.startDate !== undefined || req.query.endDate !== undefined;

      let whereClause: any = {
        userId,
      };

      const parsedPagination = paginationQuerySchema.safeParse(req.query);

      if (!parsedPagination.success) {
        return res.status(400).json({
          message: getZodErrorMessage(parsedPagination.error),
        });
      }

      if (hasPeriodFilter) {
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

        whereClause.transactionAt = {
          gte: start,
          lte: end,
        };
      }

      const transactions = await prisma.transaction.findMany({
        where: whereClause,
        orderBy: {
          transactionAt: 'desc',
        },
        take: parsedPagination.data.limit,
        skip: parsedPagination.data.offset,
      });

      return res
        .status(200)
        .json(transactions.map((transaction) => serializeTransaction(transaction)));
    } catch (error) {
      logError('transaction_list_failed', error, {
        requestId: req.requestId,
        userId: req.userId,
      });
      return res.status(500).json({
        message: 'Erro ao listar transações.',
      });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const userId = req.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ message: 'Usuário não autenticado.' });
      }

      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          id: Number(id),
          userId,
        },
      });

      if (!existingTransaction) {
        return res.status(404).json({
          message: 'Transação não encontrada.',
        });
      }

      const parsedBody = updateTransactionSchema.safeParse(req.body);

      if (!parsedBody.success) {
        return res.status(400).json({
          message: getZodErrorMessage(parsedBody.error),
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
      } = parsedBody.data;

      const parsedDate = new Date(transactionAt);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: 'Data inválida.' });
      }

      const transaction = await prisma.transaction.update({
        where: {
          id: Number(id),
        },
        data: {
          type,
          amount,
          description,
          category,
          transactionAt: parsedDate,
          paymentMethod: paymentMethod ?? null,
          accountOrCard: accountOrCard ?? null,
        },
      });

      return res.status(200).json(serializeTransaction(transaction));
    } catch (error) {
      logError('transaction_update_failed', error, {
        requestId: req.requestId,
        userId: req.userId,
      });
      return res.status(500).json({
        message: 'Erro ao atualizar transação.',
      });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const userId = req.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ message: 'Usuário não autenticado.' });
      }

      const existingTransaction = await prisma.transaction.findFirst({
        where: {
          id: Number(id),
          userId,
        },
      });

      if (!existingTransaction) {
        return res.status(404).json({
          message: 'Transação não encontrada.',
        });
      }

      await prisma.transaction.delete({
        where: {
          id: Number(id),
        },
      });

      return res.status(200).json({
        message: 'Transação removida com sucesso.',
      });
    } catch (error) {
      logError('transaction_delete_failed', error, {
        requestId: req.requestId,
        userId: req.userId,
      });
      return res.status(500).json({
        message: 'Erro ao remover transação.',
      });
    }
  }
}

export default new TransactionController();
