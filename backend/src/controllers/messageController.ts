import { Request, Response } from 'express';
import prisma from '../config/prisma';
import parseTransactionMessageService from '../services/parseTransactionMessageService';
import { parseMessageSchema } from '../schemas/messageSchemas';
import { getZodErrorMessage } from '../utils/zodError';

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

      const parsed = parseTransactionMessageService.execute(message);

      if (!parsed) {
        return res.status(400).json({
          message: 'Não foi possível interpretar a mensagem enviada.',
        });
      }

      const transaction = await prisma.transaction.create({
        data: {
          ...parsed,
          userId,
        },
      });

      return res.status(201).json({
        message: 'Transação criada com sucesso.',
        parsed,
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