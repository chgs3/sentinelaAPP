import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import test from 'node:test';
import express from 'express';
import { createRateLimiter } from '../src/middlewares/createRateLimiter';

test('bloqueia requisições acima do limite e publica headers padrão', async () => {
  const app = express();
  app.use(
    createRateLimiter({
      windowMs: 60_000,
      limit: 2,
      message: 'Limite de teste atingido.',
    })
  );
  app.get('/resource', (_req, res) => res.status(200).json({ ok: true }));

  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const url = `http://127.0.0.1:${address.port}/resource`;

    const first = await fetch(url);
    const second = await fetch(url);
    const blocked = await fetch(url);

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.ok(first.headers.get('ratelimit'));
    assert.equal(blocked.status, 429);
    assert.deepEqual(await blocked.json(), {
      message: 'Limite de teste atingido.',
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
