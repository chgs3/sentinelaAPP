import { Request, Response } from 'express';
import prisma from '../config/prisma';
import {
  createSupportTicketSchema,
  listSupportTicketsQuerySchema,
} from '../schemas/supportSchemas';
import { getZodErrorMessage } from '../utils/zodError';
import supportNotificationService from '../services/supportNotificationService';
import { logError } from '../utils/logger';

class SupportController {
  async create(req: Request, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          message: 'Usuário não autenticado.',
        });
      }

      const parsedBody = createSupportTicketSchema.safeParse(req.body);

      if (!parsedBody.success) {
        return res.status(400).json({
          message: getZodErrorMessage(parsedBody.error),
        });
      }

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

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          message: 'Usuário não encontrado.',
        });
      }

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

      const emailPayload = {
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
      };

      res.status(201).json({
        message: 'Chamado de suporte criado com sucesso.',
        ticket,
        emailNotification: {
          sent: false,
          skipped: false,
          reason: 'processing_async',
        },
      });

      void supportNotificationService
        .sendNewTicketNotification(emailPayload)
        .catch((mailError: any) => {
          logError('support_notification_failed', mailError, {
            ticketId: ticket.id,
            requestId: req.requestId,
          });
        });

      return;
    } catch (error) {
      logError('support_create_failed', error, {
        requestId: req.requestId,
        userId: req.userId,
      });

      return res.status(500).json({
        message: 'Erro ao criar chamado de suporte.',
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

      const parsedQuery = listSupportTicketsQuerySchema.safeParse(req.query);

      if (!parsedQuery.success) {
        return res.status(400).json({
          message: getZodErrorMessage(parsedQuery.error),
        });
      }

      const { status, limit, offset } = parsedQuery.data;

      const tickets = await prisma.supportTicket.findMany({
        where: {
          userId,
          ...(status ? { status } : {}),
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      });

      return res.status(200).json(tickets);
    } catch (error) {
      logError('support_list_failed', error, {
        requestId: req.requestId,
        userId: req.userId,
      });

      return res.status(500).json({
        message: 'Erro ao listar chamados de suporte.',
      });
    }
  }

  async getById(req: Request, res: Response) {
    try {
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

      return res.status(200).json(ticket);
    } catch (error) {
      logError('support_get_failed', error, {
        requestId: req.requestId,
        userId: req.userId,
      });

      return res.status(500).json({
        message: 'Erro ao buscar chamado de suporte.',
      });
    }
  }
}

export default new SupportController();
