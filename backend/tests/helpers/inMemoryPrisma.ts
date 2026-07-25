type Entity = Record<string, any>;

function matchesDateRange(value: Date, range?: { gte?: Date; lte?: Date }) {
  if (!range) return true;
  if (range.gte && value < range.gte) return false;
  if (range.lte && value > range.lte) return false;
  return true;
}

export function createInMemoryPrisma() {
  const state = {
    users: [] as Entity[],
    transactions: [] as Entity[],
    debts: [] as Entity[],
    monthlyClosures: [] as Entity[],
    supportTickets: [] as Entity[],
  };

  const counters = {
    user: 1,
    transaction: 1,
    debt: 1,
    monthlyClosure: 1,
    supportTicket: 1,
  };

  function reset() {
    for (const records of Object.values(state)) {
      records.splice(0, records.length);
    }

    for (const key of Object.keys(counters) as Array<keyof typeof counters>) {
      counters[key] = 1;
    }
  }

  const client = {
    user: {
      async findUnique({ where }: any) {
        return (
          state.users.find(
            (user) =>
              (where.id !== undefined && user.id === where.id) ||
              (where.email !== undefined && user.email === where.email)
          ) ?? null
        );
      },
      async create({ data }: any) {
        const now = new Date();
        const user = {
          id: counters.user++,
          ...data,
          createdAt: now,
          updatedAt: now,
        };
        state.users.push(user);
        return user;
      },
      async update({ where, data }: any) {
        const user = state.users.find((item) => item.id === where.id);
        if (!user) throw new Error('User not found');
        Object.assign(user, data, { updatedAt: new Date() });
        return user;
      },
    },
    transaction: {
      async create({ data }: any) {
        const now = new Date();
        const transaction = {
          id: counters.transaction++,
          ...data,
          createdAt: now,
          updatedAt: now,
        };
        state.transactions.push(transaction);
        return transaction;
      },
      async findMany({ where = {}, orderBy }: any = {}) {
        const transactions = state.transactions.filter(
          (transaction) =>
            (where.userId === undefined ||
              transaction.userId === where.userId) &&
            (where.type === undefined || transaction.type === where.type) &&
            matchesDateRange(transaction.transactionAt, where.transactionAt)
        );

        if (orderBy?.transactionAt) {
          const direction = orderBy.transactionAt === 'asc' ? 1 : -1;
          transactions.sort(
            (a, b) =>
              direction *
              (a.transactionAt.getTime() - b.transactionAt.getTime())
          );
        }

        return transactions;
      },
      async findFirst({ where }: any) {
        return (
          state.transactions.find(
            (transaction) =>
              (where.id === undefined || transaction.id === where.id) &&
              (where.userId === undefined ||
                transaction.userId === where.userId)
          ) ?? null
        );
      },
      async update({ where, data }: any) {
        const transaction = state.transactions.find(
          (item) => item.id === where.id
        );
        if (!transaction) throw new Error('Transaction not found');
        Object.assign(transaction, data, { updatedAt: new Date() });
        return transaction;
      },
      async delete({ where }: any) {
        const index = state.transactions.findIndex(
          (item) => item.id === where.id
        );
        if (index < 0) throw new Error('Transaction not found');
        return state.transactions.splice(index, 1)[0];
      },
    },
    debt: {
      async create({ data }: any) {
        const now = new Date();
        const debt = {
          id: counters.debt++,
          ...data,
          createdAt: now,
          updatedAt: now,
        };
        state.debts.push(debt);
        return debt;
      },
      async findMany({ where = {}, orderBy }: any = {}) {
        const debts = state.debts.filter(
          (debt) =>
            (where.userId === undefined || debt.userId === where.userId) &&
            (where.status === undefined || debt.status === where.status)
        );

        if (Array.isArray(orderBy)) {
          debts.sort(
            (a, b) =>
              a.status.localeCompare(b.status) ||
              b.createdAt.getTime() - a.createdAt.getTime()
          );
        } else if (orderBy?.createdAt === 'desc') {
          debts.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
          );
        }

        return debts;
      },
      async findFirst({ where }: any) {
        return (
          state.debts.find(
            (debt) =>
              (where.id === undefined || debt.id === where.id) &&
              (where.userId === undefined || debt.userId === where.userId)
          ) ?? null
        );
      },
      async update({ where, data }: any) {
        const debt = state.debts.find((item) => item.id === where.id);
        if (!debt) throw new Error('Debt not found');
        Object.assign(debt, data, { updatedAt: new Date() });
        return debt;
      },
      async delete({ where }: any) {
        const index = state.debts.findIndex((item) => item.id === where.id);
        if (index < 0) throw new Error('Debt not found');
        return state.debts.splice(index, 1)[0];
      },
    },
    monthlyClosure: {
      async findUnique({ where }: any) {
        const key = where.userId_month_year;
        return (
          state.monthlyClosures.find(
            (closure) =>
              closure.userId === key.userId &&
              closure.month === key.month &&
              closure.year === key.year
          ) ?? null
        );
      },
      async create({ data }: any) {
        const now = new Date();
        const closure = {
          id: counters.monthlyClosure++,
          ...data,
          closedAt: now,
        };
        state.monthlyClosures.push(closure);
        return closure;
      },
      async findMany({ where = {} }: any = {}) {
        return state.monthlyClosures
          .filter(
            (closure) =>
              (where.userId === undefined ||
                closure.userId === where.userId) &&
              (where.year === undefined || closure.year === where.year)
          )
          .sort((a, b) => b.year - a.year || b.month - a.month);
      },
      async findFirst({ where }: any) {
        return (
          state.monthlyClosures.find(
            (closure) =>
              (where.id === undefined || closure.id === where.id) &&
              (where.userId === undefined ||
                closure.userId === where.userId)
          ) ?? null
        );
      },
      async delete({ where }: any) {
        const index = state.monthlyClosures.findIndex(
          (item) => item.id === where.id
        );
        if (index < 0) throw new Error('Monthly closure not found');
        return state.monthlyClosures.splice(index, 1)[0];
      },
    },
    supportTicket: {
      async create({ data }: any) {
        const now = new Date();
        const ticket = {
          id: counters.supportTicket++,
          ...data,
          status: data.status ?? 'open',
          createdAt: now,
          updatedAt: now,
        };
        state.supportTickets.push(ticket);
        return ticket;
      },
      async findMany({ where = {} }: any = {}) {
        return state.supportTickets.filter(
          (ticket) =>
            where.userId === undefined || ticket.userId === where.userId
        );
      },
      async findFirst({ where }: any) {
        return (
          state.supportTickets.find(
            (ticket) =>
              (where.id === undefined || ticket.id === where.id) &&
              (where.userId === undefined || ticket.userId === where.userId)
          ) ?? null
        );
      },
    },
  };

  return { client, reset, state };
}
