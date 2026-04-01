import { z } from 'zod';

export const createTransactionSchema = z.object({
  type: z.enum(['expense', 'income'], {
    error: 'Tipo deve ser expense ou income.',
  }),

  amount: z.coerce
    .number()
    .positive({ error: 'Valor deve ser maior que zero.' }),

  description: z
    .string({ error: 'Descrição é obrigatória.' })
    .trim()
    .min(1, { error: 'Descrição é obrigatória.' }),

  category: z
    .string({ error: 'Categoria é obrigatória.' })
    .trim()
    .min(1, { error: 'Categoria é obrigatória.' }),

  transactionAt: z.string({ error: 'transactionAt é obrigatório.' }),

  paymentMethod: z
    .string()
    .trim()
    .nullable()
    .optional(),

  accountOrCard: z
    .string()
    .trim()
    .nullable()
    .optional(),
});

export const updateTransactionSchema = z.object({
  type: z.enum(['expense', 'income']).optional(),

  amount: z.coerce
    .number()
    .positive({ error: 'Valor deve ser maior que zero.' })
    .optional(),

  description: z
    .string()
    .trim()
    .min(1, { error: 'Descrição não pode ser vazia.' })
    .optional(),

  category: z
    .string()
    .trim()
    .min(1, { error: 'Categoria não pode ser vazia.' })
    .optional(),

  transactionAt: z.string().optional(),

  paymentMethod: z
    .string()
    .trim()
    .nullable()
    .optional(),

  accountOrCard: z
    .string()
    .trim()
    .nullable()
    .optional(),
});