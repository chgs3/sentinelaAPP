import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

type TokenPayload = {
  userId: number;
};

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export default function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: 'Token não informado.',
      });
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        message: 'Token inválido.',
      });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;

    req.userId = decoded.userId;

    return next();
  } catch {
    return res.status(401).json({
      message: 'Token inválido.',
    });
  }
}
