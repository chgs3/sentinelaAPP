import { Request, Response } from 'express';
import prisma from '../config/prisma';
import aiParseTransactionMessageService from '../services/aiParseTransactionMessageService';
import parseTransactionMessageService from '../services/parseTransactionMessageService';
import { parseMessageSchema } from '../schemas/messageSchemas';
import { getZodErrorMessage } from '../utils/zodError';
import { resolveRelativeDate } from '../utils/resolveRelativeDate';
import { decideParseOutcome } from '../utils/decideParseOutcome';

class MessageController {
  async parseAndCreate(req: Request, res: Response) {
    try {
      console.log('Entrou em /messages/parse');
      console.log('Body recebido:', req.body);

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
          return res.status(200).json({
            status: 'unable_to_parse',
            message: 'Não foi possível interpretar a mensagem enviada.',
            ambiguities: [],
          });
        }

        parsed = {
          ...fallback,
          transactionAt: fallback.transactionAt.toISOString(),
          rawDateExpression: null,
          confidence: 0.4,
          possibleTransfer: false,
        };
      }

      console.log('Parsed antes da decisão:', parsed);

      const resolvedDate = resolveRelativeDate(
        parsed.rawDateExpression,
        parsed.transactionAt
      );

      if (Number.isNaN(resolvedDate.getTime())) {
        return res.status(200).json({
          status: 'unable_to_parse',
          message: 'Não foi possível resolver a data da transação.',
          ambiguities: ['Data inválida após resolução.'],
        });
      }

      const parsedWithResolvedDate = {
        ...parsed,
        transactionAt: resolvedDate.toISOString(),
      };

      console.log('Parsed com data resolvida:', parsedWithResolvedDate);

      const decision = decideParseOutcome(message, parsedWithResolvedDate);

      console.log('Decision final:', decision);

      if (decision.status === 'unable_to_parse') {
        return res.status(200).json({
          status: 'unable_to_parse',
          message: decision.reason,
          ambiguities: decision.ambiguities,
          parsed: parsedWithResolvedDate,
        });
      }

      if (decision.status === 'needs_confirmation') {
        return res.status(200).json({
          status: 'needs_confirmation',
          message: decision.reason,
          ambiguities: decision.ambiguities,
          parsed: parsedWithResolvedDate,
        });
      }

      const transaction = await prisma.transaction.create({
        data: {
          type: parsedWithResolvedDate.type,
          amount: parsedWithResolvedDate.amount,
          description: parsedWithResolvedDate.description,
          category: parsedWithResolvedDate.category,
          transactionAt: resolvedDate,
          paymentMethod: parsedWithResolvedDate.paymentMethod,
          accountOrCard: parsedWithResolvedDate.accountOrCard,
          userId,
        },
      });

      return res.status(201).json({
        status: 'created',
        message: 'Transação criada com sucesso.',
        ambiguities: decision.ambiguities,
        parsed: parsedWithResolvedDate,
        transaction,
      });
    } catch (error) {
      console.error('Erro em parseAndCreate:', error);
      return res.status(500).json({
        message: 'Erro ao interpretar e criar transação.',
      });
    }
  }

  async confirmParsedTransaction(req: Request, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const { parsed } = req.body;

      if (!parsed) {
        return res.status(400).json({
          message: 'Dados parseados são obrigatórios para confirmação.',
        });
      }

      const resolvedDate = new Date(parsed.transactionAt);

      if (Number.isNaN(resolvedDate.getTime())) {
        return res.status(400).json({
          message: 'Data inválida para confirmação.',
        });
      }

      const transaction = await prisma.transaction.create({
        data: {
          type: parsed.type,
          amount: parsed.amount,
          description: parsed.description,
          category: parsed.category,
          transactionAt: resolvedDate,
          paymentMethod: parsed.paymentMethod ?? null,
          accountOrCard: parsed.accountOrCard ?? null,
          userId,
        },
      });

      return res.status(201).json({
        status: 'created',
        message: 'Transação confirmada e criada com sucesso.',
        transaction,
      });
    } catch (error) {
      console.error('Erro em confirmParsedTransaction:', error);
      return res.status(500).json({
        message: 'Erro ao confirmar a transação.',
      });
    }
  }
}

export default new MessageController();