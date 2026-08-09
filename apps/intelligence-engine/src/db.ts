import { Prisma, PrismaClient } from '@prisma/client';

// One shared client across index.ts and every extracted module (events/, etc.) —
// each `new PrismaClient()` opens its own connection pool, so this must stay a
// singleton rather than being re-instantiated per module.
export const prisma = new PrismaClient();

// Shared by any module whose functions need to participate in a caller's transaction
// (events/index.ts, events/geo-query.ts) — accepts either the global client or a
// Prisma.TransactionClient so the same function works standalone or inside $transaction.
export type Db = typeof prisma | Prisma.TransactionClient;
