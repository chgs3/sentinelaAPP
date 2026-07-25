import { rateLimit } from 'express-rate-limit';

type RateLimiterOptions = {
  windowMs: number;
  limit: number;
  message: string;
};

export function createRateLimiter(options: RateLimiterOptions) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      message: options.message,
    },
  });
}
