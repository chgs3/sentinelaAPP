type TransactionType = 'expense' | 'income';

type ParsedTransaction = {
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  transactionAt: Date;
  paymentMethod?: string | null;
  accountOrCard?: string | null;
};

class ParseTransactionMessageService {
  execute(message: string): ParsedTransaction | null {
    const normalizedMessage = this.normalizeMessage(message);

    const amount = this.extractAmount(normalizedMessage);
    if (amount === null) return null;

    const type = this.detectType(normalizedMessage);
    const transactionAt = this.detectTransactionDate(normalizedMessage);
    const paymentMethod = this.detectPaymentMethod(normalizedMessage);
    const accountOrCard = this.detectAccountOrCard(normalizedMessage);

    const extractedDescription = this.extractDescription(normalizedMessage);
    const description = this.buildFallbackDescription(
      extractedDescription,
      type,
      paymentMethod,
      accountOrCard
    );

    const category = this.detectCategory(description);

    return {
      type,
      amount,
      description,
      category,
      transactionAt,
      paymentMethod,
      accountOrCard,
    };
  }

  private normalizeMessage(message: string): string {
    return message.trim().toLowerCase();
  }

  private extractAmount(message: string): number | null {
    const match = message.match(/(\d+[.,]?\d{0,2})/);

    if (!match) return null;

    const normalizedValue = match[1].replace(',', '.');
    const amount = Number(normalizedValue);

    if (Number.isNaN(amount)) return null;

    return amount;
  }

  private detectType(message: string): TransactionType {
    const incomeKeywords = ['recebi', 'ganhei', 'entrada', 'entrou'];

    if (incomeKeywords.some((word) => message.includes(word))) {
      return 'income';
    }

    return 'expense';
  }

  private detectTransactionDate(message: string): Date {
    const now = new Date();

    if (message.includes('ontem')) {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return yesterday;
    }

    const weekDays: Record<string, number> = {
      domingo: 0,
      segunda: 1,
      'segunda-feira': 1,
      terca: 2,
      'terça': 2,
      'terça-feira': 2,
      quarta: 3,
      'quarta-feira': 3,
      quinta: 4,
      'quinta-feira': 4,
      sexta: 5,
      'sexta-feira': 5,
      sabado: 6,
      sábado: 6,
    };

    const matchedDay = Object.keys(weekDays).find((day) => message.includes(day));

    if (!matchedDay) {
      return now;
    }

    const targetDay = weekDays[matchedDay];
    const currentDay = now.getDay();

    let diff = currentDay - targetDay;

    if (diff < 0) {
      diff += 7;
    }

    if (diff === 0) {
      diff = 7;
    }

    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() - diff);

    return targetDate;
  }

  private extractDescription(message: string): string {
    const cleanedMessage = message
      .replace(/gastei|paguei|comprei|recebi|ganhei|entrada|entrou/gi, '')
      .replace(/(\d+[.,]?\d{0,2})/g, '')
      .replace(/\b(com|de|do|da|no|na|em|via)\b/gi, '')
      .replace(
        /\b(hoje|ontem|domingo|segunda|segunda-feira|terca|terça|terça-feira|quarta|quarta-feira|quinta|quinta-feira|sexta|sexta-feira|sabado|sábado)\b/gi,
        ''
      )
      .replace(/\b(crédito|credito|débito|debito|pix|dinheiro)\b/gi, '')
      .replace(
        /\b(nubank|inter|picpay|caixa|itau|itaú|bradesco|santander|bb|banco do brasil)\b/gi,
        ''
      )
      .replace(/\s+/g, ' ')
      .trim();

    return cleanedMessage;
  }

  private buildFallbackDescription(
    description: string,
    type: TransactionType,
    paymentMethod: string | null,
    accountOrCard: string | null
  ): string {
    if (description.trim()) {
      return description;
    }

    if (type === 'income') {
      if (paymentMethod === 'pix') return 'entrada pix';
      if (accountOrCard) return `entrada ${accountOrCard}`;
      return 'entrada';
    }

    if (paymentMethod === 'pix') return 'gasto pix';
    if (accountOrCard) return `gasto ${accountOrCard}`;
    return 'gasto';
  }

  private detectCategory(description: string): string {
    const rules: Record<string, string[]> = {
      Transporte: ['uber', '99', 'taxi', 'gasolina', 'ônibus', 'onibus', 'metrô', 'metro', 'moto'],
      Alimentação: ['ifood', 'comida', 'lanche', 'restaurante', 'mercado', 'café', 'cafe', 'delivery', 'mcdonalds', 'burger king', 'subway', 'mc donalds', 'mc'],
      Moradia: ['aluguel', 'energia', 'água', 'agua', 'internet', 'condomínio', 'condominio', 'luz', 'gás', 'gas'],
      Saúde: ['farmácia', 'farmacia', 'médico', 'medico', 'consulta', 'remédio', 'remedio'],
      Lazer: ['cinema', 'netflix', 'spotify', 'viagem', 'bar', 'show', 'role', 'balada'],
      Trabalho: ['freela', 'freelance', 'curso', 'faculdade', 'livro', 'software', 'ferramenta', 'projeto', 'cliente', 'estagio', 'estágio', 'salário', 'salario', 'recebimento'],
    };

    for (const [category, keywords] of Object.entries(rules)) {
      if (keywords.some((keyword) => description.includes(keyword))) {
        return category;
      }
    }

    return 'Outros';
  }

  private detectPaymentMethod(message: string): string | null {
    if (message.includes('crédito') || message.includes('credito')) {
      return 'Crédito';
    }

    if (message.includes('débito') || message.includes('debito')) {
      return 'Débito';
    }

    if (message.includes('pix')) {
      return 'Pix';
    }

    if (message.includes('dinheiro')) {
      return 'Dinheiro';
    }

    return null;
  }

  private detectAccountOrCard(message: string): string | null {
    const institutions = [
      'Nubank',
      'Inter',
      'Picpay',
      'Caixa',
      'Itau',
      'Itaú',
      'Bradesco',
      'Santander',
      'BB',
      'Banco do Brasil',
    ];

    const foundInstitution = institutions.find((institution) =>
      message.includes(institution)
    );

    if (!foundInstitution) return null;

    if (foundInstitution === 'itaú') return 'itau';
    if (foundInstitution === 'banco do brasil' || foundInstitution === 'bb') {
      return 'banco do brasil';
    }

    return foundInstitution;
  }
}

export default new ParseTransactionMessageService();