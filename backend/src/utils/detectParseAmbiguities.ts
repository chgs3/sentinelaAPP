import type { AITransactionOutput } from '../schemas/aiTransactionSchema';

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
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
    'pix',
    'debito',
    'credito',
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
    'passei',
    'mandei',
    'enviei',
    'pro inter',
    'pro nubank',
    'para o inter',
    'para o nubank',
  ];

  const hasTransferSignal = transferKeywords.some((keyword) =>
    normalizedMessage.includes(keyword)
  );

  if (parsed.possibleTransfer === true || hasTransferSignal) {
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

  if (normalizedMessage.split(/\s+/).filter(Boolean).length <= 2) {
    ambiguities.push('Mensagem curta demais para interpretação segura.');
  }

  const ambiguousMoneyPatterns = ['pix', 'joao', 'mae', 'pai', 'mãe'];

  const hasAmbiguousMoneyPattern = ambiguousMoneyPatterns.some((pattern) =>
    normalizedMessage.includes(pattern)
  );

  const weakExpenseOrIncomeVerb =
    !normalizedMessage.includes('gastei') &&
    !normalizedMessage.includes('paguei') &&
    !normalizedMessage.includes('recebi') &&
    !normalizedMessage.includes('ganhei');

  if (hasAmbiguousMoneyPattern && weakExpenseOrIncomeVerb) {
    ambiguities.push('Mensagem ambígua quanto a receita ou despesa.');
  }

  if (confidence < 0.6) {
    ambiguities.push('Confiança baixa da IA.');
  } else if (confidence < 0.85) {
    ambiguities.push('Confiança intermediária da IA.');
  }

  return Array.from(new Set(ambiguities));
}