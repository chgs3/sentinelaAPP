import { ZodError } from 'zod';

export function getZodErrorMessage(error: ZodError) {
  if (error.issues.length === 0) {
    return 'Dados inválidos.';
  }

  return error.issues[0].message;
}