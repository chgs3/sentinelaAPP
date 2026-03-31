type TransactionType = 'expense' | 'income';

type ParsedTransaction = {
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  transactionAt: Date;
  paymentMethod?: string | null;
};

class ParseTransactionMessageService {
  execute(message: string): ParsedTransaction | null {
    const normalizedMessage = this.normalizeMessage(message);

    const amount = this.extractAmount(normalizedMessage);
    if (amount === null) return null;

    const type = this.detectType(normalizedMessage);
    const description = this.extractDescription(normalizedMessage);

    if (!description) return null;

    const category = this.detectCategory(description);

    return {
      type,
      amount,
      description,
      category,
      transactionAt: new Date(),
      paymentMethod: this.detectPaymentMethod(normalizedMessage),
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

  private extractDescription(message: string): string {
    const cleanedMessage = message
      .replace(/gastei|paguei|comprei|recebi|ganhei|entrada|entrou/gi, '')
      .replace(/(\d+[.,]?\d{0,2})/g, '')
      .replace(/\b(com|de|do|da|no|na|em)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    return cleanedMessage;
  }

  private detectCategory(description: string): string {
    const rules: Record<string, string[]> = {
      Transporte: ['uber', '99', 'taxi', 'gasolina', 'ônibus', 'onibus', 'metrô', 'metro'],
      Alimentação: ['ifood', 'comida', 'lanche', 'restaurante', 'mercado', 'café', 'cafe'],
      Moradia: ['aluguel', 'energia', 'água', 'agua', 'internet', 'condomínio', 'condominio'],
      Saúde: ['farmácia', 'farmacia', 'médico', 'medico', 'consulta', 'remédio', 'remedio'],
      Lazer: ['cinema', 'netflix', 'spotify', 'viagem', 'bar', 'show'],
      Trabalho: ['freela', 'freelance', 'curso', 'faculdade', 'livro', 'software', 'ferramenta', 'projeto'],
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
      return 'credit';
    }

    if (message.includes('débito') || message.includes('debito')) {
      return 'debit';
    }

    if (message.includes('pix')) {
      return 'pix';
    }

    if (message.includes('dinheiro')) {
      return 'cash';
    }

    return null;
  }
}

export default new ParseTransactionMessageService();