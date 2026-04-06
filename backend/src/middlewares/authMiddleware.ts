import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

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
    console.log('[AUTH] entrou no middleware');

    const authHeader = req.headers.authorization;
    console.log('[AUTH] authorization presente?', Boolean(authHeader));

    if (!authHeader) {
      console.warn('[AUTH] token não informado');
      return res.status(401).json({
        message: 'Token não informado.',
      });
    }

    const [scheme, token] = authHeader.split(' ');

    console.log('[AUTH] scheme recebido:', scheme);

    if (scheme !== 'Bearer' || !token) {
      console.warn('[AUTH] header de autorização inválido');
      return res.status(401).json({
        message: 'Token inválido.',
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('[AUTH] JWT_SECRET não definido');
      return res.status(500).json({
        message: 'Erro interno de autenticação.',
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    ) as TokenPayload;

    console.log('[AUTH] token decodificado com sucesso');
    console.log('[AUTH] userId extraído:', decoded.userId);

    req.userId = decoded.userId;

    return next();
  } catch (error) {
    console.error('[AUTH] erro ao validar token:', error);

    return res.status(401).json({
      message: 'Token inválido.',
    });
  }
}