import assert from 'node:assert/strict';
import test from 'node:test';
import type { ParsedTransaction } from '../src/types/parsedTransaction';
import { decideParseOutcome } from '../src/utils/decideParseOutcome';

function createParsed(
  overrides: Partial<ParsedTransaction> = {}
): ParsedTransaction {
  return {
    type: 'expense',
    amount: 42,
    description: 'Uber',
    category: 'Transporte',
    transactionAt: new Date(2026, 6, 22).toISOString(),
    rawDateExpression: null,
    paymentMethod: null,
    accountOrCard: null,
    confidence: 0.84,
    possibleTransfer: false,
    ...overrides,
  };
}

test('autoriza criação automática quando a interpretação é clara', () => {
  assert.deepEqual(
    decideParseOutcome('Gastei 42 com Uber', createParsed()),
    {
      status: 'created',
      reason: 'Mensagem interpretada com segurança.',
      ambiguities: [],
    }
  );
});

test('exige intervenção para Pix sem contexto de entrada ou saída', () => {
  const decision = decideParseOutcome(
    'Pix 75',
    createParsed({
      description: 'Pagamento via Pix',
      category: 'Outros',
      paymentMethod: 'pix',
      confidence: 0.4,
    })
  );

  assert.notEqual(decision.status, 'created');
  assert.ok(decision.ambiguities.some((item) => item.includes('Pix')));
});

test('ignora transferência explícita entre contas', () => {
  const decision = decideParseOutcome(
    'Transferi 200 para minha conta Inter',
    createParsed({
      description: 'Transferência para minha conta Inter',
      category: 'Transferência',
      accountOrCard: 'inter',
      possibleTransfer: true,
    })
  );

  assert.equal(decision.status, 'ignored_transfer');
});

test('bloqueia conflito entre a mensagem e o tipo interpretado', () => {
  const decision = decideParseOutcome(
    'Recebi 500 de freela',
    createParsed({ type: 'expense', category: 'Trabalho' })
  );

  assert.equal(decision.status, 'unable_to_parse');
  assert.ok(decision.ambiguities.some((item) => item.includes('receita')));
});

test('rejeita resultado ausente', () => {
  assert.equal(decideParseOutcome('mensagem inválida', null).status, 'unable_to_parse');
});
