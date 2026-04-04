import { z } from 'zod';

export const summaryComparisonQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(3000),
});