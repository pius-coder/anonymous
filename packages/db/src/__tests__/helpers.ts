import { PrismaClient } from "@prisma/client";

let testPrisma: PrismaClient | null = null;

export function isIntegrationEnv(): boolean {
  return !!process.env.TEST_DATABASE_URL || !!process.env.DATABASE_URL;
}

export function getTestPrisma(): PrismaClient {
  if (!testPrisma) {
    testPrisma = new PrismaClient();
  }
  return testPrisma;
}
