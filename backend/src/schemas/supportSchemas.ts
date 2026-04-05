import { z } from 'zod';

export const createSupportTicketSchema = z.object({
  category: z.enum(['bug', 'suggestion', 'question', 'improvement'], {
    message: 'Categoria inválida.',
  }),

  subject: z
    .string({
      required_error: 'Assunto é obrigatório.',
    })
    .trim()
    .min(3, 'Assunto deve ter pelo menos 3 caracteres.')
    .max(120, 'Assunto deve ter no máximo 120 caracteres.'),

  message: z
    .string({
      required_error: 'Mensagem é obrigatória.',
    })
    .trim()
    .min(10, 'Mensagem deve ter pelo menos 10 caracteres.')
    .max(5000, 'Mensagem deve ter no máximo 5000 caracteres.'),

  appVersion: z.string().trim().max(50).optional().nullable(),
  platform: z.string().trim().max(30).optional().nullable(),
  deviceModel: z.string().trim().max(100).optional().nullable(),
  osVersion: z.string().trim().max(50).optional().nullable(),

  attachmentBase64: z
    .string()
    .trim()
    .max(8_000_000, 'Imagem muito grande para envio.')
    .optional()
    .nullable(),

  attachmentMimeType: z
    .string()
    .trim()
    .max(100, 'Tipo do arquivo inválido.')
    .optional()
    .nullable(),

  attachmentFileName: z
    .string()
    .trim()
    .max(255, 'Nome do arquivo muito longo.')
    .optional()
    .nullable(),
});

export const listSupportTicketsQuerySchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved']).optional(),
});