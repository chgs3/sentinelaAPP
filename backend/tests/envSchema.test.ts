import assert from 'node:assert/strict';
import test from 'node:test';
import { parseBackendEnv } from '../src/config/envSchema';

const validEnvironment = {
  DATABASE_URL: 'postgresql://user:password@localhost:5432/sentinela',
  JWT_SECRET: 'uma-chave-segura-com-mais-de-32-caracteres',
};

test('aplica padrões seguros à configuração mínima', () => {
  const env = parseBackendEnv(validEnvironment);

  assert.equal(env.NODE_ENV, 'development');
  assert.equal(env.PORT, 3333);
  assert.equal(env.APP_NAME, 'Sentinela');
  assert.equal(env.GEMINI_API_KEY, undefined);
});

test('converte porta e aceita configuração SMTP completa', () => {
  const env = parseBackendEnv({
    ...validEnvironment,
    PORT: '4000',
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '587',
    SMTP_USER: 'user@example.com',
    SMTP_PASS: 'secret',
    SUPPORT_EMAIL: 'support@example.com',
  });

  assert.equal(env.PORT, 4000);
  assert.equal(env.SMTP_PORT, 587);
});

test('rejeita segredo JWT fraco', () => {
  assert.throws(
    () =>
      parseBackendEnv({
        ...validEnvironment,
        JWT_SECRET: 'curto',
      }),
    /JWT_SECRET deve ter pelo menos 32 caracteres/
  );
});

test('rejeita banco que não seja PostgreSQL', () => {
  assert.throws(
    () =>
      parseBackendEnv({
        ...validEnvironment,
        DATABASE_URL: 'file:./dev.db',
      }),
    /DATABASE_URL/
  );
});

test('rejeita configuração SMTP parcial', () => {
  assert.throws(
    () =>
      parseBackendEnv({
        ...validEnvironment,
        SMTP_HOST: 'smtp.example.com',
      }),
    /devem ser configurados em conjunto/
  );
});
