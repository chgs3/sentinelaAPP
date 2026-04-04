import { Request, Response } from 'express';
import prisma from '../config/prisma';
import aiParseTransactionMessageService from '../services/aiParseTransactionMessageService';
import parseTransactionMessageService from '../services/parseTransactionMessageService';
import { parseMessageSchema } from '../schemas/messageSchemas';
import { getZodErrorMessage } from '../utils/zodError';
import { resolveRelativeDate } from '../utils/resolveRelativeDate';
import { decideParseOutcome } from '../utils/decideParseOutcome';

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function looksLikeInternalTransfer(message: string) {
  const normalized = normalizeText(message);

  const transferKeywords = [
    'transferi',
    'transferencia',
    'transferência',
    'passei',
    'mandei',
    'enviei',
    'minha outra conta',
    'entre contas',
    'pro inter',
    'pro nubank',
    'para o inter',
    'para o nubank',
    'da minha conta',
    'pra minha conta',
  ];

  return transferKeywords.some((keyword) =>
    normalized.includes(normalizeText(keyword))
  );
}

function extractAmountFromMessage(message: string) {
  const normalized = message.replace(',', '.');
  const match = normalized.match(/(\d+(\.\d+)?)/);

  if (!match) return null;

  const amount = Number(match[1]);
  if (Number.isNaN(amount) || amount <= 0) return null;

  return amount;
}

function inferPaymentMethod(message: string): 'credit' | 'debit' | 'pix' | 'cash' | null {
  const normalized = normalizeText(message);

  if (normalized.includes('pix')) return 'pix';
  if (normalized.includes('credito') || normalized.includes('crédito')) return 'credit';
  if (normalized.includes('debito') || normalized.includes('débito')) return 'debit';
  if (normalized.includes('dinheiro') || normalized.includes('especie') || normalized.includes('espécie')) {
    return 'cash';
  }

  return null;
}

function inferTypeFromMessage(message: string): 'income' | 'expense' | null {
  const normalized = normalizeText(message);

  const incomeSignals = ['recebi', 'ganhei', 'entrou', 'entrada', 'caiu'];
  const expenseSignals = ['gastei', 'paguei', 'comprei', 'gasto', 'pago'];

  if (incomeSignals.some((signal) => normalized.includes(signal))) return 'income';
  if (expenseSignals.some((signal) => normalized.includes(signal))) return 'expense';

  return null;
}

function inferDescriptionAndCategory(message: string, type: 'income' | 'expense') {
  const normalized = normalizeText(message);

  if (type === 'income') {
    if (normalized.includes('pix')) {
      return {
        description: 'Recebimento via Pix',
        category: 'Trabalho',
      };
    }

    return {
      description: 'Recebimento',
      category: 'Trabalho',
    };
  }

  if (normalized.includes('uber') || normalized.includes('99')) {
    return {
      description: 'Transporte por app',
      category: 'Transporte',
    };
  }

  if (normalized.includes('mercado') || normalized.includes('supermercado')) {
    return {
      description: 'Compra de mercado',
      category: 'Alimentação',
    };
  }

  if (normalized.includes('ifood') || normalized.includes('pizza') || normalized.includes('lanche') || normalized.includes('almoco') || normalized.includes('almoço')) {
    return {
      description: 'Alimentação',
      category: 'Alimentação',
    };
  }

  if (normalized.includes('pix')) {
    return {
      description: 'Pagamento via Pix',
      category: 'Outros',
    };
  }

  return {
    description: 'Despesa',
    category: 'Outros',
  };
}

function buildStructuredFallback(message: string) {
  const amount = extractAmountFromMessage(message);
  const type = inferTypeFromMessage(message);
  const paymentMethod = inferPaymentMethod(message);
  const isTransfer = looksLikeInternalTransfer(message);

  if (isTransfer && amount) {
    return {
      type: 'expense' as const,
      amount,
      description: 'Transferência entre contas',
      category: 'Outros',
      transactionAt: new Date().toISOString(),
      rawDateExpression: null,
      paymentMethod,
      accountOrCard: null,
      confidence: 0.8,
      possibleTransfer: true,
    };
  }

  if (amount && type) {
    const inferred = inferDescriptionAndCategory(message, type);

    return {
      type,
      amount,
      description: inferred.description,
      category: inferred.category,
      transactionAt: new Date().toISOString(),
      rawDateExpression: null,
      paymentMethod,
      accountOrCard: null,
      confidence:
        inferred.category === 'Outros' ? 0.72 : 0.9,
      possibleTransfer: false,
    };
  }

  return null;
}

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
        const structuredFallback = buildStructuredFallback(message);

        if (structuredFallback) {
          parsed = structuredFallback;
        } else {
          const fallback = parseTransactionMessageService.execute(message);

          if (fallback) {
            parsed = {
              ...fallback,
              transactionAt: fallback.transactionAt.toISOString(),
              rawDateExpression: null,
              confidence: 0.5,
              possibleTransfer: looksLikeInternalTransfer(message),
              paymentMethod:
                fallback.paymentMethod === 'Pix'
                  ? 'pix'
                  : fallback.paymentMethod === 'Credito'
                  ? 'credit'
                  : fallback.paymentMethod === 'Debito'
                  ? 'debit'
                  : fallback.paymentMethod === 'Dinheiro'
                  ? 'cash'
                  : inferPaymentMethod(message),
            };
          } else if (looksLikeInternalTransfer(message)) {
            const fallbackAmount = extractAmountFromMessage(message) ?? 1;

            parsed = {
              type: 'expense',
              amount: fallbackAmount,
              description: 'Transferência entre contas',
              category: 'Outros',
              transactionAt: new Date().toISOString(),
              rawDateExpression: null,
              paymentMethod: inferPaymentMethod(message),
              accountOrCard: null,
              confidence: 0.8,
              possibleTransfer: true,
            };
          } else {
            console.log('Retornando unable_to_parse por falta de parse/fallback');
            return res.status(200).json({
              status: 'unable_to_parse',
              message: 'Não foi possível interpretar a mensagem enviada.',
              ambiguities: [],
            });
          }
        }
      }

      console.log('Parsed antes da decisão:', parsed);

      const resolvedDate = resolveRelativeDate(
        parsed.rawDateExpression,
        parsed.transactionAt
      );

      if (Number.isNaN(resolvedDate.getTime())) {
        console.log('Retornando unable_to_parse por data inválida');
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

      if (decision.status === 'ignored_transfer') {
        console.log('Retornando ignored_transfer');
        return res.status(200).json({
          status: 'ignored_transfer',
          message: decision.reason,
          ambiguities: decision.ambiguities,
          parsed: parsedWithResolvedDate,
        });
      }

      if (decision.status === 'unable_to_parse') {
        console.log('Retornando unable_to_parse');
        return res.status(200).json({
          status: 'unable_to_parse',
          message: decision.reason,
          ambiguities: decision.ambiguities,
          parsed: parsedWithResolvedDate,
        });
      }

      if (decision.status === 'needs_confirmation') {
        console.log('Retornando needs_confirmation');
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

      console.log('Retornando created');
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