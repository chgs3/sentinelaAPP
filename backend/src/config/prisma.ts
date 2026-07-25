import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { env } from './env';

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const productionPrisma = new PrismaClient({ adapter });
let activePrisma = productionPrisma;

export function setPrismaClientForTests(client: PrismaClient) {
  if (env.NODE_ENV !== 'test') {
    throw new Error(
      'A substituição do Prisma só é permitida quando NODE_ENV=test.'
    );
  }

  activePrisma = client;
}

export function resetPrismaClientForTests() {
  activePrisma = productionPrisma;
}

const prisma = new Proxy(productionPrisma, {
  get(_target, property) {
    const value = Reflect.get(activePrisma, property, activePrisma);

    return typeof value === 'function' ? value.bind(activePrisma) : value;
  },
});

export default prisma;
