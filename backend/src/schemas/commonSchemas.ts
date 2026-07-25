import { z } from 'zod';

export const moneyAmountSchema = z
  .number({ error: 'Valor é obrigatório.' })
  .finite('Valor inválido.')
  .positive('O valor deve ser maior que zero.')
  .max(999_999_999_999.99, 'O valor excede o limite permitido.')
  .multipleOf(0.01, 'O valor deve ter no máximo duas casas decimais.');

export const paginationQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int('limit deve ser inteiro.')
    .min(1, 'limit deve ser maior que zero.')
    .max(100, 'limit deve ser no máximo 100.')
    .default(100),
  offset: z.coerce
    .number()
    .int('offset deve ser inteiro.')
    .min(0, 'offset não pode ser negativo.')
    .default(0),
});
