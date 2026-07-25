import assert from 'node:assert/strict';
import test from 'node:test';
import parseDebtMessageService from '../src/services/parseDebtMessageService';
import settleDebtMessageService from '../src/services/settleDebtMessageService';

test('interpreta dívida que outra pessoa deve ao usuário', () => {
  assert.deepEqual(
    parseDebtMessageService.execute('João me deve 50 do almoço'),
    {
      personName: 'João',
      type: 'to_receive',
      amount: 50,
      description: 'almoço',
    }
  );
});

test('interpreta dívida que o usuário deve a outra pessoa', () => {
  assert.deepEqual(
    parseDebtMessageService.execute('Devo 80 ao Carlos da internet'),
    {
      personName: 'Carlos',
      type: 'to_pay',
      amount: 80,
      description: 'internet',
    }
  );
});

test('preserva valor com separador de milhar em dívida', () => {
  const parsed = parseDebtMessageService.execute(
    'Ana me deve 1.250,50 do aluguel'
  );

  assert.ok(parsed);
  assert.equal(parsed.amount, 1250.5);
  assert.equal(parsed.personName, 'Ana');
});

test('interpreta mensagens de quitação nos dois sentidos', () => {
  assert.deepEqual(settleDebtMessageService.execute('João já pagou'), {
    personName: 'João',
    targetStatus: 'received',
  });
  assert.deepEqual(settleDebtMessageService.execute('Paguei Maria'), {
    personName: 'Maria',
    targetStatus: 'paid',
  });
});

test('rejeita uma mensagem de dívida sem valor', () => {
  assert.equal(parseDebtMessageService.execute('João me deve o almoço'), null);
});
