import { z } from 'zod';

export const aiTransactionSchema = z.object({
  type: z.enum(['expense', 'income']),
  amount: z.number().positive(),
  description: z.string().min(1),
  category: z.enum([
    'Transporte',
    'Alimentação',
    'Moradia',
    'Saúde',
    'Lazer',
    'Trabalho',
    'Compras',
    'Outros',
    'Transferência',
  ]),
  transactionAt: z.string().min(1),
  rawDateExpression: z.string().nullable(),
  paymentMethod: z.enum(['credit', 'debit', 'pix', 'cash']).nullable(),
  accountOrCard: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  possibleTransfer: z.boolean(),
});

export type AITransactionOutput = z.infer<typeof aiTransactionSchema>;