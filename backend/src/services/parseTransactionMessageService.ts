import type {
  ParsedTransaction,
  PaymentMethod,
  TransactionType,
} from '../types/parsedTransaction';

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function extractAmount(raw: string): number | null {
  const matches = raw.match(/\d+(?:[.,]\d{1,2})?/g);

  if (!matches?.length) return null;

  const value = Number(matches[0].replace(',', '.'));

  if (Number.isNaN(value) || value <= 0) return null;

  return value;
}

function detectRawDateExpression(normalized: string): string | null {
  const expressions = [
    'hoje',
    'ontem',
    'anteontem',
    'domingo',
    'segunda',
    'segunda-feira',
    'terca',
    'terça',
    'terça-feira',
    'quarta',
    'quarta-feira',
    'quinta',
    'quinta-feira',
    'sexta',
    'sexta-feira',
    'sabado',
    'sábado',
    'ultima segunda',
    'última segunda',
    'ultima terca',
    'última terça',
    'ultima quarta',
    'última quarta',
    'ultima quinta',
    'última quinta',
    'ultima sexta',
    'última sexta',
    'ultimo domingo',
    'último domingo',
    'ultimo sabado',
    'último sábado',
  ];

  const found = expressions.find((item) => normalized.includes(item));
  return found ?? null;
}

function detectPaymentMethod(normalized: string): PaymentMethod {
  if (
    normalized.includes('pix') ||
    normalized.includes('via pix') ||
    normalized.includes('pelo pix') ||
    normalized.includes('pela chave pix')
  ) {
    return 'pix';
  }

  if (
    normalized.includes('credito') ||
    normalized.includes('crédito') ||
    normalized.includes('no credito') ||
    normalized.includes('no crédito') ||
    normalized.includes('cartao de credito') ||
    normalized.includes('cartão de crédito')
  ) {
    return 'credit';
  }

  if (
    normalized.includes('debito') ||
    normalized.includes('débito') ||
    normalized.includes('no debito') ||
    normalized.includes('no débito') ||
    normalized.includes('cartao de debito') ||
    normalized.includes('cartão de débito')
  ) {
    return 'debit';
  }

  if (
    normalized.includes('dinheiro') ||
    normalized.includes('em especie') ||
    normalized.includes('em espécie')
  ) {
    return 'cash';
  }

  return null;
}

function detectAccountOrCard(normalized: string): string | null {
  const known = [
    'nubank',
    'inter',
    'picpay',
    'caixa',
    'itau',
    'itaú',
    'bradesco',
    'santander',
    'bb',
    'banco do brasil',
    'mercado pago',
    'mercadopago',
    'next',
    'c6',
    'neon',
    'wise',
    'paypal',
  ];

  for (const item of known) {
    if (normalized.includes(normalizeText(item))) {
      if (item === 'mercadopago') return 'mercado pago';
      if (item === 'itaú') return 'itau';
      if (item === 'bb') return 'banco do brasil';
      return item;
    }
  }

  if (normalized.includes('cartao') || normalized.includes('cartão')) {
    return 'cartão';
  }

  if (normalized.includes('conta')) {
    return 'conta';
  }

  return null;
}

function hasAny(normalized: string, items: string[]) {
  return items.some((item) => normalized.includes(item));
}

function inferType(
  normalized: string,
  paymentMethod: PaymentMethod,
  accountOrCard: string | null
): { type: TransactionType | null; confidenceBoost: number } {
  const incomeSignals = [
    'recebi',
    'ganhei',
    'entrou',
    'entrada',
    'caiu',
    'me pagaram',
    'depositaram',
    'reembolso',
    'salario',
    'salário',
    'freela',
    'freelance',
    'bonus',
    'bônus',
    'comissao',
    'comissão',
    'pagamento recebido',
  ];

  const expenseSignals = [
    'gastei',
    'paguei',
    'comprei',
    'gasto',
    'pago',
    'usei',
    'debito',
    'débito',
    'fatura',
    'boleto',
  ];

  if (hasAny(normalized, incomeSignals)) {
    return { type: 'income', confidenceBoost: 0.28 };
  }

  if (hasAny(normalized, expenseSignals)) {
    return { type: 'expense', confidenceBoost: 0.28 };
  }

  if (
    hasAny(normalized, [
      'uber',
      '99',
      'ifood',
      'mercado',
      'farmacia',
      'farmácia',
      'aluguel',
      'gasolina',
      'cinema',
      'restaurante',
      'lanche',
      'compra',
      'compras',
    ])
  ) {
    return { type: 'expense', confidenceBoost: 0.18 };
  }

  if (
    hasAny(normalized, [
      'salario',
      'salário',
      'freela',
      'freelance',
      'reembolso',
      'bonus',
      'bônus',
      'comissao',
      'comissão',
    ])
  ) {
    return { type: 'income', confidenceBoost: 0.2 };
  }

  if (paymentMethod === 'credit' || paymentMethod === 'debit' || paymentMethod === 'cash') {
    return { type: 'expense', confidenceBoost: 0.12 };
  }

  if (paymentMethod === 'pix') {
    if (
      hasAny(normalized, [
        'de cliente',
        'do cliente',
        'da cliente',
        'de freela',
        'de salario',
        'de salário',
        'recebido',
      ])
    ) {
      return { type: 'income', confidenceBoost: 0.14 };
    }

    return { type: null, confidenceBoost: 0.02 };
  }

  if (accountOrCard) {
    return { type: 'expense', confidenceBoost: 0.06 };
  }

  return { type: null, confidenceBoost: 0 };
}

function detectPossibleTransfer(
  normalized: string,
  accountOrCard: string | null
): boolean {
  const strongTransferSignals = [
    'transferi',
    'transferencia',
    'transferência',
    'enviei',
    'mandei',
    'passei',
    'joguei',
    'entre contas',
    'minha outra conta',
    'para minha conta',
    'pra minha conta',
    'da minha conta',
    'de uma conta para outra',
  ];

  if (strongTransferSignals.some((signal) => normalized.includes(signal))) {
    return true;
  }

  const hasDirection =
    normalized.includes(' pro ') ||
    normalized.includes(' pra ') ||
    normalized.includes(' para ');

  const knownFinancialTargets = [
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
  ];

  const mentionsKnownTarget =
    (accountOrCard && knownFinancialTargets.includes(accountOrCard)) ||
    knownFinancialTargets.some((target) => normalized.includes(target));

  const hasExplicitTransferVerb =
    normalized.includes('transferi') ||
    normalized.includes('enviei') ||
    normalized.includes('mandei') ||
    normalized.includes('passei');

  if (hasExplicitTransferVerb && hasDirection && mentionsKnownTarget) {
    return true;
  }

  return false;
}

function cleanupDescription(value: string | null | undefined) {
  return (value ?? '')
    .replace(/^[,.\-:\s]+/, '')
    .replace(/[,.\-:\s]+$/, '')
    .replace(/^(com|de|do|da|no|na|em|via|pelo|pela|para|pra|pro)\s+/i, '')
    .trim();
}

function removeNoiseFromShortMessage(normalized: string) {
  return normalized
    .replace(/\d+(?:[.,]\d{1,2})?/g, ' ')
    .replace(
      /\b(hoje|ontem|anteontem|domingo|segunda|segunda-feira|terca|terça|terça-feira|quarta|quarta-feira|quinta|quinta-feira|sexta|sexta-feira|sabado|sábado)\b/g,
      ' '
    )
    .replace(
      /\b(gastei|paguei|comprei|recebi|ganhei|entrou|entrada|caiu|pix|credito|crédito|debito|débito|dinheiro|via|com|de|do|da|no|na|em|para|pra|pro|pelo|pela)\b/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function inferDescription(
  raw: string,
  normalized: string,
  type: TransactionType,
  possibleTransfer: boolean
): string {
  if (possibleTransfer) {
    const targetMatch = raw.match(
      /\b(?:pro|pra|para)\s+(.+)$/i
    );

    const target = cleanupDescription(targetMatch?.[1]);
    if (target) {
      return `Transferência para ${target}`;
    }

    return 'Transferência entre contas';
  }

  const patterns = [
    /\bgastei\s+\d+(?:[.,]\d{1,2})?\s+(?:com|no|na|em)\s+(.+)$/i,
    /\bpaguei\s+\d+(?:[.,]\d{1,2})?\s+(?:com|no|na|em)?\s*(.+)$/i,
    /\bcomprei\s+\d+(?:[.,]\d{1,2})?\s+(?:de|do|da|com)?\s*(.+)$/i,
    /\brecebi\s+\d+(?:[.,]\d{1,2})?\s+(?:de|do|da|via|pelo|pela)?\s*(.+)$/i,
    /\bganhei\s+\d+(?:[.,]\d{1,2})?\s+(?:de|do|da)?\s*(.+)$/i,
    /\bentrou\s+\d+(?:[.,]\d{1,2})?\s+(?:de|do|da)?\s*(.+)$/i,
    /\bcaiu\s+\d+(?:[.,]\d{1,2})?\s+(?:de|do|da)?\s*(.+)$/i,
    /\bsalario\s+\d+(?:[.,]\d{1,2})?\s*(.*)$/i,
    /\bsal[aá]rio\s+\d+(?:[.,]\d{1,2})?\s*(.*)$/i,
    /\bfreela\s+\d+(?:[.,]\d{1,2})?\s*(.*)$/i,
    /\bpix\s+\d+(?:[.,]\d{1,2})?\s+(?:de|do|da|com|para|pra|pro)?\s*(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]?.trim()) {
      const description = cleanupDescription(match[1]);
      if (description) return capitalizeDescription(description);
    }
  }

  const shortMessageDescription = cleanupDescription(
    removeNoiseFromShortMessage(normalized)
  );

  if (shortMessageDescription) {
    return capitalizeDescription(shortMessageDescription);
  }

  if (type === 'income') {
    if (normalized.includes('pix')) return 'Recebimento via Pix';
    if (normalized.includes('salario') || normalized.includes('salário')) {
      return 'Salário';
    }
    if (normalized.includes('freela') || normalized.includes('freelance')) {
      return 'Freela';
    }
    return 'Recebimento';
  }

  if (normalized.includes('pix')) return 'Pagamento via Pix';
  return 'Pagamento';
}

function capitalizeDescription(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function inferCategory(
  normalized: string,
  description: string,
  type: TransactionType,
  possibleTransfer: boolean
): string {
  if (possibleTransfer) return 'Transferência';

  const text = `${normalized} ${normalizeText(description)}`;

  const includesAny = (items: string[]) => items.some((item) => text.includes(item));

  if (
    includesAny([
      'uber',
      '99',
      'taxi',
      'táxi',
      'gasolina',
      'combustivel',
      'combustível',
      'onibus',
      'ônibus',
      'metro',
      'metrô',
      'passagem',
      'corrida',
      'estacionamento',
      'moto',
    ])
  ) {
    return 'Transporte';
  }

  if (
    includesAny([
      'almoco',
      'almoço',
      'janta',
      'lanche',
      'ifood',
      'pizza',
      'mercado',
      'supermercado',
      'padaria',
      'restaurante',
      'comida',
      'cafe',
      'café',
      'delivery',
      'mcdonalds',
      'burger king',
      'subway',
    ])
  ) {
    return 'Alimentação';
  }

  if (
    includesAny([
      'aluguel',
      'condominio',
      'condomínio',
      'energia',
      'luz',
      'agua',
      'água',
      'internet',
      'gas',
      'gás',
      'iptu',
    ])
  ) {
    return 'Moradia';
  }

  if (
    includesAny([
      'farmacia',
      'farmácia',
      'medico',
      'médico',
      'consulta',
      'remedio',
      'remédio',
      'hospital',
      'plano de saude',
      'plano de saúde',
    ])
  ) {
    return 'Saúde';
  }

  if (
    includesAny([
      'cinema',
      'netflix',
      'spotify',
      'viagem',
      'bar',
      'show',
      'role',
      'rolê',
      'balada',
      'jogo',
      'game',
    ])
  ) {
    return 'Lazer';
  }

  if (
    includesAny([
      'curso',
      'faculdade',
      'livro',
      'software',
      'ferramenta',
      'projeto',
      'cliente',
      'estagio',
      'estágio',
      'freela',
      'freelance',
      'salario',
      'salário',
      'reembolso',
      'bonus',
      'bônus',
      'comissao',
      'comissão',
    ])
  ) {
    return 'Trabalho';
  }

  if (
    includesAny([
      'roupa',
      'shein',
      'amazon',
      'compra',
      'compras',
      'loja',
      'tenis',
      'tênis',
      'sapato',
    ])
  ) {
    return 'Compras';
  }

  return type === 'income' ? 'Trabalho' : 'Outros';
}

function inferConfidence(params: {
  normalized: string;
  typeWasExplicit: boolean;
  paymentMethod: PaymentMethod;
  accountOrCard: string | null;
  category: string;
  description: string;
  possibleTransfer: boolean;
  rawDateExpression: string | null;
}) {
  const {
    normalized,
    typeWasExplicit,
    paymentMethod,
    accountOrCard,
    category,
    description,
    possibleTransfer,
    rawDateExpression,
  } = params;

  let confidence = 0.42;

  if (typeWasExplicit) confidence += 0.22;
  if (paymentMethod) confidence += 0.08;
  if (accountOrCard) confidence += 0.04;
  if (category !== 'Outros') confidence += 0.12;
  if (category === 'Transferência') confidence += 0.08;
  if (rawDateExpression) confidence += 0.04;

  if (
    ![
      'Pagamento',
      'Recebimento',
      'Pagamento via Pix',
      'Recebimento via Pix',
    ].includes(description)
  ) {
    confidence += 0.08;
  }

  if (
    normalized.includes('pix') &&
    !hasAny(normalized, ['recebi', 'ganhei', 'gastei', 'paguei']) &&
    !possibleTransfer
  ) {
    confidence -= 0.1;
  }

  if (possibleTransfer) {
    confidence -= 0.06;
  }

  return Math.max(0.2, Math.min(0.94, confidence));
}

class ParseTransactionMessageService {
  execute(message: string): ParsedTransaction | null {
    const raw = message.trim();
    const normalized = normalizeText(raw);

    const amount = extractAmount(raw);
    if (!amount) return null;

    const paymentMethod = detectPaymentMethod(normalized);
    const accountOrCard = detectAccountOrCard(normalized);
    const possibleTransfer = detectPossibleTransfer(normalized, accountOrCard);
    const rawDateExpression = detectRawDateExpression(normalized);

    const inferredType = inferType(normalized, paymentMethod, accountOrCard);

    let finalType: TransactionType;

    if (possibleTransfer) {
      finalType = 'expense';
    } else if (inferredType.type) {
      finalType = inferredType.type;
    } else {
      finalType = 'expense';
    }

    const description = inferDescription(
      raw,
      normalized,
      finalType,
      possibleTransfer
    );

    const category = inferCategory(
      normalized,
      description,
      finalType,
      possibleTransfer
    );

    const confidence = inferConfidence({
      normalized,
      typeWasExplicit: inferredType.type !== null,
      paymentMethod,
      accountOrCard,
      category,
      description,
      possibleTransfer,
      rawDateExpression,
    });

    return {
      type: finalType,
      amount,
      description,
      category,
      transactionAt: new Date().toISOString(),
      rawDateExpression,
      paymentMethod,
      accountOrCard,
      confidence,
      possibleTransfer,
    };
  }
}

export default new ParseTransactionMessageService();