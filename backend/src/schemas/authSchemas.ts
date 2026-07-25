import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string({ error: 'Nome é obrigatório.' })
    .trim()
    .min(2, { error: 'Nome deve ter pelo menos 2 caracteres.' }),

  email: z
    .string({ error: 'Email é obrigatório.' })
    .trim()
    .email({ error: 'Email inválido.' })
    .transform((email) => email.toLowerCase()),

  password: z
    .string({ error: 'Senha é obrigatória.' })
    .min(6, { error: 'Senha deve ter pelo menos 6 caracteres.' }),
});

export const loginSchema = z.object({
  email: z
    .string({ error: 'Email é obrigatório.' })
    .trim()
    .email({ error: 'Email inválido.' })
    .transform((email) => email.toLowerCase()),

  password: z
    .string({ error: 'Senha é obrigatória.' })
    .min(1, { error: 'Senha é obrigatória.' }),
});
