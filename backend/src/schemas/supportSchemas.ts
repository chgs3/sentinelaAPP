import { z } from 'zod';

export const createSupportTicketSchema = z.object({
  category: z.enum(['bug', 'suggestion', 'question', 'other'], {
    message: 'Categoria inválida.',
  }),

  subject: z
    .string()
    .trim()
    .min(3, 'Assunto deve ter pelo menos 3 caracteres.')
    .max(120, 'Assunto deve ter no máximo 120 caracteres.'),

  message: z
    .string()
    .trim()
    .min(10, 'Mensagem deve ter pelo menos 10 caracteres.')
    .max(5000, 'Mensagem deve ter no máximo 5000 caracteres.'),

  appVersion: z
    .string()
    .trim()
    .max(50, 'Versão do app muito longa.')
    .optional()
    .nullable(),

  platform: z
    .string()
    .trim()
    .max(30, 'Plataforma muito longa.')
    .optional()
    .nullable(),

  deviceModel: z
    .string()
    .trim()
    .max(100, 'Modelo do dispositivo muito longo.')
    .optional()
    .nullable(),

  osVersion: z
    .string()
    .trim()
    .max(50, 'Versão do sistema muito longa.')
    .optional()
    .nullable(),

  attachmentBase64: z
    .string()
    .trim()
    .max(10_000_000, 'Imagem muito grande.')
    .optional()
    .nullable(),

  attachmentMimeType: z
    .string()
    .trim()
    .max(100, 'Tipo MIME muito longo.')
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
  status: z.enum(['open', 'in_progress', 'resolved'], {
    message: 'Status inválido.',
  }).optional(),
});