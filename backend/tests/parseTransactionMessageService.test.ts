import assert from 'node:assert/strict';
import test from 'node:test';
import parseTransactionMessageService from '../src/services/parseTransactionMessageService';
import { decideParseOutcome } from '../src/utils/decideParseOutcome';

test('interpreta uma despesa explícita com categoria de transporte', () => {
  const parsed = parseTransactionMessageService.execute(
    'Gastei 32,50 com Uber'
  );

  assert.ok(parsed);
  assert.equal(parsed.type, 'expense');
  assert.equal(parsed.amount, 32.5);
  assert.equal(parsed.description, 'Uber');
  assert.equal(parsed.category, 'Transporte');
  assert.equal(decideParseOutcome('Gastei 32,50 com Uber', parsed).status, 'created');
});

test('interpreta uma receita explícita de trabalho', () => {
  const parsed = parseTransactionMessageService.execute(
    'Recebi 500 de freela'
  );

  assert.ok(parsed);
  assert.equal(parsed.type, 'income');
  assert.equal(parsed.amount, 500);
  assert.equal(parsed.description, 'Freela');
  assert.equal(parsed.category, 'Trabalho');
});

test('não salva automaticamente um Pix sem direção definida', () => {
  const message = 'Pix 75';
  const parsed = parseTransactionMessageService.execute(message);

  assert.ok(parsed);
  assert.equal(parsed.paymentMethod, 'pix');
  assert.notEqual(decideParseOutcome(message, parsed).status, 'created');
});

test('ignora transferência entre contas e preserva valor com milhar', () => {
  const message = 'Transferi 1.250,50 para minha conta Inter';
  const parsed = parseTransactionMessageService.execute(message);

  assert.ok(parsed);
  assert.equal(parsed.amount, 1250.5);
  assert.equal(parsed.possibleTransfer, true);
  assert.equal(parsed.category, 'Transferência');
  assert.equal(decideParseOutcome(message, parsed).status, 'ignored_transfer');
});

test('retorna nulo quando a mensagem não contém valor', () => {
  assert.equal(
    parseTransactionMessageService.execute('Paguei o almoço'),
    null
  );
});
