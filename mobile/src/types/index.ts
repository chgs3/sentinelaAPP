export type Transaction = {
  id: number;
  type: 'expense' | 'income';
  amount: number;
  description: string;
  category: string;
  transactionAt: string;
  paymentMethod: string | null;
  accountOrCard: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MonthlySummary = {
  month: number;
  year: number;
  totalTransactions: number;
  totalExpenses: number;
  totalIncomes: number;
  balance: number;
};

export type ParseMessageResponse = {
  message: string;
  parsed: {
    type: 'expense' | 'income';
    amount: number;
    description: string;
    category: string;
    transactionAt: string;
    paymentMethod: string | null;
    accountOrCard: string | null;
  };
  transaction: Transaction;
};