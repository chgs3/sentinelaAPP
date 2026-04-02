import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z
    .string({ error: 'Nome é obrigatório.' })
    .trim()
    .min(2, { error: 'Nome deve ter pelo menos 2 caracteres.' }),
});