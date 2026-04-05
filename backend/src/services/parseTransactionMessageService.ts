import type { ParsedTransaction, PaymentMethod, TransactionType } from '../types/parsedTransaction';

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
    'ultima terça',
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

function detectPossibleTransfer(normalized: string, accountOrCard: string | null): boolean {
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

function inferType(normalized: string): { type: TransactionType | null; confidenceBoost: number } {
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
  ];

  const expenseSignals = [
    'gastei',
    'paguei',
    'comprei',
    'pago',
    'gasto',
    'debito',
    'débito',
    'usei',
  ];

  if (incomeSignals.some((signal) => normalized.includes(signal))) {
    return { type: 'income', confidenceBoost: 0.25 };
  }

  if (expenseSignals.some((signal) => normalized.includes(signal))) {
    return { type: 'expense', confidenceBoost: 0.25 };
  }

  if (normalized.includes('pix')) {
    return { type: 'expense', confidenceBoost: 0.05 };
  }

  return { type: null, confidenceBoost: 0 };
}

function cleanupDescription(value: string | null | undefined) {
  const cleaned = (value ?? '')
    .replace(/^[,.\-:\s]+/, '')
    .replace(/^(com|de|do|da|no|na|em|via|pelo|pela|para|pra)\s+/i, '')
    .trim();

  return cleaned;
}

function inferDescription(raw: string, normalized: string, type: TransactionType): string {
  const patterns = [
    /\bgastei\s+\d+(?:[.,]\d{1,2})?\s+(?:com|no|na|em)\s+(.+)$/i,
    /\bpaguei\s+\d+(?:[.,]\d{1,2})?\s+(?:com|no|na|em)?\s*(.+)$/i,
    /\bcomprei\s+\d+(?:[.,]\d{1,2})?\s+(?:de|do|da|com)?\s*(.+)$/i,
    /\brecebi\s+\d+(?:[.,]\d{1,2})?\s+(?:de|do|da|via|pelo|pela)?\s*(.+)$/i,
    /\bganhei\s+\d+(?:[.,]\d{1,2})?\s+(?:de|do|da)?\s*(.+)$/i,
    /\bentrou\s+\d+(?:[.,]\d{1,2})?\s+(?:de|do|da)?\s*(.+)$/i,
    /\bcaiu\s+\d+(?:[.,]\d{1,2})?\s+(?:de|do|da)?\s*(.+)$/i,
    /\bpix\s+\d+(?:[.,]\d{1,2})?\s+(?:de|do|da|com|para|pra|pro)?\s*(.+)$/i,
    /\bcredito\s+\d+(?:[.,]\d{1,2})?\s+(?:de|do|da|com)?\s*(.+)$/i,
    /\bcr[eé]dito\s+\d+(?:[.,]\d{1,2})?\s+(?:de|do|da|com)?\s*(.+)$/i,
    /\bdebito\s+\d+(?:[.,]\d{1,2})?\s+(?:de|do|da|com)?\s*(.+)$/i,
    /\bd[eé]bito\s+\d+(?:[.,]\d{1,2})?\s+(?:de|do|da|com)?\s*(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]?.trim()) {
      const description = cleanupDescription(match[1]);
      if (description) return description;
    }
  }

  if (type === 'income') {
    if (normalized.includes('pix')) return 'Recebimento via Pix';
    return 'Recebimento';
  }

  if (normalized.includes('pix')) return 'Pagamento via Pix';
  return 'Pagamento';
}

function inferCategory(normalized: string, type: TransactionType): string {
  const includesAny = (items: string[]) => items.some((item) => normalized.includes(item));

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

  if (
    includesAny([
      'salario',
      'salário',
      'freela',
      'freelance',
      'reembolso',
      'pagamento recebido',
      'cliente',
      'bonus',
      'bônus',
      'comissao',
      'comissão',
    ])
  ) {
    return 'Trabalho';
  }

  return type === 'income' ? 'Trabalho' : 'Outros';
}

class ParseTransactionMessageService {
  execute(message: string): ParsedTransaction | null {
    const raw = message.trim();
    const normalized = normalizeText(raw);

    const amount = extractAmount(raw);
    if (!amount) return null;

    const { type, confidenceBoost } = inferType(normalized);
    const paymentMethod = detectPaymentMethod(normalized);
    const accountOrCard = detectAccountOrCard(normalized);
    const possibleTransfer = detectPossibleTransfer(normalized, accountOrCard);

    const finalType: TransactionType =
      type ??
      (paymentMethod === 'credit' ||
        paymentMethod === 'debit' ||
        paymentMethod === 'cash'
        ? 'expense'
        : 'expense');

    const description = inferDescription(raw, normalized, finalType);
    const category = inferCategory(normalized, finalType);
    const rawDateExpression = detectRawDateExpression(normalized);

    let confidence = 0.4 + confidenceBoost;

    if (paymentMethod) confidence += 0.08;
    if (accountOrCard) confidence += 0.04;
    if (category !== 'Outros') confidence += 0.12;
    if (
      description !== 'Pagamento' &&
      description !== 'Recebimento' &&
      description !== 'Pagamento via Pix' &&
      description !== 'Recebimento via Pix'
    ) {
      confidence += 0.08;
    }

    if (possibleTransfer) confidence -= 0.12;

    if (
      normalized.includes('pix') &&
      !normalized.includes('recebi') &&
      !normalized.includes('ganhei') &&
      !normalized.includes('gastei') &&
      !normalized.includes('paguei')
    ) {
      confidence -= 0.08;
    }

    confidence = Math.max(0.2, Math.min(0.92, confidence));

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