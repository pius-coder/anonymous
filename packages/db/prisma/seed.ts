import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("v0.1 foundation seed: no legacy data is inserted.");
  console.log("Run 'pnpm db:seed' after migration to verify the schema.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
