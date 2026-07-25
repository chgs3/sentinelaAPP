import assert from 'node:assert/strict';
import test from 'node:test';
import {
  serializeMonthlyClosure,
  subtractMoney,
  sumMoney,
  serializeTransaction,
  toMoneyNumber,
} from '../src/utils/serializeFinancial';

test('converte Decimal para número no contrato HTTP', () => {
  const decimal = {
    toNumber: () => 32.5,
  };

  assert.equal(toMoneyNumber(decimal), 32.5);
  assert.deepEqual(
    serializeTransaction({
      id: 1,
      amount: decimal,
      description: 'Uber',
    }),
    {
      id: 1,
      amount: 32.5,
      description: 'Uber',
    }
  );
});

test('normaliza todos os totais de um fechamento mensal', () => {
  const closure = serializeMonthlyClosure({
    totalIncomes: '500.00',
    totalExpenses: '32.50',
    balance: '467.50',
  });

  assert.deepEqual(closure, {
    totalIncomes: 500,
    totalExpenses: 32.5,
    balance: 467.5,
  });
});

test('rejeita valor monetário não finito', () => {
  assert.throws(() => toMoneyNumber('valor-inválido'), /monetário inválido/);
});

test('soma em centavos sem acumular imprecisão binária', () => {
  assert.equal(sumMoney([0.1, 0.2]), 0.3);
  assert.equal(sumMoney(['1.10', { toNumber: () => 2.25 }]), 3.35);
  assert.equal(subtractMoney(0.3, 0.1), 0.2);
});
