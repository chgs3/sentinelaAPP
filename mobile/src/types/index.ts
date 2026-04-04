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

export type CategorySummary = {
  category: string;
  total: number;
  count: number;
};

export type Debt = {
  id: number;
  personName: string;
  type: 'to_receive' | 'to_pay';
  amount: number;
  description: string;
  status: 'pending' | 'received' | 'paid';
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  userId: number;
};

export type MonthlyClosure = {
  id: number;
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  totalIncomes: number;
  totalExpenses: number;
  balance: number;
  totalTransactions: number;
  closedAt: string;
  userId: number;
};

export type MonthlyComparison = {
  current: {
    month: number;
    year: number;
    totalIncomes: number;
    totalExpenses: number;
    balance: number;
    totalTransactions: number;
  };
  previous: {
    month: number;
    year: number;
    totalIncomes: number;
    totalExpenses: number;
    balance: number;
    totalTransactions: number;
  };
  diff: {
    totalIncomes: number;
    totalExpenses: number;
    balance: number;
    totalTransactions: number;
  };
};

export type DailySummaryItem = {
  day: number;
  date: string;
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