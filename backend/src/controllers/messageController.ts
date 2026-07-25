import { Request, Response } from 'express';
import prisma from '../config/prisma';
import aiParseTransactionMessageService from '../services/aiParseTransactionMessageService';
import parseTransactionMessageService from '../services/parseTransactionMessageService';
import { parseMessageSchema } from '../schemas/messageSchemas';
import { getZodErrorMessage } from '../utils/zodError';
import { resolveRelativeDate } from '../utils/resolveRelativeDate';
import { decideParseOutcome } from '../utils/decideParseOutcome';
import { createTransactionSchema } from '../schemas/transactionSchemas';

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function inferPossibleTransferFromMessage(message: string): boolean {
  const normalized = normalizeText(message);

  const strongTransferSignals = [
    'transferi',
    'transferencia',
    'transferência',
    'enviei',
    'mandei',
    'passei',
    'joguei',
    'entre contas',
    'minha outra conta',
    'para minha conta',
    'pra minha conta',
    'da minha conta',
    'de uma conta para outra',
  ];

  if (strongTransferSignals.some((signal) => normalized.includes(signal))) {
    return true;
  }

  const knownFinancialTargets = [
    'nubank',
    'inter',
    'picpay',
    'caixa',
    'itau',
    'itaú',
    'bradesco',
    'santander',
    'banco do brasil',
    'mercado pago',
    'next',
    'c6',
    'neon',
    'wise',
    'paypal',
  ];

  const hasDirection =
    normalized.includes(' pro ') ||
    normalized.includes(' pra ') ||
    normalized.includes(' para ');

  const mentionsKnownTarget = knownFinancialTargets.some((target) =>
    normalized.includes(target)
  );

  const hasExplicitTransferVerb =
    normalized.includes('transferi') ||
    normalized.includes('enviei') ||
    normalized.includes('mandei') ||
    normalized.includes('passei');

  return hasExplicitTransferVerb && hasDirection && mentionsKnownTarget;
}

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
        parsed = parseTransactionMessageService.execute(message);
      }

      if (!parsed) {
        return res.status(200).json({
          status: 'unable_to_parse',
          message: 'Não foi possível interpretar a mensagem enviada.',
          ambiguities: [],
        });
      }

      const inferredPossibleTransfer = inferPossibleTransferFromMessage(message);

      const parsedNormalized = {
        ...parsed,
        possibleTransfer: parsed.possibleTransfer || inferredPossibleTransfer,
      };

      const resolvedDate = resolveRelativeDate(
        parsedNormalized.rawDateExpression,
        parsedNormalized.transactionAt
      );

      if (Number.isNaN(resolvedDate.getTime())) {
        return res.status(200).json({
          status: 'unable_to_parse',
          message: 'Não foi possível resolver a data da transação.',
          ambiguities: ['Data inválida após resolução.'],
        });
      }

      const parsedWithResolvedDate = {
        ...parsedNormalized,
        transactionAt: resolvedDate.toISOString(),
      };

      const decision = decideParseOutcome(message, parsedWithResolvedDate);

      if (decision.status === 'ignored_transfer') {
        return res.status(200).json({
          status: 'ignored_transfer',
          message: decision.reason,
          ambiguities: decision.ambiguities,
          parsed: parsedWithResolvedDate,
        });
      }

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

      const parsedBody = createTransactionSchema.safeParse(req.body?.parsed);

      if (!parsedBody.success) {
        return res.status(400).json({
          message: getZodErrorMessage(parsedBody.error),
        });
      }

      const parsed = parsedBody.data;
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
