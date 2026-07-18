/**
 * L3 harness: real PostgreSQL after empty-DB migrate.
 * Frontiers: real PG; no Redis/API required for this file alone (orchestrator still boots full stack).
 */
import { PrismaClient } from "@prisma/client";
import { describe, expect, it, afterAll } from "vitest";

const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

describe("L3 PostgreSQL harness", () => {
  const prisma = new PrismaClient(
    databaseUrl
      ? {
          datasources: { db: { url: databaseUrl } },
        }
      : undefined,
  );

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("connects and executes SELECT 1", async () => {
    expect(databaseUrl, "DATABASE_URL/TEST_DATABASE_URL must be set by the orchestrator").toBeTruthy();
    const rows = await prisma.$queryRawUnsafe<Array<{ ok: number }>>("SELECT 1::int AS ok");
    expect(rows[0]?.ok).toBe(1);
  });

  it("sees applied migrations table from empty-DB migrate", async () => {
    const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(
      `SELECT COUNT(*)::int AS count FROM "_prisma_migrations"`,
    );
    const count = Number(rows[0]?.count ?? 0);
    expect(count).toBeGreaterThan(0);
  });

  it("can read a domain table created by migrations (User)", async () => {
    const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(
      `SELECT COUNT(*)::int AS count FROM "User"`,
    );
    expect(Number(rows[0]?.count ?? -1)).toBeGreaterThanOrEqual(0);
  });
});
