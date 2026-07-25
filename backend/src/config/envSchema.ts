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
