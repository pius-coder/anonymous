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

  // Create public game session (PUBLISHED, open for registration)
  const publicSession = await prisma.gameSession.upsert({
    where: { code: "TEST-PUBLIC-001" },
    update: {},
    create: {
      code: "TEST-PUBLIC-001",
      name: "Tournoi Stratégie du Vendredi",
      description:
        "Affrontez les meilleurs joueurs dans une session de stratégies et de réflexion. Compétition structurée avec élimination progressive.",
      status: "PUBLISHED",
      maxPlayers: 20,
      entryFee: 1000,
      prizePool: 12000,
      startTime: new Date("2026-07-15T20:00:00Z"),
      isPublic: true,
      createdBy: admin.id,
    },
  });

  // Create second public session (ACTIVE, registration open)
  const publicSession2 = await prisma.gameSession.upsert({
    where: { code: "NIGHT-DROP-001" },
    update: {},
    create: {
      code: "NIGHT-DROP-001",
      name: "Night Drop - Session Express",
      description:
        "Session rapide de soirée. Testez vos réflexes et votre stratégie dans un format condensé.",
      status: "ACTIVE",
      maxPlayers: 15,
      entryFee: 500,
      prizePool: 6000,
      startTime: new Date("2026-07-12T21:00:00Z"),
      isPublic: true,
      createdBy: admin.id,
    },
  });

  // Create private game session (not visible in catalogue)
  const privateSession = await prisma.gameSession.upsert({
    where: { code: "TEST-PRIVATE-001" },
    update: {},
    create: {
      code: "TEST-PRIVATE-001",
      name: "Session Privée VIP",
      description: "Session réservée aux membres invités uniquement.",
      status: "DRAFT",
      maxPlayers: 5,
      entryFee: 2000,
      prizePool: 0,
      isPublic: false,
      createdBy: admin.id,
    },
  });

  // Register players in public session to test capacity calculation
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

  // Create additional registrations for capacity testing
  const extraPlayer1 = await prisma.user.upsert({
    where: { email: "player2@session-jeu.com" },
    update: {},
    create: {
      email: "player2@session-jeu.com",
      name: "Player 2",
      role: "PLAYER",
      profile: {
        create: { username: "player2", bio: "Test player 2" },
      },
    },
  });

  const extraPlayer2 = await prisma.user.upsert({
    where: { email: "player3@session-jeu.com" },
    update: {},
    create: {
      email: "player3@session-jeu.com",
      name: "Player 3",
      role: "PLAYER",
      profile: {
        create: { username: "player3", bio: "Test player 3" },
      },
    },
  });

  await prisma.sessionRegistration.upsert({
    where: {
      userId_sessionId: {
        userId: extraPlayer1.id,
        sessionId: publicSession.id,
      },
    },
    update: {},
    create: {
      userId: extraPlayer1.id,
      sessionId: publicSession.id,
      status: "PENDING",
    },
  });

  // Add a CANCELLED registration (should NOT count in placesRemaining)
  await prisma.sessionRegistration.upsert({
    where: {
      userId_sessionId: {
        userId: extraPlayer2.id,
        sessionId: publicSession.id,
      },
    },
    update: {},
    create: {
      userId: extraPlayer2.id,
      sessionId: publicSession.id,
      status: "CANCELLED",
    },
  });

  // Register player in second public session
  await prisma.sessionRegistration.upsert({
    where: {
      userId_sessionId: {
        userId: player.id,
        sessionId: publicSession2.id,
      },
    },
    update: {},
    create: {
      userId: player.id,
      sessionId: publicSession2.id,
      status: "CONFIRMED",
    },
  });

  console.log("Seed completed:");
  console.log(`  - Admin: ${admin.email}`);
  console.log(`  - Players: ${player.email}, ${extraPlayer1.email}, ${extraPlayer2.email}`);
  console.log(`  - Public Session 1: ${publicSession.code} (2 active, 1 cancelled registrations)`);
  console.log(`  - Public Session 2: ${publicSession2.code} (1 active registration)`);
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
