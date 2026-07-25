import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCorsOptions } from '../src/config/cors';

function checkOrigin(
  allowedOrigins: string[] | undefined,
  nodeEnv: 'development' | 'test' | 'production',
  origin: string | undefined
) {
  const options = buildCorsOptions(allowedOrigins, nodeEnv);

  return new Promise<boolean>((resolve, reject) => {
    if (typeof options.origin !== 'function') {
      reject(new Error('Callback de origem não configurado.'));
      return;
    }

    options.origin(origin, (error, allowed) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(Boolean(allowed));
    });
  });
}

test('aceita cliente nativo sem Origin e origem web autorizada', async () => {
  await assert.doesNotReject(
    checkOrigin(['https://app.sentinela.example'], 'production', undefined)
  );
  assert.equal(
    await checkOrigin(
      ['https://app.sentinela.example'],
      'production',
      'https://app.sentinela.example'
    ),
    true
  );
});

test('bloqueia origem desconhecida em produção', async () => {
  await assert.rejects(
    checkOrigin(
      ['https://app.sentinela.example'],
      'production',
      'https://malicioso.example'
    ),
    /não permitida/
  );
});

test('mantém desenvolvimento aberto quando nenhuma origem foi configurada', async () => {
  assert.equal(
    await checkOrigin(undefined, 'development', 'http://localhost:8081'),
    true
  );
});
