import { z } from 'zod';

export const periodQuerySchema = z.object({
    startDate: z.string().min(1, 'startDate é obrigatório'),
    endDate: z.string().min(1, 'endDate é obrigatório'),
});

export type PeriodQuery = z.infer<typeof periodQuerySchema>;