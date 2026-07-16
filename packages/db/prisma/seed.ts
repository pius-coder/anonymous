/**
 * CLI entry for `pnpm db:seed`.
 * Seed graph implementation lives in `src/seed.ts` (package rootDir).
 */
import { PrismaClient } from "@prisma/client";
import { runSeed, SEED } from "../src/seed.js";

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await runSeed(prisma);
    console.log(
      result.reRun
        ? "Seed re-run complete (upsert; graph re-affirmed)."
        : "Seed applied (first run).",
    );
    console.log(
      JSON.stringify(
        {
          partyCode: SEED.partyCode,
          users: [
            SEED.admin.email,
            SEED.support.email,
            SEED.finance.email,
            SEED.player1.email,
            SEED.player2.email,
          ],
          password: "SeedPass123!",
          reRun: result.reRun,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
