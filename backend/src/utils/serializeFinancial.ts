type FinancialRecord = Record<string, unknown>;

export function toMoneyNumber(value: unknown): number {
  const normalized =
    typeof value === 'object' &&
    value !== null &&
    'toNumber' in value &&
    typeof value.toNumber === 'function'
      ? value.toNumber()
      : Number(value);

  if (!Number.isFinite(normalized)) {
    throw new Error('Valor monetário inválido retornado pela persistência.');
  }

  return normalized;
}

export function toMoneyCents(value: unknown): number {
  return Math.round(toMoneyNumber(value) * 100);
}

export function fromMoneyCents(value: number): number {
  return value / 100;
}

export function sumMoney(values: unknown[]): number {
  return fromMoneyCents(
    values.reduce<number>(
      (total, value) => total + toMoneyCents(value),
      0
    )
  );
}

export function addMoney(left: unknown, right: unknown): number {
  return fromMoneyCents(toMoneyCents(left) + toMoneyCents(right));
}

export function subtractMoney(left: unknown, right: unknown): number {
  return fromMoneyCents(toMoneyCents(left) - toMoneyCents(right));
}

export function serializeMoneyFields<T extends FinancialRecord>(
  record: T,
  fields: readonly string[]
): T {
  const serialized: FinancialRecord = { ...record };

  for (const field of fields) {
    if (serialized[field] !== undefined && serialized[field] !== null) {
      serialized[field] = toMoneyNumber(serialized[field]);
    }
  }

  return serialized as T;
}

export function serializeTransaction<T extends FinancialRecord>(record: T): T {
  return serializeMoneyFields(record, ['amount']);
}

export function serializeDebt<T extends FinancialRecord>(record: T): T {
  return serializeMoneyFields(record, ['amount']);
}

export function serializeMonthlyClosure<T extends FinancialRecord>(
  record: T
): T {
  return serializeMoneyFields(record, [
    'totalIncomes',
    'totalExpenses',
    'balance',
  ]);
}
