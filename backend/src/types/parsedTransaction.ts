export type TransactionType = 'expense' | 'income';

export type PaymentMethod = 'pix' | 'credit' | 'debit' | 'cash' | null;

export type ParsedTransaction = {
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  transactionAt: string;
  rawDateExpression: string | null;
  paymentMethod: PaymentMethod;
  accountOrCard: string | null;
  confidence: number;
  possibleTransfer: boolean;
};