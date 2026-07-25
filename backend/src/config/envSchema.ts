import { z } from 'zod';

const optionalString = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().optional()
);

const optionalEmail = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.email().optional()
);

const optionalPort = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.coerce.number().int().min(1).max(65_535).optional()
);

const optionalCsv = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    )
    .optional()
);

const booleanFromString = z.preprocess((value) => {
  if (value === undefined || value === '') return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }

  return value;
}, z.boolean());

const backendEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3333),
    DATABASE_URL: z
      .url()
      .refine(
        (value) =>
          value.startsWith('postgres://') ||
          value.startsWith('postgresql://'),
        'DATABASE_URL deve usar o protocolo postgres:// ou postgresql://.'
      ),
    JWT_SECRET: z
      .string()
      .min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres.'),
    GEMINI_API_KEY: optionalString,
    APP_NAME: z.string().trim().min(1).default('Sentinela'),
    CORS_ORIGINS: optionalCsv,
    JSON_BODY_LIMIT: z
      .string()
      .trim()
      .regex(/^\d+(b|kb|mb)$/i, 'JSON_BODY_LIMIT deve usar b, kb ou mb.')
      .default('10mb'),
    RATE_LIMIT_WINDOW_MS: z.coerce
      .number()
      .int()
      .min(1_000)
      .default(60_000),
    RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(120),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),
    TRUST_PROXY: booleanFromString,
    SMTP_HOST: optionalString,
    SMTP_PORT: optionalPort,
    SMTP_USER: optionalString,
    SMTP_PASS: optionalString,
    MAIL_FROM: optionalString,
    SUPPORT_EMAIL: optionalEmail,
  })
  .superRefine((value, context) => {
    const smtpFields = [
      value.SMTP_HOST,
      value.SMTP_PORT,
      value.SMTP_USER,
      value.SMTP_PASS,
      value.SUPPORT_EMAIL,
    ];
    const configuredFields = smtpFields.filter(
      (field) => field !== undefined
    ).length;

    if (configuredFields > 0 && configuredFields < smtpFields.length) {
      context.addIssue({
        code: 'custom',
        path: ['SMTP_HOST'],
        message:
          'SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SUPPORT_EMAIL devem ser configurados em conjunto.',
      });
    }

    if (
      value.NODE_ENV === 'production' &&
      (!value.CORS_ORIGINS ||
        value.CORS_ORIGINS.length === 0 ||
        value.CORS_ORIGINS.includes('*'))
    ) {
      context.addIssue({
        code: 'custom',
        path: ['CORS_ORIGINS'],
        message:
          'CORS_ORIGINS deve listar origens explícitas em produção e não pode usar *.',
      });
    }
  });

export type BackendEnv = z.infer<typeof backendEnvSchema>;

export function parseBackendEnv(
  input: Record<string, string | undefined>
): BackendEnv {
  const result = backendEnvSchema.safeParse(input);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'ambiente'}: ${issue.message}`)
      .join('\n');

    throw new Error(`Configuração de ambiente inválida:\n${details}`);
  }

  return result.data;
}
