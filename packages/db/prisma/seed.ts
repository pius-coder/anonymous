import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const HASH_LENGTH = 64;

function getSeedPassword(envName: string, localDefault: string) {
  const password = process.env[envName];
  if (password) return password;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${envName} must be set when seeding production-like data`);
  }
  return localDefault;
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, HASH_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  }).toString("base64url");

  return `scrypt$1$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${HASH_LENGTH}$${salt}$${hash}`;
}

const commonMiniGameAntiCheat = {
  serverTimersOnly: true,
  nonceRequired: true,
  rejectAfterDeadline: true,
  sensitiveStateKeysBlocked: ["answer", "answers", "solution", "seed", "targetValue"],
};

const soloScoreConfigSchema = {
  type: "object",
  required: ["durationSeconds", "winnersCount", "maxAttempts"],
  properties: {
    durationSeconds: { type: "integer", minimum: 10, maximum: 180 },
    winnersCount: { type: "integer", minimum: 1, maximum: 100 },
    maxAttempts: { type: "integer", minimum: 1, maximum: 200 },
  },
};

const minigameDefinitions = [
  {
    key: "memory-sequence",
    name: "Sequence memoire",
    description: "Reproduire une sequence affichee par le serveur, classement par manches reussies.",
    family: "SOLO",
    playerMode: "SOLO",
    resolverId: "solo-score",
    version: 1,
    configSchema: soloScoreConfigSchema,
    defaultConfig: { durationSeconds: 60, winnersCount: 3, maxAttempts: 20 },
    allowedActions: [{ type: "sequence-input", maxPerWindow: 3, windowMs: 1000, requiresNonce: true }],
    antiCheatPolicy: commonMiniGameAntiCheat,
    clientStateSchema: { phase: "string", roundNum: "number", deadlineEpochMs: "number" },
    uiCopy: { objective: "Memorise la suite et reproduis-la dans l'ordre." },
  },
  {
    key: "rapid-calculation",
    name: "Calcul rapide",
    description: "Serie de calculs server-side, classement par bonnes reponses puis temps.",
    family: "SOLO",
    playerMode: "SOLO",
    resolverId: "solo-score",
    version: 1,
    configSchema: soloScoreConfigSchema,
    defaultConfig: { durationSeconds: 45, winnersCount: 3, maxAttempts: 30 },
    allowedActions: [{ type: "answer", maxPerWindow: 4, windowMs: 1000, requiresNonce: true }],
    antiCheatPolicy: commonMiniGameAntiCheat,
    clientStateSchema: { phase: "string", promptId: "string", deadlineEpochMs: "number" },
    uiCopy: { objective: "Reponds au plus grand nombre de calculs avant la fin." },
  },
  {
    key: "pure-reaction-duel",
    name: "Reaction pure duel",
    description: "Duel de reaction apres signal serveur, faux depart penalise.",
    family: "DUEL",
    playerMode: "DUEL",
    resolverId: "duel-score",
    version: 1,
    configSchema: {
      type: "object",
      required: ["durationSeconds", "roundsToWin", "falseStartPenaltyMs"],
      properties: {
        durationSeconds: { type: "integer", minimum: 5, maximum: 120 },
        roundsToWin: { type: "integer", minimum: 1, maximum: 5 },
        falseStartPenaltyMs: { type: "integer", minimum: 0, maximum: 5000 },
      },
    },
    defaultConfig: { durationSeconds: 30, roundsToWin: 2, falseStartPenaltyMs: 1000 },
    allowedActions: [{ type: "reaction-click", maxPerWindow: 2, windowMs: 1000, requiresNonce: true }],
    antiCheatPolicy: { ...commonMiniGameAntiCheat, latencyCorrectionRequired: true },
    clientStateSchema: { phase: "string", signalVisible: "boolean", deadlineEpochMs: "number" },
    uiCopy: { objective: "Clique seulement apres le signal." },
  },
  {
    key: "target-precision",
    name: "Precision de tir",
    description: "Cibles generees cote serveur, classement par touches et precision.",
    family: "SOLO",
    playerMode: "SOLO",
    resolverId: "solo-score",
    version: 1,
    configSchema: soloScoreConfigSchema,
    defaultConfig: { durationSeconds: 45, winnersCount: 3, maxAttempts: 40 },
    allowedActions: [{ type: "target-hit", maxPerWindow: 8, windowMs: 1000, requiresNonce: true }],
    antiCheatPolicy: { ...commonMiniGameAntiCheat, hitboxValidatedServerSide: true },
    clientStateSchema: { phase: "string", visibleTargets: "array", deadlineEpochMs: "number" },
    uiCopy: { objective: "Touche les cibles visibles, evite les clics inutiles." },
  },
  {
    key: "safe-zones",
    name: "Zones sures",
    description: "Survie collective a zones sures, classement par statut et temps de survie.",
    family: "SURVIVAL",
    playerMode: "GROUP",
    resolverId: "solo-score",
    version: 1,
    configSchema: {
      type: "object",
      required: ["durationSeconds", "winnersCount", "hazardIntervalMs"],
      properties: {
        durationSeconds: { type: "integer", minimum: 15, maximum: 240 },
        winnersCount: { type: "integer", minimum: 1, maximum: 100 },
        hazardIntervalMs: { type: "integer", minimum: 500, maximum: 10000 },
      },
    },
    defaultConfig: { durationSeconds: 90, winnersCount: 5, hazardIntervalMs: 3000 },
    allowedActions: [{ type: "move", maxPerWindow: 15, windowMs: 1000, requiresNonce: true }],
    antiCheatPolicy: { ...commonMiniGameAntiCheat, positionValidatedServerSide: true },
    clientStateSchema: { phase: "string", safeZones: "array", deadlineEpochMs: "number" },
    uiCopy: { objective: "Reste dans une zone sure quand le danger tombe." },
  },
] as const;

async function main() {
  console.log("Seeding database...");

  const adminPasswordHash = hashPassword(getSeedPassword("SEED_ADMIN_PASSWORD", "AdminLocal2026!"));
  const playerPasswordHash = hashPassword(
    getSeedPassword("SEED_PLAYER_PASSWORD", "PlayerLocal2026!"),
  );

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@session-jeu.com" },
    update: {
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      isActive: true,
    },
    create: {
      email: "admin@session-jeu.com",
      passwordHash: adminPasswordHash,
      name: "Admin",
      role: "ADMIN",
      isActive: true,
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
    update: {
      passwordHash: playerPasswordHash,
      role: "PLAYER",
      isActive: true,
    },
    create: {
      email: "player@session-jeu.com",
      passwordHash: playerPasswordHash,
      name: "Test Player",
      role: "PLAYER",
      isActive: true,
      profile: {
        create: {
          username: "testplayer",
          bio: "Test player account",
        },
      },
      wallet: {
        create: {
          balanceXaf: 10000,
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
      minPlayers: 10,
      maxPlayers: 20,
      entryFee: 1000,
      entryFeeXaf: 1000,
      prizePool: 12000,
      prizePoolBps: 6000,
      winnerSplitBps: [10000],
      providerFeeBps: 300,
      configVersion: 1,
      startTime: new Date("2026-07-15T20:00:00Z"),
      registrationClosesAt: new Date("2026-07-15T19:30:00Z"),
      visibility: "PUBLIC",
      publishedAt: new Date("2026-07-07T00:00:00Z"),
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
      minPlayers: 8,
      maxPlayers: 15,
      entryFee: 500,
      entryFeeXaf: 500,
      prizePool: 6000,
      prizePoolBps: 6000,
      winnerSplitBps: [10000],
      providerFeeBps: 300,
      configVersion: 1,
      startTime: new Date("2026-07-12T21:00:00Z"),
      registrationClosesAt: new Date("2026-07-12T20:30:00Z"),
      visibility: "PUBLIC",
      publishedAt: new Date("2026-07-07T00:00:00Z"),
      createdBy: admin.id,
    },
  });

  // Create unlisted session (not in catalogue, accessible by direct link)
  const unlistedSession = await prisma.gameSession.upsert({
    where: { code: "UNLISTED-SESSION" },
    update: {},
    create: {
      code: "UNLISTED-SESSION",
      name: "Session Communauté WhatsApp",
      description: "Session partagée via un lien privé pour la communauté.",
      status: "PUBLISHED",
      minPlayers: 5,
      maxPlayers: 10,
      entryFee: 500,
      entryFeeXaf: 500,
      prizePool: 3000,
      prizePoolBps: 6000,
      winnerSplitBps: [10000],
      providerFeeBps: 300,
      configVersion: 1,
      startTime: new Date("2026-07-14T19:00:00Z"),
      registrationClosesAt: new Date("2026-07-14T18:30:00Z"),
      visibility: "UNLISTED",
      publishedAt: new Date("2026-07-07T00:00:00Z"),
      createdBy: admin.id,
    },
  });

  // Create private game session (not visible in catalogue, blocked by direct link)
  const privateSession = await prisma.gameSession.upsert({
    where: { code: "TEST-PRIVATE-001" },
    update: {},
    create: {
      code: "TEST-PRIVATE-001",
      name: "Session Privée VIP",
      description:
        "Session réservée aux membres invités uniquement. Accès sur invitation uniquement.",
      status: "DRAFT",
      minPlayers: 2,
      maxPlayers: 5,
      entryFee: 2000,
      entryFeeXaf: 2000,
      prizePool: 0,
      prizePoolBps: 6000,
      winnerSplitBps: [10000],
      providerFeeBps: 300,
      configVersion: 1,
      visibility: "PRIVATE",
      createdBy: admin.id,
    },
  });

  // Register players in public session to test capacity calculation
  await prisma.sessionRegistration.upsert({
    where: { id: `seed-reg-${player.id}-${publicSession.id}` },
    update: {},
    create: {
      id: `seed-reg-${player.id}-${publicSession.id}`,
      userId: player.id,
      sessionId: publicSession.id,
      status: "PAID",
      paidAt: new Date("2026-07-07T00:00:00Z"),
    },
  });

  // Create additional registrations for capacity testing
  const extraPlayer1 = await prisma.user.upsert({
    where: { email: "player2@session-jeu.com" },
    update: {
      passwordHash: playerPasswordHash,
      role: "PLAYER",
      isActive: true,
    },
    create: {
      email: "player2@session-jeu.com",
      passwordHash: playerPasswordHash,
      name: "Player 2",
      role: "PLAYER",
      isActive: true,
      profile: {
        create: { username: "player2", bio: "Test player 2" },
      },
    },
  });

  const extraPlayer2 = await prisma.user.upsert({
    where: { email: "player3@session-jeu.com" },
    update: {
      passwordHash: playerPasswordHash,
      role: "PLAYER",
      isActive: true,
    },
    create: {
      email: "player3@session-jeu.com",
      passwordHash: playerPasswordHash,
      name: "Player 3",
      role: "PLAYER",
      isActive: true,
      profile: {
        create: { username: "player3", bio: "Test player 3" },
      },
    },
  });

  await prisma.sessionRegistration.upsert({
    where: { id: `seed-reg-${extraPlayer1.id}-${publicSession.id}` },
    update: {},
    create: {
      id: `seed-reg-${extraPlayer1.id}-${publicSession.id}`,
      userId: extraPlayer1.id,
      sessionId: publicSession.id,
      status: "PAYMENT_PENDING",
      paymentDeadlineAt: new Date("2026-07-07T00:15:00Z"),
    },
  });

  // Add a CANCELLED registration (should NOT count in placesRemaining)
  await prisma.sessionRegistration.upsert({
    where: { id: `seed-reg-${extraPlayer2.id}-${publicSession.id}` },
    update: {},
    create: {
      id: `seed-reg-${extraPlayer2.id}-${publicSession.id}`,
      userId: extraPlayer2.id,
      sessionId: publicSession.id,
      status: "CANCELLED",
    },
  });

  // Register player in second public session
  await prisma.sessionRegistration.upsert({
    where: { id: `seed-reg-${player.id}-${publicSession2.id}` },
    update: {},
    create: {
      id: `seed-reg-${player.id}-${publicSession2.id}`,
      userId: player.id,
      sessionId: publicSession2.id,
      status: "PAID",
      paidAt: new Date("2026-07-07T00:00:00Z"),
    },
  });

  await prisma.roleAssignment.upsert({
    where: { id: "seed-admin-role-assignment" },
    update: {
      role: "ADMIN",
      revokedAt: null,
      reason: "seed-admin-local",
    },
    create: {
      id: "seed-admin-role-assignment",
      userId: admin.id,
      role: "ADMIN",
      reason: "seed-admin-local",
    },
  });

  for (const definition of minigameDefinitions) {
    await prisma.miniGameDefinition.upsert({
      where: {
        key_version: {
          key: definition.key,
          version: definition.version,
        },
      },
      update: {
        name: definition.name,
        description: definition.description,
        family: definition.family,
        playerMode: definition.playerMode,
        resolverId: definition.resolverId,
        enabled: true,
        configSchema: definition.configSchema,
        defaultConfig: definition.defaultConfig,
        allowedActions: definition.allowedActions,
        antiCheatPolicy: definition.antiCheatPolicy,
        clientStateSchema: definition.clientStateSchema,
        uiCopy: definition.uiCopy,
        createdBy: admin.id,
      },
      create: {
        ...definition,
        enabled: true,
        createdBy: admin.id,
      },
    });
  }

  console.log("Seed completed:");
  console.log(`  - Admin: ${admin.email}`);
  console.log(`  - Players: ${player.email}, ${extraPlayer1.email}, ${extraPlayer2.email}`);
  console.log(`  - Public Session 1: ${publicSession.code} (2 active, 1 cancelled registrations)`);
  console.log(`  - Public Session 2: ${publicSession2.code} (1 active registration)`);
  console.log(`  - Unlisted Session: ${unlistedSession.code}`);
  console.log(`  - Private Session: ${privateSession.code}`);
  console.log(`  - Mini-games: ${minigameDefinitions.map((definition) => definition.key).join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
