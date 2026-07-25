import { env } from '../config/env';

type LogContext = Record<string, string | number | boolean | null | undefined>;

export function logError(
  event: string,
  error: unknown,
  context: LogContext = {}
) {
  if (env.NODE_ENV === 'test') return;

  console.error(
    JSON.stringify({
      level: 'error',
      event,
      ...context,
      error: error instanceof Error ? error.message : String(error),
    })
  );
}
