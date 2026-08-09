import { PrismaClient } from '@prisma/client';

// One shared client across index.ts and every extracted module (events/, etc.) —
// each `new PrismaClient()` opens its own connection pool, so this must stay a
// singleton rather than being re-instantiated per module.
export const prisma = new PrismaClient();
