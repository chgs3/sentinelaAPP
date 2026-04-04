type SettleDebtParseResult = {
  personName: string;
  targetStatus: 'received' | 'paid';
};

function cleanupPersonName(value: string) {
  return value
    .replace(/^[,.\-:\s]+/, '')
    .replace(/[,.\-:\s]+$/, '')
    .replace(/^(o|a|os|as)\s+/i, '')
    .trim();
}

class SettleDebtMessageService {
  execute(message: string): SettleDebtParseResult | null {
    const raw = message.trim();

    const patterns: Array<{
      regex: RegExp;
      personIndex: number;
      targetStatus: 'received' | 'paid';
    }> = [
      { regex: /^(.+?)\s+j[aá]\s+pagou$/i, personIndex: 1, targetStatus: 'received' },
      { regex: /^(.+?)\s+me\s+pagou$/i, personIndex: 1, targetStatus: 'received' },
      { regex: /^(.+?)\s+j[aá]\s+me\s+pagou$/i, personIndex: 1, targetStatus: 'received' },
      { regex: /^(.+?)\s+quitou$/i, personIndex: 1, targetStatus: 'received' },
      { regex: /^(.+?)\s+quitou\s+a\s+d[ií]vida$/i, personIndex: 1, targetStatus: 'received' },

      { regex: /^j[aá]\s+paguei\s+(.+)$/i, personIndex: 1, targetStatus: 'paid' },
      { regex: /^paguei\s+(.+)$/i, personIndex: 1, targetStatus: 'paid' },
      { regex: /^(.+?)\s+recebeu$/i, personIndex: 1, targetStatus: 'paid' },
      { regex: /^(.+?)\s+j[aá]\s+recebeu$/i, personIndex: 1, targetStatus: 'paid' },
    ];

    for (const pattern of patterns) {
      const match = raw.match(pattern.regex);

      if (!match) continue;

      const personName = cleanupPersonName(match[pattern.personIndex]);

      if (!personName) continue;

      return {
        personName,
        targetStatus: pattern.targetStatus,
      };
    }

    return null;
  }
}

export default new SettleDebtMessageService();