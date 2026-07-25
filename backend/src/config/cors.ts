import type { CorsOptions } from 'cors';

type AppEnvironment = 'development' | 'test' | 'production';

export function buildCorsOptions(
  allowedOrigins: string[] | undefined,
  nodeEnv: AppEnvironment
): CorsOptions {
  const origins = new Set(allowedOrigins ?? []);
  const allowsEveryOrigin = nodeEnv !== 'production' && origins.size === 0;

  return {
    credentials: false,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
    origin(origin, callback) {
      if (!origin || allowsEveryOrigin || origins.has(origin)) {
        callback(null, true);
        return;
      }

      const error = new Error('Origem não permitida pelo CORS.') as Error & {
        statusCode?: number;
      };
      error.statusCode = 403;
      callback(error);
    },
  };
}
