import { z } from 'zod';

export const createMonthlyClosureSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(3000),
});

export const listMonthlyClosuresQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(3000).optional(),
});