import { Request, Response } from 'express';
import prisma from '../config/prisma';
import aiParseTransactionMessageService from '../services/aiParseTransactionMessageService';
import parseTransactionMessageService from '../services/parseTransactionMessageService';
import { parseMessageSchema } from '../schemas/messageSchemas';
import { getZodErrorMessage } from '../utils/zodError';
import { resolveRelativeDate } from '../utils/resolveRelativeDate';

class MessageController {
  async parseAndCreate(req: Request, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const parsedBody = parseMessageSchema.safeParse(req.body);

      if (!parsedBody.success) {
        return res.status(400).json({
          message: getZodErrorMessage(parsedBody.error),
        });
      }

      const { message } = parsedBody.data;

      let parsed = await aiParseTransactionMessageService.execute(message);

      if (!parsed) {
        const fallback = parseTransactionMessageService.execute(message);

        if (!fallback) {
          return res.status(400).json({
            message: 'Não foi possível interpretar a mensagem enviada.',
          });
        }

        parsed = {
          ...fallback,
          transactionAt: fallback.transactionAt.toISOString(),
          rawDateExpression: null,
          confidence: 0.4,
        };
      }

      const resolvedDate = resolveRelativeDate(
        parsed.rawDateExpression,
        parsed.transactionAt
      );

      if (Number.isNaN(resolvedDate.getTime())) {
        return res.status(400).json({
          message: 'Não foi possível resolver a data da transação.',
        });
      }

      const transaction = await prisma.transaction.create({
        data: {
          type: parsed.type,
          amount: parsed.amount,
          description: parsed.description,
          category: parsed.category,
          transactionAt: resolvedDate,
          paymentMethod: parsed.paymentMethod,
          accountOrCard: parsed.accountOrCard,
          userId,
        },
      });

      console.log('Mensagem original:', message);
      console.log('Parsed final:', {
        ...parsed,
        transactionAt: resolvedDate.toISOString(),
      });

      return res.status(201).json({
        message: 'Transação criada com sucesso.',
        parsed: {
          ...parsed,
          transactionAt: resolvedDate.toISOString(),
        },
        transaction,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: 'Erro ao interpretar e criar transação.',
      });
    }
  }
}

export default new MessageController();