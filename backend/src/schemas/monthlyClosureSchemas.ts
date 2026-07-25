import { z } from 'zod';
import { paginationQuerySchema } from './commonSchemas';

export const createMonthlyClosureSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(3000),
});

export const listMonthlyClosuresQuerySchema = paginationQuerySchema.extend({
  year: z.coerce.number().int().min(2000).max(3000).optional(),
});
