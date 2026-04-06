import { Request, Response } from 'express';
import prisma from '../config/prisma';
import {
  createSupportTicketSchema,
  listSupportTicketsQuerySchema,
} from '../schemas/supportSchemas';
import { getZodErrorMessage } from '../utils/zodError';
import supportNotificationService from '../services/supportNotificationService';

class SupportController {
  async create(req: Request, res: Response) {
    const startedAt = Date.now();

    try {
      console.log('[SUPPORT] entrou no controller.create');
      console.log('[SUPPORT] method/url:', req.method, req.originalUrl);
      console.log('[SUPPORT] userId recebido do middleware:', req.userId);
      console.log('[SUPPORT] body keys:', Object.keys(req.body || {}));
      console.log(
        '[SUPPORT] attachmentBase64 length:',
        req.body?.attachmentBase64?.length ?? 0
      );

      const userId = req.userId;

      if (!userId) {
        console.warn('[SUPPORT] usuário não autenticado');
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const parsedBody = createSupportTicketSchema.safeParse(req.body);

      if (!parsedBody.success) {
        console.warn('[SUPPORT] falha na validação do body');
        console.warn('[SUPPORT] erro zod:', parsedBody.error.flatten());
        return res.status(400).json({
          message: getZodErrorMessage(parsedBody.error),
        });
      }

      console.log(
        '[SUPPORT] body validado com sucesso em',
        Date.now() - startedAt,
        'ms'
      );

      const {
        category,
        subject,
        message,
        appVersion,
        platform,
        deviceModel,
        osVersion,
        attachmentBase64,
        attachmentMimeType,
        attachmentFileName,
      } = parsedBody.data;

      console.log('[SUPPORT] categoria:', category);
      console.log('[SUPPORT] subject length:', subject.length);
      console.log('[SUPPORT] message length:', message.length);
      console.log(
        '[SUPPORT] attachment informado?',
        Boolean(attachmentBase64)
      );

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      console.log(
        '[SUPPORT] busca do usuário concluída em',
        Date.now() - startedAt,
        'ms'
      );

      if (!user) {
        console.warn('[SUPPORT] usuário não encontrado no banco:', userId);
        return res.status(404).json({
          message: 'Usuário não encontrado.',
        });
      }

      console.log('[SUPPORT] usuário encontrado:', {
        id: user.id,
        email: user.email,
      });

      const ticket = await prisma.supportTicket.create({
        data: {
          category,
          subject,
          message,
          appVersion: appVersion ?? null,
          platform: platform ?? null,
          deviceModel: deviceModel ?? null,
          osVersion: osVersion ?? null,
          attachmentBase64: attachmentBase64 ?? null,
          attachmentMimeType: attachmentMimeType ?? null,
          attachmentFileName: attachmentFileName ?? null,
          status: 'open',
          userId,
        },
      });

      console.log(
        '[SUPPORT] ticket criado com sucesso:',
        ticket.id,
        'em',
        Date.now() - startedAt,
        'ms'
      );

      let emailNotification:
        | {
            sent: boolean;
            skipped: boolean;
            reason?: string;
          }
        | undefined;

      try {
        console.log('[SUPPORT] iniciando envio de e-mail');

        emailNotification =
          await supportNotificationService.sendNewTicketNotification({
            ticketId: ticket.id,
            userName: user.name,
            userEmail: user.email,
            category: ticket.category,
            subject: ticket.subject,
            message: ticket.message,
            appVersion: ticket.appVersion,
            platform: ticket.platform,
            deviceModel: ticket.deviceModel,
            osVersion: ticket.osVersion,
            attachmentBase64: ticket.attachmentBase64,
            attachmentMimeType: ticket.attachmentMimeType,
            attachmentFileName: ticket.attachmentFileName,
            createdAt: ticket.createdAt,
          });

        console.log(
          '[SUPPORT] envio de e-mail concluído em',
          Date.now() - startedAt,
          'ms',
          emailNotification
        );
      } catch (mailError) {
        console.error('[SUPPORT] erro ao enviar e-mail de suporte:', mailError);
        emailNotification = {
          sent: false,
          skipped: false,
          reason: 'mail_send_failed',
        };
      }

      console.log(
        '[SUPPORT] finalizando request com 201 em',
        Date.now() - startedAt,
        'ms'
      );

      return res.status(201).json({
        message: 'Chamado de suporte criado com sucesso.',
        ticket,
        emailNotification,
      });
    } catch (error) {
      console.error('[SUPPORT] erro ao criar chamado de suporte:', error);
      console.error(
        '[SUPPORT] tempo até erro:',
        Date.now() - startedAt,
        'ms'
      );

      return res.status(500).json({
        message: 'Erro ao criar chamado de suporte.',
      });
    }
  }

  async list(req: Request, res: Response) {
    try {
      console.log('[SUPPORT] entrou no controller.list');
      console.log('[SUPPORT] userId:', req.userId);

      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const parsedQuery = listSupportTicketsQuerySchema.safeParse(req.query);

      if (!parsedQuery.success) {
        console.warn('[SUPPORT] falha na validação da query do list');
        return res.status(400).json({
          message: getZodErrorMessage(parsedQuery.error),
        });
      }

      const { status } = parsedQuery.data;

      const tickets = await prisma.supportTicket.findMany({
        where: {
          userId,
          ...(status ? { status } : {}),
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      console.log('[SUPPORT] tickets listados:', tickets.length);

      return res.status(200).json(tickets);
    } catch (error) {
      console.error('Erro ao listar chamados de suporte:', error);

      return res.status(500).json({
        message: 'Erro ao listar chamados de suporte.',
      });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      console.log('[SUPPORT] entrou no controller.getById');
      console.log('[SUPPORT] userId:', req.userId, 'params.id:', req.params.id);

      const userId = req.userId;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const ticketId = Number(id);

      if (Number.isNaN(ticketId)) {
        return res.status(400).json({
          message: 'ID do chamado inválido.',
        });
      }

      const ticket = await prisma.supportTicket.findFirst({
        where: {
          id: ticketId,
          userId,
        },
      });

      if (!ticket) {
        return res.status(404).json({
          message: 'Chamado de suporte não encontrado.',
        });
      }

      console.log('[SUPPORT] ticket encontrado:', ticket.id);

      return res.status(200).json(ticket);
    } catch (error) {
      console.error('Erro ao buscar chamado de suporte:', error);

      return res.status(500).json({
        message: 'Erro ao buscar chamado de suporte.',
      });
    }
  }
}

export default new SupportController();