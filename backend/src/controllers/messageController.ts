import { Request, Response } from 'express';
import prisma from '../config/prisma';
import parseTransactionMessageService from '../services/parseTransactionMessageService';

class MessageController {
  async parseAndCreate(req: Request, res: Response) {
    try {
      const { message } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          message: 'A mensagem é obrigatória e deve ser um texto.',
        });
      }

      const parsed = parseTransactionMessageService.execute(message);

      if (!parsed) {
        return res.status(400).json({
          message: 'Não foi possível interpretar a mensagem enviada.',
        });
      }

      const transaction = await prisma.transaction.create({
        data: parsed,
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