import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@session-jeu.com" },
    update: {},
    create: {
      email: "admin@session-jeu.com",
      name: "Admin",
      role: "ADMIN",
      profile: {
        create: {
          username: "admin",
          bio: "Platform administrator",
        },
      },
    },
  });

  // Create test player
  const player = await prisma.user.upsert({
    where: { email: "player@session-jeu.com" },
    update: {},
    create: {
      email: "player@session-jeu.com",
      name: "Test Player",
      role: "PLAYER",
      profile: {
        create: {
          username: "testplayer",
          bio: "Test player account",
        },
      },
      wallet: {
        create: {
          balance: 10000,
        },
      },
    },
  });

  // Create public game session
  const publicSession = await prisma.gameSession.upsert({
    where: { code: "TEST-PUBLIC-001" },
    update: {},
    create: {
      code: "TEST-PUBLIC-001",
      name: "Test Public Session",
      description: "A public test session for development",
      status: "PUBLISHED",
      maxPlayers: 10,
      entryFee: 500,
      prizePool: 5000,
      isPublic: true,
      createdBy: admin.id,
    },
  });

  // Create private game session
  const privateSession = await prisma.gameSession.upsert({
    where: { code: "TEST-PRIVATE-001" },
    update: {},
    create: {
      code: "TEST-PRIVATE-001",
      name: "Test Private Session",
      description: "A private test session for development",
      status: "DRAFT",
      maxPlayers: 5,
      entryFee: 1000,
      prizePool: 0,
      isPublic: false,
      createdBy: admin.id,
    },
  });

  // Register player in public session
  await prisma.sessionRegistration.upsert({
    where: {
      userId_sessionId: {
        userId: player.id,
        sessionId: publicSession.id,
      },
    },
    update: {},
    create: {
      userId: player.id,
      sessionId: publicSession.id,
      status: "CONFIRMED",
    },
  });

  console.log("Seed completed:");
  console.log(`  - Admin: ${admin.email}`);
  console.log(`  - Player: ${player.email}`);
  console.log(`  - Public Session: ${publicSession.code}`);
  console.log(`  - Private Session: ${privateSession.code}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
