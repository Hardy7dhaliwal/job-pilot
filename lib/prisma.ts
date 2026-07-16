import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton. In dev, Next.js hot-reload re-evaluates modules,
 * which would otherwise create a new client (and DB connection) per reload —
 * so we stash the instance on globalThis.
 *
 * Swapping SQLite → Postgres later only requires changing DATABASE_URL and
 * the datasource provider in schema.prisma; nothing here changes.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
