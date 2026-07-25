import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMonetaryAmount } from '../src/utils/parseMonetaryAmount';

test('interpreta valores inteiros e decimais em português', () => {
  assert.equal(parseMonetaryAmount('Gastei 32,50 no almoço'), 32.5);
  assert.equal(parseMonetaryAmount('Recebi R$ 500'), 500);
  assert.equal(parseMonetaryAmount('Paguei 19.90'), 19.9);
});

test('interpreta separadores de milhar brasileiros e internacionais', () => {
  assert.equal(parseMonetaryAmount('Recebi R$ 1.250,50'), 1250.5);
  assert.equal(parseMonetaryAmount('Recebi 1,250.50'), 1250.5);
  assert.equal(parseMonetaryAmount('Paguei 2.000'), 2000);
});

test('rejeita mensagens sem valor monetário positivo', () => {
  assert.equal(parseMonetaryAmount('Comprei um lanche'), null);
  assert.equal(parseMonetaryAmount('Gastei 0'), null);
});
