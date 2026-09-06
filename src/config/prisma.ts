import { PrismaClient } from '@prisma/client';
import { config } from './index.js';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  global.prismaGlobal ||
  new PrismaClient({
    log: config.isDev ? ['error', 'warn'] : ['error']
  });

if (config.isDev) {
  global.prismaGlobal = prisma;
}
