import type { ParseDecision } from '../types/parseDecision';
import type { ParsedTransaction } from '../types/parsedTransaction';

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function decideParseOutcome(
  message: string,
  parsed: ParsedTransaction | null
): ParseDecision {
  if (!parsed) {
    return {
      status: 'unable_to_parse',
      reason: 'Não foi possível interpretar a mensagem com segurança.',
      ambiguities: ['Nenhuma movimentação válida foi identificada.'],
    };
  }

  const normalized = normalizeText(message);
  const ambiguities: string[] = [];

  const explicitIncome =
    normalized.includes('recebi') ||
    normalized.includes('ganhei') ||
    normalized.includes('entrou') ||
    normalized.includes('entrada') ||
    normalized.includes('caiu') ||
    normalized.includes('me pagaram');

  const explicitExpense =
    normalized.includes('gastei') ||
    normalized.includes('paguei') ||
    normalized.includes('comprei') ||
    normalized.includes('gasto') ||
    normalized.includes('pago') ||
    normalized.includes('usei');

  const explicitTransfer =
    normalized.includes('transferi') ||
    normalized.includes('transferencia') ||
    normalized.includes('transferência') ||
    normalized.includes('enviei') ||
    normalized.includes('mandei') ||
    normalized.includes('passei') ||
    normalized.includes('entre contas') ||
    normalized.includes('minha outra conta');

  if (parsed.possibleTransfer || explicitTransfer) {
    return {
      status: 'ignored_transfer',
      reason:
        'A mensagem parece representar uma transferência entre contas, então não foi registrada como receita nem despesa.',
      ambiguities: [],
    };
  }

  if (!explicitIncome && !explicitExpense && normalized.includes('pix')) {
    ambiguities.push('Mensagem com Pix, mas sem contexto claro de entrada ou saída.');
  }

  if (parsed.category === 'Outros') {
    ambiguities.push('Categoria muito genérica.');
  }

  if (
    parsed.description === 'Pagamento' ||
    parsed.description === 'Recebimento' ||
    parsed.description === 'Pagamento via Pix' ||
    parsed.description === 'Recebimento via Pix'
  ) {
    ambiguities.push('Descrição pouco específica.');
  }

  if (explicitIncome && parsed.type !== 'income') {
    ambiguities.push('A mensagem parece receita, mas a classificação ficou diferente.');
  }

  if (explicitExpense && parsed.type !== 'expense') {
    ambiguities.push('A mensagem parece despesa, mas a classificação ficou diferente.');
  }

  if (parsed.confidence < 0.45) {
    ambiguities.push('Confiança baixa da interpretação.');
  }

  if (parsed.confidence < 0.45) {
    return {
      status: 'unable_to_parse',
      reason: 'Não foi possível interpretar a mensagem com segurança.',
      ambiguities,
    };
  }

  if (ambiguities.length > 0 || parsed.confidence < 0.72) {
    return {
      status: 'needs_confirmation',
      reason: 'A interpretação exige confirmação antes de salvar.',
      ambiguities,
    };
  }

  return {
    status: 'created',
    reason: 'Mensagem interpretada com segurança.',
    ambiguities: [],
  };
}