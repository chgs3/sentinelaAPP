import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export default function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = randomUUID();
  const startedAt = Date.now();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    if (env.NODE_ENV === 'test') return;

    console.info(
      JSON.stringify({
        level: 'info',
        event: 'http_request',
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
        userId: req.userId,
      })
    );
  });

  next();
}
