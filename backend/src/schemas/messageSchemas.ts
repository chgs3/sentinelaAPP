import { z } from 'zod';

export const parseMessageSchema = z.object({
  message: z
    .string({ error: 'A mensagem é obrigatória.' })
    .trim()
    .min(1, { error: 'A mensagem é obrigatória.' }),
});