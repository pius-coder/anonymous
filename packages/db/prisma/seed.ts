/**
 * CLI entry for `pnpm db:seed`.
 * Seed graph implementation lives in `src/seed.ts` (package rootDir).
 * Never prints password hashes, tokens, or provider credential values.
 */
import { PrismaClient } from "@prisma/client";
import { assertSeedAllowed, runSeed, SEED } from "../src/seed.js";

async function main() {
  assertSeedAllowed();
  const prisma = new PrismaClient();
  try {
    const result = await runSeed(prisma);
    console.log(
      result.reRun
        ? "Seed re-run complete (upsert; graph re-affirmed)."
        : "Seed applied (first run).",
    );
    // Local/test only: emails and party code — no passwords, tokens, or API keys.
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
          reRun: result.reRun,
          note: "Demo credentials are documented in packages/db/ARCHITECTURE.md for local/test only.",
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
