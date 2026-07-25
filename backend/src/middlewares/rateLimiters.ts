import { env } from '../config/env';
import { createRateLimiter } from './createRateLimiter';

export const apiRateLimiter = createRateLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  message: 'Muitas requisições. Tente novamente em instantes.',
});

export const authRateLimiter = createRateLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  message: 'Muitas tentativas de acesso. Aguarde antes de tentar novamente.',
});
