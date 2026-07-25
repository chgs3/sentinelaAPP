import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { after, before, beforeEach, test } from 'node:test';
import { createInMemoryPrisma } from './helpers/inMemoryPrisma';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://sentinela:sentinela@localhost:5432/sentinela_test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'sentinela-test-secret-with-at-least-32-chars';
process.env.GEMINI_API_KEY = '';

type ApiResponse<T = any> = {
  status: number;
  body: T;
};

const memory = createInMemoryPrisma();
let server: Server;
let baseUrl: string;
let resetPrismaClientForTests: () => void;

before(async () => {
  const prismaModule = await import('../src/config/prisma');
  prismaModule.setPrismaClientForTests(memory.client as never);
  resetPrismaClientForTests = prismaModule.resetPrismaClientForTests;

  const app = (await import('../src/app')).default;

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(() => {
  memory.reset();
});

after(async () => {
  resetPrismaClientForTests();

  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

async function request<T = any>(
  path: string,
  {
    method = 'GET',
    token,
    body,
  }: {
    method?: string;
    token?: string;
    body?: unknown;
  } = {}
): Promise<ApiResponse<T>> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();

  return {
    status: response.status,
    body: text ? JSON.parse(text) : undefined,
  };
}

async function registerUser(
  email: string,
  name = 'Usuário de Teste'
): Promise<{ token: string; user: { id: number; name: string; email: string } }> {
  const response = await request('/auth/register', {
    method: 'POST',
    body: {
      name,
      email,
      password: 'segredo123',
    },
  });

  assert.equal(response.status, 201);
  return response.body;
}

test('expõe saúde e protege rotas privadas', async () => {
  const health = await request('/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.message, 'API funcionando corretamente');

  const withoutToken = await request('/transactions');
  assert.equal(withoutToken.status, 401);
  assert.equal(withoutToken.body.message, 'Token não informado.');

  const invalidToken = await request('/transactions', {
    token: 'token-invalido',
  });
  assert.equal(invalidToken.status, 401);
  assert.equal(invalidToken.body.message, 'Token inválido.');
});

test('cadastra, normaliza email, autentica e restaura a sessão', async () => {
  const registration = await registerUser('Pessoa@Example.COM', 'Pessoa');

  assert.equal(registration.user.email, 'pessoa@example.com');
  assert.ok(registration.token);

  const duplicate = await request('/auth/register', {
    method: 'POST',
    body: {
      name: 'Outra Pessoa',
      email: 'PESSOA@example.com',
      password: 'segredo123',
    },
  });
  assert.equal(duplicate.status, 400);
  assert.match(duplicate.body.message, /Já existe/);

  const wrongPassword = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'pessoa@example.com',
      password: 'senha-errada',
    },
  });
  assert.equal(wrongPassword.status, 401);

  const login = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'PESSOA@EXAMPLE.COM',
      password: 'segredo123',
    },
  });
  assert.equal(login.status, 200);
  assert.ok(login.body.token);

  const session = await request('/auth/me', { token: login.body.token });
  assert.equal(session.status, 200);
  assert.deepEqual(session.body.user, registration.user);

  const updatedProfile = await request('/auth/profile', {
    method: 'PUT',
    token: login.body.token,
    body: {
      name: 'Pessoa Atualizada',
    },
  });
  assert.equal(updatedProfile.status, 200);
  assert.equal(updatedProfile.body.user.name, 'Pessoa Atualizada');

  const restoredProfile = await request('/auth/me', {
    token: login.body.token,
  });
  assert.equal(restoredProfile.body.user.name, 'Pessoa Atualizada');
});

test('valida transações e impede acesso entre usuários', async () => {
  const firstUser = await registerUser('primeiro@example.com', 'Primeiro');
  const secondUser = await registerUser('segundo@example.com', 'Segundo');
  const transactionAt = new Date().toISOString();

  const incompletePeriod = await request(
    '/transactions?startDate=2026-01-01',
    {
      token: firstUser.token,
    }
  );
  assert.equal(incompletePeriod.status, 400);
  assert.match(incompletePeriod.body.message, /endDate/);

  const invalid = await request('/transactions', {
    method: 'POST',
    token: firstUser.token,
    body: {
      type: 'expense',
      amount: -20,
      description: 'Inválida',
      category: 'Outros',
      transactionAt,
    },
  });
  assert.equal(invalid.status, 400);
  assert.match(invalid.body.message, /maior que zero/);

  const created = await request('/transactions', {
    method: 'POST',
    token: firstUser.token,
    body: {
      type: 'expense',
      amount: 80,
      description: 'Internet',
      category: 'Contas',
      transactionAt,
      paymentMethod: 'pix',
    },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.userId, firstUser.user.id);

  const ownerList = await request('/transactions', {
    token: firstUser.token,
  });
  assert.equal(ownerList.status, 200);
  assert.equal(ownerList.body.length, 1);

  const otherUserList = await request('/transactions', {
    token: secondUser.token,
  });
  assert.deepEqual(otherUserList.body, []);

  const forbiddenUpdate = await request(
    `/transactions/${created.body.id}`,
    {
      method: 'PUT',
      token: secondUser.token,
      body: {
        type: 'expense',
        amount: 1,
        description: 'Tentativa',
        category: 'Outros',
        transactionAt,
      },
    }
  );
  assert.equal(forbiddenUpdate.status, 404);

  const forbiddenDelete = await request(
    `/transactions/${created.body.id}`,
    {
      method: 'DELETE',
      token: secondUser.token,
    }
  );
  assert.equal(forbiddenDelete.status, 404);

  const ownerUpdate = await request(`/transactions/${created.body.id}`, {
    method: 'PUT',
    token: firstUser.token,
    body: {
      type: 'expense',
      amount: 90,
      description: 'Internet atualizada',
      category: 'Contas',
      transactionAt,
    },
  });
  assert.equal(ownerUpdate.status, 200);
  assert.equal(ownerUpdate.body.amount, 90);

  const ownerDelete = await request(`/transactions/${created.body.id}`, {
    method: 'DELETE',
    token: firstUser.token,
  });
  assert.equal(ownerDelete.status, 200);

  const emptyOwnerList = await request('/transactions', {
    token: firstUser.token,
  });
  assert.deepEqual(emptyOwnerList.body, []);
});

test('registra mensagens, resume o período e fecha o mês', async () => {
  const user = await registerUser('fluxo@example.com');
  const otherUser = await registerUser('isolado@example.com');
  const now = new Date();
  const transactionAt = now.toISOString();

  const expense = await request('/transactions', {
    method: 'POST',
    token: user.token,
    body: {
      type: 'expense',
      amount: 80,
      description: 'Internet',
      category: 'Contas',
      transactionAt,
    },
  });
  assert.equal(expense.status, 201);

  const income = await request('/messages/parse', {
    method: 'POST',
    token: user.token,
    body: {
      message: 'Recebi 500 de freela',
    },
  });
  assert.equal(income.status, 201);
  assert.equal(income.body.status, 'created');
  assert.equal(income.body.transaction.amount, 500);

  const malformedConfirmation = await request('/messages/confirm', {
    method: 'POST',
    token: user.token,
    body: {
      parsed: {
        type: 'expense',
        amount: -10,
      },
    },
  });
  assert.equal(malformedConfirmation.status, 400);

  const summary = await request(
    '/summary/period?startDate=2000-01-01&endDate=2100-12-31',
    { token: user.token }
  );
  assert.equal(summary.status, 200);
  assert.deepEqual(summary.body, {
    totalIncomes: 500,
    totalExpenses: 80,
    balance: 420,
    totalTransactions: 2,
  });

  const otherSummary = await request(
    '/summary/period?startDate=2000-01-01&endDate=2100-12-31',
    { token: otherUser.token }
  );
  assert.equal(otherSummary.body.totalTransactions, 0);

  const categories = await request(
    '/summary/categories?startDate=2000-01-01&endDate=2100-12-31',
    { token: user.token }
  );
  assert.equal(categories.status, 200);
  assert.deepEqual(categories.body, [
    {
      category: 'Contas',
      total: 80,
      count: 1,
    },
  ]);

  const comparison = await request(
    `/summary/comparison?month=${now.getUTCMonth() + 1}&year=${now.getUTCFullYear()}`,
    { token: user.token }
  );
  assert.equal(comparison.status, 200);
  assert.equal(comparison.body.current.totalTransactions, 2);
  assert.equal(comparison.body.current.balance, 420);

  const daily = await request(
    `/summary/daily?month=${now.getUTCMonth() + 1}&year=${now.getUTCFullYear()}`,
    { token: user.token }
  );
  assert.equal(daily.status, 200);
  const currentDay = daily.body.find(
    (item: any) => item.day === now.getUTCDate()
  );
  assert.ok(currentDay);
  assert.equal(currentDay.totalTransactions, 2);
  assert.equal(currentDay.balance, 420);

  const closure = await request('/monthly-closures', {
    method: 'POST',
    token: user.token,
    body: {
      month: now.getUTCMonth() + 1,
      year: now.getUTCFullYear(),
    },
  });
  assert.equal(closure.status, 201);
  assert.equal(closure.body.closure.totalTransactions, 2);
  assert.equal(closure.body.closure.balance, 420);

  const duplicateClosure = await request('/monthly-closures', {
    method: 'POST',
    token: user.token,
    body: {
      month: now.getUTCMonth() + 1,
      year: now.getUTCFullYear(),
    },
  });
  assert.equal(duplicateClosure.status, 409);

  const ownerClosures = await request('/monthly-closures', {
    token: user.token,
  });
  assert.equal(ownerClosures.body.length, 1);
  assert.equal(ownerClosures.body[0].totalTransactions, 2);

  const otherClosures = await request('/monthly-closures', {
    token: otherUser.token,
  });
  assert.deepEqual(otherClosures.body, []);
});

test('registra e quita dívida sem vazar dados entre usuários', async () => {
  const user = await registerUser('divida@example.com');
  const otherUser = await registerUser('outra-divida@example.com');

  const invalidDebt = await request('/debts', {
    method: 'POST',
    token: user.token,
    body: {
      personName: 'João',
      type: 'to_receive',
      amount: -50,
      description: 'Almoço',
    },
  });
  assert.equal(invalidDebt.status, 400);

  const created = await request('/debts/message', {
    method: 'POST',
    token: user.token,
    body: {
      message: 'João me deve 50 do almoço',
    },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.status, 'created');
  assert.equal(created.body.debt.status, 'pending');

  const otherList = await request('/debts', { token: otherUser.token });
  assert.deepEqual(otherList.body, []);

  const forbiddenStatusUpdate = await request(
    `/debts/${created.body.debt.id}/status`,
    {
      method: 'PATCH',
      token: otherUser.token,
      body: { status: 'received' },
    }
  );
  assert.equal(forbiddenStatusUpdate.status, 404);

  const settled = await request('/debts/message', {
    method: 'POST',
    token: user.token,
    body: {
      message: 'João já pagou',
    },
  });
  assert.equal(settled.status, 200);
  assert.equal(settled.body.status, 'settled');
  assert.equal(settled.body.debt.status, 'received');

  const ownerDelete = await request(`/debts/${created.body.debt.id}`, {
    method: 'DELETE',
    token: user.token,
  });
  assert.equal(ownerDelete.status, 200);

  const ownerList = await request('/debts', { token: user.token });
  assert.deepEqual(ownerList.body, []);
});
