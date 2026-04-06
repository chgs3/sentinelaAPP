export type TransactionType = 'expense' | 'income';

export type PaymentMethod = 'pix' | 'credit' | 'debit' | 'cash' | null;

export type TransactionCategory =
  | 'Transporte'
  | 'Alimentação'
  | 'Moradia'
  | 'Saúde'
  | 'Lazer'
  | 'Trabalho'
  | 'Compras'
  | 'Outros'
  | 'Transferência';

export type ParsedTransaction = {
  type: TransactionType;
  amount: number;
  description: string;
  category: TransactionCategory;
  transactionAt: string;
  rawDateExpression: string | null;
  paymentMethod: PaymentMethod;
  accountOrCard: string | null;
  confidence: number;
  possibleTransfer: boolean;
};