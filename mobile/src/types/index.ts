export type AuthUser = {
  id: number;
  name: string;
  email: string;
};

export type Transaction = {
  id: number;
  type: 'expense' | 'income';
  amount: number;
  description: string;
  category: string;
  transactionAt: string;
  paymentMethod: 'credit' | 'debit' | 'pix' | 'cash' | null;
  accountOrCard: string | null;
  userId: number;
};

export type MonthlySummary = {
  totalIncomes: number;
  totalExpenses: number;
  balance: number;
  totalTransactions: number;
};

export type ParsedTransaction = {
  type: 'expense' | 'income';
  amount: number;
  description: string;
  category: string;
  transactionAt: string;
  rawDateExpression?: string | null;
  paymentMethod: 'credit' | 'debit' | 'pix' | 'cash' | null;
  accountOrCard: string | null;
  confidence?: number;
  possibleTransfer?: boolean;
};

export type ParseMessageResponse =
  | {
      status: 'created';
      message: string;
      ambiguities: string[];
      parsed: ParsedTransaction;
      transaction: Transaction;
    }
  | {
      status: 'needs_confirmation';
      message: string;
      ambiguities: string[];
      parsed: ParsedTransaction;
    }
  | {
      status: 'unable_to_parse';
      message: string;
      ambiguities: string[];
      parsed?: ParsedTransaction;
    }
  | {
      status: 'ignored_transfer';
      message: string;
      ambiguities: string[];
      parsed?: ParsedTransaction;
    };