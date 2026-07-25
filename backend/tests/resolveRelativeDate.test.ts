import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveRelativeDate } from '../src/utils/resolveRelativeDate';

const referenceDate = new Date(2026, 6, 22, 15, 30);
const fallbackIso = new Date(2026, 5, 10, 12).toISOString();

function toLocalDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

test('resolve hoje, ontem e anteontem com referência determinística', () => {
  assert.equal(
    toLocalDate(resolveRelativeDate('hoje', fallbackIso, referenceDate)),
    '2026-07-22'
  );
  assert.equal(
    toLocalDate(resolveRelativeDate('ontem', fallbackIso, referenceDate)),
    '2026-07-21'
  );
  assert.equal(
    toLocalDate(resolveRelativeDate('anteontem', fallbackIso, referenceDate)),
    '2026-07-20'
  );
});

test('resolve o dia da semana mais recente, nunca o próprio dia', () => {
  assert.equal(
    toLocalDate(resolveRelativeDate('segunda', fallbackIso, referenceDate)),
    '2026-07-20'
  );
  assert.equal(
    toLocalDate(resolveRelativeDate('quarta-feira', fallbackIso, referenceDate)),
    '2026-07-15'
  );
});

test('mantém fallback para expressão desconhecida', () => {
  assert.equal(
    resolveRelativeDate('algum dia', fallbackIso, referenceDate).toISOString(),
    fallbackIso
  );
});

test('usa a data de referência quando o fallback é inválido', () => {
  assert.equal(
    resolveRelativeDate(null, 'inválida', referenceDate).toISOString(),
    referenceDate.toISOString()
  );
});
