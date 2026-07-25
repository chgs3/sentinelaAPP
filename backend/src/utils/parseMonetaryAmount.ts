const monetaryAmountPattern =
  String.raw`\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?` +
  String.raw`|\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?` +
  String.raw`|\d+(?:[.,]\d{1,2})?`;

export const MONETARY_AMOUNT_PATTERN = `(?:${monetaryAmountPattern})`;

function normalizeNumericValue(value: string) {
  const lastDot = value.lastIndexOf('.');
  const lastComma = value.lastIndexOf(',');

  if (lastDot >= 0 && lastComma >= 0) {
    const decimalSeparator = lastDot > lastComma ? '.' : ',';
    const groupingSeparator = decimalSeparator === '.' ? ',' : '.';

    return value
      .split(groupingSeparator)
      .join('')
      .replace(decimalSeparator, '.');
  }

  const separator = lastDot >= 0 ? '.' : lastComma >= 0 ? ',' : null;

  if (!separator) {
    return value;
  }

  const parts = value.split(separator);
  const isThousandsNotation =
    parts.length > 2 ||
    (parts.length === 2 && parts[1].length === 3);

  return isThousandsNotation
    ? parts.join('')
    : `${parts[0]}.${parts[1]}`;
}

export function parseMonetaryAmount(raw: string): number | null {
  const match = raw.match(new RegExp(MONETARY_AMOUNT_PATTERN));

  if (!match) {
    return null;
  }

  const amount = Number(normalizeNumericValue(match[0]));

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return amount;
}
