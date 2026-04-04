import { z } from 'zod';

export const settleDebtMessageSchema = z.object({
  message: z.string().min(1, 'Mensagem é obrigatória.'),
});