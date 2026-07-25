import { z } from 'zod';
import { moneyAmountSchema } from './commonSchemas';

const debtTypeEnum = z.enum(['to_receive', 'to_pay']);
const debtStatusEnum = z.enum(['pending', 'received', 'paid']);

export const createDebtSchema = z.object({
  personName: z.string().min(1, 'Nome da pessoa é obrigatório.'),
  type: debtTypeEnum,
  amount: moneyAmountSchema,
  description: z.string().min(1, 'Descrição é obrigatória.'),
  status: debtStatusEnum.optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export const updateDebtSchema = z.object({
  personName: z.string().min(1, 'Nome da pessoa é obrigatório.').optional(),
  type: debtTypeEnum.optional(),
  amount: moneyAmountSchema.optional(),
  description: z.string().min(1, 'Descrição é obrigatória.').optional(),
  status: debtStatusEnum.optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export const updateDebtStatusSchema = z.object({
  status: debtStatusEnum,
});
