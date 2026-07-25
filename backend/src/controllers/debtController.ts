import { Request, Response } from 'express';
import prisma from '../config/prisma';
import {
  createDebtSchema,
  updateDebtSchema,
  updateDebtStatusSchema,
} from '../schemas/debtSchemas';
import { parseDebtMessageSchema } from '../schemas/debtMessageSchemas';
import { settleDebtMessageSchema } from '../schemas/debtSettleMessageSchemas';
import { getZodErrorMessage } from '../utils/zodError';
import parseDebtMessageService from '../services/parseDebtMessageService';
import settleDebtMessageService from '../services/settleDebtMessageService';
import { serializeDebt } from '../utils/serializeFinancial';
import { paginationQuerySchema } from '../schemas/commonSchemas';
import { logError } from '../utils/logger';

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function isSameOrContainedPersonName(a: string, b: string) {
  const na = normalizeText(a);
  const nb = normalizeText(b);

  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;

  const tokensA = na.split(' ').filter(Boolean);
  const tokensB = nb.split(' ').filter(Boolean);

  const commonTokens = tokensA.filter((tokenA) => tokensB.includes(tokenA));
  return commonTokens.length > 0;
}

function countNameTokens(name: string) {
  return normalizeText(name).split(' ').filter(Boolean).length;
}

function buildNeedsConfirmationResponse(message: string, ambiguities: string[]) {
  return {
    status: 'needs_confirmation',
    message,
    ambiguities,
  };
}

function isAmbiguousShortName(personName: string) {
  return countNameTokens(personName) === 1 && personName.length <= 2;
}

async function findMatchingPendingDebts(
  userId: number,
  personName: string,
  targetStatus: 'received' | 'paid'
) {
  const pendingDebts = await prisma.debt.findMany({
    where: {
      userId,
      status: 'pending',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return pendingDebts.filter((debt) => {
    const samePerson = isSameOrContainedPersonName(debt.personName, personName);

    if (!samePerson) return false;

    if (targetStatus === 'received') {
      return debt.type === 'to_receive';
    }

    return debt.type === 'to_pay';
  });
}

async function settleSingleDebt(
  debtId: number,
  targetStatus: 'received' | 'paid'
) {
  return prisma.debt.update({
    where: { id: debtId },
    data: { status: targetStatus },
  });
}

class DebtController {
  async create(req: Request, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const parsedBody = createDebtSchema.safeParse(req.body);

      if (!parsedBody.success) {
        return res.status(400).json({
          message: getZodErrorMessage(parsedBody.error),
        });
      }

      const { personName, type, amount, description, status, dueDate } =
        parsedBody.data;

      const debt = await prisma.debt.create({
        data: {
          personName,
          type,
          amount,
          description,
          status: status ?? 'pending',
          dueDate: dueDate ? new Date(dueDate) : null,
          userId,
        },
      });

      return res.status(201).json(serializeDebt(debt));
    } catch (error) {
      logError('debt_create_failed', error, {
        requestId: req.requestId,
        userId: req.userId,
      });
      return res.status(500).json({
        message: 'Erro ao criar dívida.',
      });
    }
  }

  async createFromMessage(req: Request, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const parsedBody = parseDebtMessageSchema.safeParse(req.body);

      if (!parsedBody.success) {
        return res.status(400).json({
          message: getZodErrorMessage(parsedBody.error),
        });
      }

      const { message } = parsedBody.data;
      const parsed = parseDebtMessageService.execute(message);

      if (!parsed) {
        return res.status(200).json({
          status: 'unable_to_parse',
          message: 'Não foi possível interpretar a dívida pela mensagem.',
        });
      }

      if (isAmbiguousShortName(parsed.personName)) {
        return res.status(200).json(
          buildNeedsConfirmationResponse(
            'A mensagem parece incompleta para registrar a dívida.',
            ['Nome da pessoa muito curto ou ambíguo.']
          )
        );
      }

      const debt = await prisma.debt.create({
        data: {
          personName: parsed.personName,
          type: parsed.type,
          amount: parsed.amount,
          description: parsed.description,
          status: 'pending',
          dueDate: null,
          userId,
        },
      });

      return res.status(201).json({
        status: 'created',
        message: 'Dívida registrada com sucesso.',
        debt: serializeDebt(debt),
      });
    } catch (error) {
      logError('debt_parse_create_failed', error, {
        requestId: req.requestId,
        userId: req.userId,
      });
      return res.status(500).json({
        message: 'Erro ao registrar dívida por mensagem.',
      });
    }
  }

  async settleFromMessage(req: Request, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const parsedBody = settleDebtMessageSchema.safeParse(req.body);

      if (!parsedBody.success) {
        return res.status(400).json({
          message: getZodErrorMessage(parsedBody.error),
        });
      }

      const { message } = parsedBody.data;
      const parsed = settleDebtMessageService.execute(message);

      if (!parsed) {
        return res.status(200).json({
          status: 'unable_to_parse',
          message:
            'Não foi possível interpretar a baixa da dívida pela mensagem.',
        });
      }

      if (isAmbiguousShortName(parsed.personName)) {
        return res.status(200).json(
          buildNeedsConfirmationResponse(
            'A mensagem parece incompleta para dar baixa na dívida.',
            ['Nome da pessoa muito curto ou ambíguo.']
          )
        );
      }

      const matchingDebts = await findMatchingPendingDebts(
        userId,
        parsed.personName,
        parsed.targetStatus
      );

      if (matchingDebts.length === 0) {
        return res.status(404).json({
          status: 'not_found',
          message:
            'Nenhuma dívida pendente compatível foi encontrada para essa pessoa.',
        });
      }

      if (matchingDebts.length > 1) {
        return res.status(200).json(
          buildNeedsConfirmationResponse(
            'Encontrei mais de uma dívida pendente para essa pessoa.',
            [
              'Há múltiplas dívidas pendentes compatíveis.',
              'Edite ou quite manualmente a dívida desejada.',
            ]
          )
        );
      }

      const updatedDebt = await settleSingleDebt(
        matchingDebts[0].id,
        parsed.targetStatus
      );

      return res.status(200).json({
        status: 'settled',
        message:
          parsed.targetStatus === 'received'
            ? 'Dívida marcada como recebida.'
            : 'Dívida marcada como paga.',
        debt: serializeDebt(updatedDebt),
      });
    } catch (error) {
      logError('debt_settle_failed', error, {
        requestId: req.requestId,
        userId: req.userId,
      });
      return res.status(500).json({
        message: 'Erro ao dar baixa na dívida por mensagem.',
      });
    }
  }

  async handleMessage(req: Request, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const parsedBody = parseDebtMessageSchema.safeParse(req.body);

      if (!parsedBody.success) {
        return res.status(400).json({
          message: getZodErrorMessage(parsedBody.error),
        });
      }

      const { message } = parsedBody.data;

      const settleParsed = settleDebtMessageService.execute(message);

      if (settleParsed) {
        if (isAmbiguousShortName(settleParsed.personName)) {
          return res.status(200).json(
            buildNeedsConfirmationResponse(
              'A mensagem parece incompleta para dar baixa na dívida.',
              ['Nome da pessoa muito curto ou ambíguo.']
            )
          );
        }

        const matchingDebts = await findMatchingPendingDebts(
          userId,
          settleParsed.personName,
          settleParsed.targetStatus
        );

        if (matchingDebts.length === 0) {
          return res.status(404).json({
            status: 'not_found',
            message:
              'Nenhuma dívida pendente compatível foi encontrada para essa pessoa.',
          });
        }

        if (matchingDebts.length > 1) {
          return res.status(200).json(
            buildNeedsConfirmationResponse(
              'Encontrei mais de uma dívida pendente para essa pessoa.',
              [
                'Há múltiplas dívidas pendentes compatíveis.',
                'Edite ou quite manualmente a dívida desejada.',
              ]
            )
          );
        }

        const updatedDebt = await settleSingleDebt(
          matchingDebts[0].id,
          settleParsed.targetStatus
        );

        return res.status(200).json({
          status: 'settled',
          message:
            settleParsed.targetStatus === 'received'
              ? 'Dívida marcada como recebida.'
              : 'Dívida marcada como paga.',
          debt: serializeDebt(updatedDebt),
        });
      }

      const createParsed = parseDebtMessageService.execute(message);

      if (createParsed) {
        const ambiguities: string[] = [];

        if (isAmbiguousShortName(createParsed.personName)) {
          ambiguities.push('Nome da pessoa muito curto ou ambíguo.');
        }

        if (
          createParsed.description === 'Dívida registrada' &&
          normalizeText(message).includes('devo')
        ) {
          ambiguities.push('Descrição não foi identificada claramente.');
        }

        if (ambiguities.length > 0) {
          return res.status(200).json(
            buildNeedsConfirmationResponse(
              'Consigo interpretar parte da mensagem, mas preciso de mais clareza.',
              ambiguities
            )
          );
        }

        const debt = await prisma.debt.create({
          data: {
            personName: createParsed.personName,
            type: createParsed.type,
            amount: createParsed.amount,
            description: createParsed.description,
            status: 'pending',
            dueDate: null,
            userId,
          },
        });

        return res.status(201).json({
          status: 'created',
          message: 'Dívida registrada com sucesso.',
          debt: serializeDebt(debt),
        });
      }

      return res.status(200).json({
        status: 'unable_to_parse',
        message: 'Não foi possível interpretar a mensagem.',
      });
    } catch (error) {
      logError('debt_message_failed', error, {
        requestId: req.requestId,
        userId: req.userId,
      });
      return res.status(500).json({
        message: 'Erro ao processar a mensagem da dívida.',
      });
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

      const parsedQuery = paginationQuerySchema.safeParse(req.query);

      if (!parsedQuery.success) {
        return res.status(400).json({
          message: getZodErrorMessage(parsedQuery.error),
        });
      }

      const debts = await prisma.debt.findMany({
        where: {
          userId,
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        take: parsedQuery.data.limit,
        skip: parsedQuery.data.offset,
      });

      return res
        .status(200)
        .json(debts.map((debt) => serializeDebt(debt)));
    } catch (error) {
      logError('debt_list_failed', error, {
        requestId: req.requestId,
        userId: req.userId,
      });
      return res.status(500).json({
        message: 'Erro ao listar dívidas.',
      });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const userId = req.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const existingDebt = await prisma.debt.findFirst({
        where: {
          id: Number(id),
          userId,
        },
      });

      if (!existingDebt) {
        return res.status(404).json({
          message: 'Dívida não encontrada.',
        });
      }

      const parsedBody = updateDebtSchema.safeParse(req.body);

      if (!parsedBody.success) {
        return res.status(400).json({
          message: getZodErrorMessage(parsedBody.error),
        });
      }

      const data = parsedBody.data;

      const updatedDebt = await prisma.debt.update({
        where: {
          id: Number(id),
        },
        data: {
          ...(data.personName !== undefined && { personName: data.personName }),
          ...(data.type !== undefined && { type: data.type }),
          ...(data.amount !== undefined && { amount: data.amount }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.dueDate !== undefined && {
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
          }),
        },
      });

      return res.status(200).json(serializeDebt(updatedDebt));
    } catch (error) {
      logError('debt_update_failed', error, {
        requestId: req.requestId,
        userId: req.userId,
      });
      return res.status(500).json({
        message: 'Erro ao atualizar dívida.',
      });
    }
  }

  async updateStatus(req: Request, res: Response) {
    try {
      const userId = req.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const existingDebt = await prisma.debt.findFirst({
        where: {
          id: Number(id),
          userId,
        },
      });

      if (!existingDebt) {
        return res.status(404).json({
          message: 'Dívida não encontrada.',
        });
      }

      const parsedBody = updateDebtStatusSchema.safeParse(req.body);

      if (!parsedBody.success) {
        return res.status(400).json({
          message: getZodErrorMessage(parsedBody.error),
        });
      }

      const updatedDebt = await prisma.debt.update({
        where: {
          id: Number(id),
        },
        data: {
          status: parsedBody.data.status,
        },
      });

      return res.status(200).json(serializeDebt(updatedDebt));
    } catch (error) {
      logError('debt_status_update_failed', error, {
        requestId: req.requestId,
        userId: req.userId,
      });
      return res.status(500).json({
        message: 'Erro ao atualizar status da dívida.',
      });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const userId = req.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const existingDebt = await prisma.debt.findFirst({
        where: {
          id: Number(id),
          userId,
        },
      });

      if (!existingDebt) {
        return res.status(404).json({
          message: 'Dívida não encontrada.',
        });
      }

      await prisma.debt.delete({
        where: {
          id: Number(id),
        },
      });

      return res.status(200).json({
        message: 'Dívida removida com sucesso.',
      });
    } catch (error) {
      logError('debt_delete_failed', error, {
        requestId: req.requestId,
        userId: req.userId,
      });
      return res.status(500).json({
        message: 'Erro ao remover dívida.',
      });
    }
  }
}

export default new DebtController();
