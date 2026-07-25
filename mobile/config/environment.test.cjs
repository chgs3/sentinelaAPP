const assert = require('node:assert/strict');
const test = require('node:test');
const {
  APP_ENVIRONMENTS,
  resolveMobileEnvironment,
} = require('./environment.js');

test('usa desenvolvimento local como ambiente padrão', () => {
  const environment = resolveMobileEnvironment({});

  assert.equal(environment.appEnv, 'dev');
  assert.equal(environment.apiUrl, 'http://localhost:3333');
});

test('resolve beta para a API publicada', () => {
  const environment = resolveMobileEnvironment({ APP_ENV: 'beta' });

  assert.equal(
    environment.apiUrl,
    'https://sentinela-backend-beta.onrender.com'
  );
});

test('exige URL explícita em produção', () => {
  assert.throws(
    () => resolveMobileEnvironment({ APP_ENV: 'prod' }),
    /EXPO_PUBLIC_API_URL é obrigatória/
  );
});

test('rejeita ambiente desconhecido', () => {
  assert.throws(
    () => resolveMobileEnvironment({ APP_ENV: 'staging' }),
    /APP_ENV inválido/
  );
});

test('normaliza a URL configurada e exige HTTPS fora de dev', () => {
  const production = resolveMobileEnvironment({
    APP_ENV: 'prod',
    EXPO_PUBLIC_API_URL: 'https://api.sentinela.app/',
  });

  assert.equal(production.apiUrl, 'https://api.sentinela.app');
  assert.throws(
    () =>
      resolveMobileEnvironment({
        APP_ENV: 'beta',
        EXPO_PUBLIC_API_URL: 'http://api.example.com',
      }),
    /deve usar https/
  );
});

test('cada variante usa identificadores nativos exclusivos', () => {
  const environments = APP_ENVIRONMENTS.map((APP_ENV) =>
    resolveMobileEnvironment({
      APP_ENV,
      EXPO_PUBLIC_API_URL:
        APP_ENV === 'prod' ? 'https://api.sentinela.app' : undefined,
    })
  );

  assert.equal(
    new Set(environments.map(({ androidPackage }) => androidPackage)).size,
    environments.length
  );
  assert.equal(
    new Set(environments.map(({ iosBundleIdentifier }) => iosBundleIdentifier))
      .size,
    environments.length
  );
});
