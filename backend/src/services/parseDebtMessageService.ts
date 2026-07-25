import {
  MONETARY_AMOUNT_PATTERN,
  parseMonetaryAmount,
} from '../utils/parseMonetaryAmount';

type ParsedDebtMessage = {
  personName: string;
  type: 'to_receive' | 'to_pay';
  amount: number;
  description: string;
};

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function extractAmount(raw: string): number | null {
  return parseMonetaryAmount(raw);
}

function cleanupPersonName(value: string) {
  return value
    .replace(/^[,.\-:\s]+/, '')
    .replace(/[,.\-:\s]+$/, '')
    .replace(/^(o|a|os|as)\s+/i, '')
    .trim();
}

function cleanupDescription(value?: string) {
  const cleaned = (value ?? '')
    .replace(/^[,.\-:\s]+/, '')
    .replace(/[,.\-:\s]+$/, '')
    .replace(/^(do|da|de|para|pra|pro|por|pela|pelo)\s+/i, '')
    .trim();

  return cleaned.length ? cleaned : 'Dívida registrada';
}

function looksLikePurposeWord(value: string) {
  const normalized = normalizeText(value);

  return [
    'aluguel',
    'viagem',
    'almoco',
    'almoço',
    'lanche',
    'pizza',
    'mercado',
    'faculdade',
    'curso',
    'uber',
    'ifood',
    'gasolina',
    'presente',
    'internet',
    'agua',
    'água',
    'energia',
    'condominio',
    'condomínio',
  ].includes(normalized);
}

function splitPersonAndDescription(
  raw: string
): { personName: string; description: string } {
  const trimmed = raw.trim();

  const fullMatch = trimmed.match(/^(.+?)\s+(?:do|da|de)\s+(.+)$/i);

  if (!fullMatch) {
    return {
      personName: cleanupPersonName(trimmed),
      description: 'Dívida registrada',
    };
  }

  const left = cleanupPersonName(fullMatch[1]);
  const right = cleanupDescription(fullMatch[2]);

  if (!left) {
    return {
      personName: '',
      description: right || 'Dívida registrada',
    };
  }

  const leftTokens = left.split(/\s+/).filter(Boolean);
  const rightTokens = right.split(/\s+/).filter(Boolean);
  const firstRightToken = rightTokens[0];

  if (
    leftTokens.length === 1 &&
    firstRightToken &&
    looksLikePurposeWord(firstRightToken)
  ) {
    return {
      personName: left,
      description: right,
    };
  }

  if (leftTokens.length >= 2) {
    return {
      personName: left,
      description: right || 'Dívida registrada',
    };
  }

  return {
    personName: left,
    description: right || 'Dívida registrada',
  };
}

function extractTrailingDescription(value?: string) {
  const cleaned = cleanupDescription(value);
  return cleaned || 'Dívida registrada';
}

class ParseDebtMessageService {
  execute(message: string): ParsedDebtMessage | null {
    const raw = message.trim();
    const normalized = normalizeText(raw);

    const amount = extractAmount(raw);
    if (!amount) return null;

    const receivePatterns: RegExp[] = [
      new RegExp(
        String.raw`^(.+?)\s+me\s+deve\s+${MONETARY_AMOUNT_PATTERN}\s*(.*)$`,
        'i'
      ),
      new RegExp(
        String.raw`^(.+?)\s+esta\s+me\s+devendo\s+${MONETARY_AMOUNT_PATTERN}\s*(.*)$`,
        'i'
      ),
      new RegExp(
        String.raw`^(.+?)\s+está\s+me\s+devendo\s+${MONETARY_AMOUNT_PATTERN}\s*(.*)$`,
        'i'
      ),
      new RegExp(
        String.raw`^(.+?)\s+ta\s+me\s+devendo\s+${MONETARY_AMOUNT_PATTERN}\s*(.*)$`,
        'i'
      ),
      new RegExp(
        String.raw`^(.+?)\s+t[aá]\s+me\s+devendo\s+${MONETARY_AMOUNT_PATTERN}\s*(.*)$`,
        'i'
      ),
      new RegExp(
        String.raw`^(.+?)\s+ficou\s+me\s+devendo\s+${MONETARY_AMOUNT_PATTERN}\s*(.*)$`,
        'i'
      ),
    ];

    for (const regex of receivePatterns) {
      const match = raw.match(regex);

      if (match) {
        const personName = cleanupPersonName(match[1]);
        const description = extractTrailingDescription(match[2]);

        if (!personName) return null;

        return {
          personName,
          type: 'to_receive',
          amount,
          description,
        };
      }
    }

    const payPatterns: RegExp[] = [
      new RegExp(
        String.raw`^devo\s+${MONETARY_AMOUNT_PATTERN}\s+(?:a|ao|para|pra|pro)\s+(.+)$`,
        'i'
      ),
      new RegExp(
        String.raw`^estou\s+devendo\s+${MONETARY_AMOUNT_PATTERN}\s+(?:a|ao|para|pra|pro)\s+(.+)$`,
        'i'
      ),
      new RegExp(
        String.raw`^fiquei\s+devendo\s+${MONETARY_AMOUNT_PATTERN}\s+(?:a|ao|para|pra|pro)\s+(.+)$`,
        'i'
      ),
      new RegExp(
        String.raw`^preciso\s+pagar\s+${MONETARY_AMOUNT_PATTERN}\s+(?:a|ao|para|pra|pro)\s+(.+)$`,
        'i'
      ),
      new RegExp(
        String.raw`^tenho\s+que\s+pagar\s+${MONETARY_AMOUNT_PATTERN}\s+(?:a|ao|para|pra|pro)\s+(.+)$`,
        'i'
      ),
      new RegExp(
        String.raw`^vou\s+pagar\s+${MONETARY_AMOUNT_PATTERN}\s+(?:a|ao|para|pra|pro)\s+(.+)$`,
        'i'
      ),
    ];

    for (const regex of payPatterns) {
      const match = raw.match(regex);

      if (match) {
        const { personName, description } = splitPersonAndDescription(match[1]);

        if (!personName) return null;

        return {
          personName,
          type: 'to_pay',
          amount,
          description,
        };
      }
    }

    if (normalized.includes('me deve')) {
      const parts = raw.split(/me\s+deve/i);

      if (parts.length >= 2) {
        const personName = cleanupPersonName(parts[0]);
        const after = parts[1].trim();

        if (!personName) return null;

        const descMatch = after.match(
          new RegExp(
            String.raw`^${MONETARY_AMOUNT_PATTERN}\s*(.*)$`,
            'i'
          )
        );
        const description = extractTrailingDescription(descMatch?.[1]);

        return {
          personName,
          type: 'to_receive',
          amount,
          description,
        };
      }
    }

    return null;
  }
}

export default new ParseDebtMessageService();
