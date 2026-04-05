import type { AITransactionOutput } from '../schemas/aiTransactionSchema';

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function hasAny(text: string, items: string[]) {
  return items.some((item) => text.includes(item));
}

function isShortButClearMessage(normalizedMessage: string) {
  return hasAny(normalizedMessage, [
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
  ]);
}

export function detectParseAmbiguities(
  message: string,
  parsed: AITransactionOutput
): string[] {
  const ambiguities: string[] = [];

  const normalizedMessage = normalizeText(message);
  const normalizedDescription = normalizeText(parsed.description);
  const normalizedCategory = normalizeText(parsed.category);
  const normalizedRawDate = normalizeText(parsed.rawDateExpression);
  const confidence = parsed.confidence ?? 0;

  if (!parsed.type) {
    ambiguities.push('Tipo de transação ausente.');
  }

  if (!parsed.amount || parsed.amount <= 0) {
    ambiguities.push('Valor ausente ou inválido.');
  }

  if (!parsed.description || normalizedDescription.length < 2) {
    ambiguities.push('Descrição muito curta ou ausente.');
  }

  if (!parsed.category || normalizedCategory.length < 2) {
    ambiguities.push('Categoria muito curta ou ausente.');
  }

  const genericDescriptions = [
    'pagamento',
    'compra',
    'gasto',
    'recebimento',
    'transferencia',
    'transferência',
    'pix',
    'debito',
    'débito',
    'credito',
    'crédito',
    'dinheiro',
  ];

  if (genericDescriptions.includes(normalizedDescription)) {
    ambiguities.push('Descrição genérica demais.');
  }

  if (normalizedCategory === 'outros') {
    ambiguities.push('Categoria muito genérica.');
  }

  const transferKeywords = [
    'transferi',
    'transferencia',
    'transferência',
    'passei',
    'mandei',
    'enviei',
    'entre contas',
    'minha outra conta',
    'para minha conta',
    'pra minha conta',
  ];

  const hasStrongTransferSignal = transferKeywords.some((keyword) =>
    normalizedMessage.includes(keyword)
  );

  if (parsed.possibleTransfer === true && hasStrongTransferSignal) {
    ambiguities.push('Mensagem pode representar transferência interna.');
  }

  const vagueDatePatterns = [
    'sexta',
    'sabado',
    'domingo',
    'segunda',
    'terca',
    'quarta',
    'quinta',
    'fim de semana',
    'começo do mes',
    'inicio do mes',
    'recentemente',
    'esses dias',
    'semana passada',
  ];

  if (
    normalizedRawDate &&
    vagueDatePatterns.some((pattern) => normalizedRawDate.includes(pattern))
  ) {
    ambiguities.push('Expressão temporal potencialmente ambígua.');
  }

  const wordCount = normalizedMessage.split(/\s+/).filter(Boolean).length;

  if (wordCount <= 2 && !isShortButClearMessage(normalizedMessage)) {
    ambiguities.push('Mensagem curta demais para interpretação totalmente segura.');
  }

  const weakExpenseOrIncomeVerb =
    !hasAny(normalizedMessage, [
      'gastei',
      'paguei',
      'recebi',
      'ganhei',
      'entrou',
      'caiu',
      'comprei',
    ]);

  if (
    normalizedMessage.includes('pix') &&
    weakExpenseOrIncomeVerb &&
    !hasStrongTransferSignal
  ) {
    ambiguities.push('Mensagem ambígua quanto a receita ou despesa.');
  }

  if (confidence < 0.5) {
    ambiguities.push('Confiança baixa da IA.');
  } else if (confidence < 0.72) {
    ambiguities.push('Confiança intermediária da IA.');
  }

  return Array.from(new Set(ambiguities));
}