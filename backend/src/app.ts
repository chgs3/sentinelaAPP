import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { env } from './config/env';
import { buildCorsOptions } from './config/cors';
import { apiRateLimiter } from './middlewares/rateLimiters';
import requestContextMiddleware from './middlewares/requestContextMiddleware';

const app = express();

app.disable('x-powered-by');

if (env.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

app.use(requestContextMiddleware);
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
    strictTransportSecurity: env.NODE_ENV === 'production' ? undefined : false,
  })
);
app.use(cors(buildCorsOptions(env.CORS_ORIGINS, env.NODE_ENV)));
app.use(apiRateLimiter);
app.use(
  express.json({
    limit: env.JSON_BODY_LIMIT,
  })
);

app.use(
  express.urlencoded({
    limit: env.JSON_BODY_LIMIT,
    extended: true,
  })
);

app.use(routes);

app.use(
  (err: any, req: Request, res: Response, _next: NextFunction) => {
    const statusCode =
      err?.type === 'entity.too.large'
        ? 413
        : err?.type === 'entity.parse.failed'
          ? 400
          : typeof err?.statusCode === 'number'
            ? err.statusCode
            : 500;

    const message =
      statusCode === 413
        ? 'Conteúdo enviado é muito grande.'
        : statusCode === 400
          ? 'JSON inválido.'
          : statusCode === 403
            ? 'Origem não permitida.'
            : 'Erro interno do servidor.';

    if (env.NODE_ENV !== 'test') {
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'http_error',
          requestId: req.requestId,
          method: req.method,
          path: req.originalUrl,
          statusCode,
          error: err instanceof Error ? err.message : String(err),
        })
      );
    }

    return res.status(statusCode).json({
      message,
      requestId: req.requestId,
    });
  }
);

export default app;
