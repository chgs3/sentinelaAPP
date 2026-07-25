import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

const entityIdSchema = z.coerce.number().int().positive();

export default function validateIdParamMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const result = entityIdSchema.safeParse(req.params.id);

  if (!result.success) {
    return res.status(400).json({
      message: 'ID inválido.',
    });
  }

  req.params.id = String(result.data);
  return next();
}
