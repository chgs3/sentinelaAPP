import { z } from 'zod';

export const parseDebtMessageSchema = z.object({
  message: z.string().min(1, 'Mensagem é obrigatória.'),
});