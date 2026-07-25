import { z } from 'zod';

const nullableOptionalText = z
  .string()
  .trim()
  .min(1, 'O texto não pode estar vazio.')
  .nullable()
  .optional();

export const createTransactionSchema = z.object({
  type: z.enum(['expense', 'income'], {
    error: 'Tipo de transação inválido.',
  }),
  amount: z
    .number({ error: 'Valor é obrigatório.' })
    .finite('Valor inválido.')
    .positive('O valor deve ser maior que zero.'),
  description: z
    .string({ error: 'Descrição é obrigatória.' })
    .trim()
    .min(1, 'Descrição é obrigatória.'),
  category: z
    .string({ error: 'Categoria é obrigatória.' })
    .trim()
    .min(1, 'Categoria é obrigatória.'),
  transactionAt: z
    .string({ error: 'Data é obrigatória.' })
    .datetime({ error: 'Data inválida.' }),
  paymentMethod: nullableOptionalText,
  accountOrCard: nullableOptionalText,
});

export const updateTransactionSchema = createTransactionSchema;
