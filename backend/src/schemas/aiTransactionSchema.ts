import { z } from 'zod';

export const aiTransactionSchema = z.object({
  type: z.enum(['expense', 'income']),
  amount: z.number().positive(),
  description: z.string().min(1),
  category: z.string().min(1),
  transactionAt: z.string(),
  rawDateExpression: z.string().nullable().optional(),
  paymentMethod: z.enum(['credit', 'debit', 'pix', 'cash']).nullable(),
  accountOrCard: z.string().nullable(),
  confidence: z.number().min(0).max(1).optional(),
});

export type AITransactionOutput = z.infer<typeof aiTransactionSchema>;