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

function hasAny(text: string, items: string[]) {
  return items.some((item) => text.includes(item));
}

function isGenericDescription(description: string) {
  const normalized = normalizeText(description);

  return [
    'pagamento',
    'recebimento',
    'pagamento via pix',
    'recebimento via pix',
    'transferencia entre contas',
    'transferência entre contas',
  ].includes(normalized);
}

function isShortButClearMessage(normalized: string) {
  const strongCategoryShortcuts = [
    'uber',
    '99',
    'ifood',
    'mercado',
    'farmacia',
    'farmácia',
    'salario',
    'salário',
    'freela',
    'gasolina',
    'aluguel',
  ];

  return strongCategoryShortcuts.some((item) => normalized.includes(item));
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
  const criticalAmbiguities: string[] = [];

  const explicitIncome = hasAny(normalized, [
    'recebi',
    'ganhei',
    'entrou',
    'entrada',
    'caiu',
    'me pagaram',
    'depositaram',
    'salario',
    'salário',
    'freela',
    'freelance',
    'reembolso',
  ]);

  const explicitExpense = hasAny(normalized, [
    'gastei',
    'paguei',
    'comprei',
    'gasto',
    'pago',
    'usei',
    'fatura',
    'boleto',
  ]);

  const explicitTransfer = hasAny(normalized, [
    'transferi',
    'transferencia',
    'transferência',
    'enviei',
    'mandei',
    'passei',
    'entre contas',
    'minha outra conta',
    'para minha conta',
    'pra minha conta',
    'de uma conta para outra',
  ]);

  const weakPixMessage =
    normalized.includes('pix') && !explicitIncome && !explicitExpense && !explicitTransfer;

  const reallyLooksLikeTransfer =
    explicitTransfer ||
    (parsed.possibleTransfer &&
      hasAny(normalized, ['pro ', 'pra ', 'para ']) &&
      hasAny(normalized, [
        'nubank',
        'inter',
        'picpay',
        'caixa',
        'itau',
        'itaú',
        'bradesco',
        'santander',
        'banco do brasil',
        'mercado pago',
        'next',
        'c6',
        'neon',
        'wise',
        'paypal',
      ]));

  if (reallyLooksLikeTransfer) {
    return {
      status: 'ignored_transfer',
      reason:
        'A mensagem parece representar uma transferência entre contas, então não foi registrada como receita nem despesa.',
      ambiguities: [],
    };
  }

  if (weakPixMessage) {
    ambiguities.push('Mensagem com Pix, mas sem contexto claro de entrada ou saída.');
  }

  if (parsed.category === 'Outros') {
    ambiguities.push('Categoria muito genérica.');
  }

  if (isGenericDescription(parsed.description)) {
    ambiguities.push('Descrição pouco específica.');
  }

  if (explicitIncome && parsed.type !== 'income') {
    criticalAmbiguities.push(
      'A mensagem parece receita, mas a classificação ficou diferente.'
    );
  }

  if (explicitExpense && parsed.type !== 'expense') {
    criticalAmbiguities.push(
      'A mensagem parece despesa, mas a classificação ficou diferente.'
    );
  }

  if (!explicitIncome && !explicitExpense && !weakPixMessage) {
    if (
      normalized.split(/\s+/).filter(Boolean).length <= 2 &&
      !isShortButClearMessage(normalized)
    ) {
      ambiguities.push('Mensagem curta demais para interpretação totalmente segura.');
    }
  }

  if (parsed.confidence < 0.4) {
    criticalAmbiguities.push('Confiança muito baixa da interpretação.');
  } else if (parsed.confidence < 0.58) {
    ambiguities.push('Confiança baixa da interpretação.');
  }

  const allAmbiguities = [...criticalAmbiguities, ...ambiguities];

  if (criticalAmbiguities.length > 0) {
    return {
      status: 'unable_to_parse',
      reason: 'Não foi possível interpretar a mensagem com segurança.',
      ambiguities: allAmbiguities,
    };
  }

  if (parsed.confidence < 0.5 && !isShortButClearMessage(normalized)) {
    return {
      status: 'unable_to_parse',
      reason: 'Não foi possível interpretar a mensagem com segurança.',
      ambiguities: allAmbiguities.length
        ? allAmbiguities
        : ['Confiança insuficiente para salvar automaticamente.'],
    };
  }

  if (allAmbiguities.length > 0 || parsed.confidence < 0.74) {
    return {
      status: 'needs_confirmation',
      reason: 'A interpretação exige confirmação antes de salvar.',
      ambiguities: allAmbiguities,
    };
  }

  return {
    status: 'created',
    reason: 'Mensagem interpretada com segurança.',
    ambiguities: [],
  };
}