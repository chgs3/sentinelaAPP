function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function toStartOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getMostRecentWeekday(referenceDate: Date, targetDay: number) {
  const base = toStartOfDay(referenceDate);
  const currentDay = base.getDay();

  let diff = currentDay - targetDay;

  if (diff < 0) {
    diff += 7;
  }

  if (diff === 0) {
    diff = 7;
  }

  base.setDate(base.getDate() - diff);
  return base;
}

export function resolveRelativeDate(
  rawDateExpression: string | null | undefined,
  fallbackIso: string,
  referenceDate = new Date()
): Date {
  const fallbackDate = new Date(fallbackIso);
  const now = new Date(referenceDate);

  if (!rawDateExpression || !rawDateExpression.trim()) {
    return Number.isNaN(fallbackDate.getTime()) ? now : fallbackDate;
  }

  const normalized = normalizeText(rawDateExpression);

  if (normalized === 'hoje') {
    return toStartOfDay(now);
  }

  if (normalized === 'ontem') {
    const result = toStartOfDay(now);
    result.setDate(result.getDate() - 1);
    return result;
  }

  if (normalized === 'anteontem') {
    const result = toStartOfDay(now);
    result.setDate(result.getDate() - 2);
    return result;
  }

  const weekdayMap: Record<string, number> = {
    domingo: 0,
    segunda: 1,
    'segunda feira': 1,
    terca: 2,
    'terca feira': 2,
    quarta: 3,
    'quarta feira': 3,
    quinta: 4,
    'quinta feira': 4,
    sexta: 5,
    'sexta feira': 5,
    sabado: 6,
  };

  const patterns: Array<{ regex: RegExp; weekday: number }> = [
    { regex: /\bultima?\s+segunda(?:\s+feira)?\b/, weekday: 1 },
    { regex: /\bultima?\s+terca(?:\s+feira)?\b/, weekday: 2 },
    { regex: /\bultima?\s+quarta(?:\s+feira)?\b/, weekday: 3 },
    { regex: /\bultima?\s+quinta(?:\s+feira)?\b/, weekday: 4 },
    { regex: /\bultima?\s+sexta(?:\s+feira)?\b/, weekday: 5 },
    { regex: /\bultimo\s+sabado\b/, weekday: 6 },
    { regex: /\bultimo\s+domingo\b/, weekday: 0 },
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(normalized)) {
      return getMostRecentWeekday(now, pattern.weekday);
    }
  }

  for (const [label, weekday] of Object.entries(weekdayMap)) {
    const regex = new RegExp(`\\b${label}\\b`);
    if (regex.test(normalized)) {
      return getMostRecentWeekday(now, weekday);
    }
  }

  return Number.isNaN(fallbackDate.getTime()) ? now : fallbackDate;
}
