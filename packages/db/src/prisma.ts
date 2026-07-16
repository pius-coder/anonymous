import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Prefer TEST_DATABASE_URL when set (L3 harness / worktree isolation),
 * otherwise DATABASE_URL. Never log the connection string.
 */
function createClient(): PrismaClient {
  const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  return url
    ? new PrismaClient({ datasources: { db: { url } } })
    : new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** Returns the singleton PrismaClient instance. Useful for testing. */
export function getPrisma(): PrismaClient {
  return prisma;
}
