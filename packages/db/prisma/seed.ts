import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

const RECETTE_MINIGAME_KEYS = new Set([
  "memory-sequence",
  "pure-reaction-duel",
  "trust-bridge",
  "team-relay",
  "danger-sweep",
  "silent-vote",
]);

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

function assertDestructiveSeedAllowed() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing destructive seed with NODE_ENV=production");
  }
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== "true") {
    throw new Error("Set ALLOW_DESTRUCTIVE_SEED=true to clear and reseed the database");
  }
}

async function resetDatabase() {
  assertDestructiveSeedAllowed();
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `;
  const tableNames = tables.map(({ tablename }) => `"public"."${tablename}"`).join(", ");
  if (!tableNames) return;
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames} CASCADE;`);
}

async function createSeedPaymentTrace(input: {
  userId: string;
  sessionId: string;
  registrationId: string;
  amountXaf: number;
  paidAt: Date;
  scenario: string;
}) {
  const wallet = await prisma.wallet.upsert({
    where: { userId: input.userId },
    update: { isFrozen: false },
    create: { userId: input.userId, balanceXaf: 10000 },
  });
  const nextBalanceXaf = wallet.balanceXaf - input.amountXaf;
  const payment = await prisma.paymentTransaction.create({
    data: {
      userId: input.userId,
      sessionId: input.sessionId,
      registrationId: input.registrationId,
      amount: input.amountXaf,
      amountXaf: input.amountXaf,
      currency: "XAF",
      status: "SUCCESSFUL",
      provider: "SEED_WALLET",
      providerExternalId: `seed-${input.scenario}-${input.registrationId}`,
      reference: `seed:${input.scenario}:${input.registrationId}`,
      metadata: { seed: true, scenario: input.scenario },
      createdAt: input.paidAt,
      updatedAt: input.paidAt,
    },
  });
  const ledger = await prisma.ledgerEntry.create({
    data: {
      walletId: wallet.id,
      userId: input.userId,
      amountXaf: input.amountXaf,
      balanceAfterXaf: nextBalanceXaf,
      direction: "DEBIT",
      type: "ENTRY_FEE",
      description: `Seed entry fee payment for ${input.scenario}`,
      referenceType: "SessionRegistration",
      referenceId: input.registrationId,
      idempotencyKey: `seed:${input.scenario}:${input.registrationId}:entry-fee`,
      paymentId: payment.id,
      sessionId: input.sessionId,
      createdAt: input.paidAt,
    },
  });
  await prisma.wallet.update({
    where: { id: wallet.id },
    data: { balanceXaf: nextBalanceXaf, version: { increment: 1 } },
  });
  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: "seed.payment-trace.created",
      entity: "SessionRegistration",
      entityId: input.registrationId,
      newData: {
        sessionId: input.sessionId,
        paymentId: payment.id,
        ledgerId: ledger.id,
        amountXaf: input.amountXaf,
        scenario: input.scenario,
      },
      reason: "seed-traceability",
      createdAt: input.paidAt,
    },
  });
  return { payment, ledger };
}

async function assertSeedTraceability() {
  const untracedPaidRegistrations = await prisma.sessionRegistration.findMany({
    where: {
      status: { in: ["PAID", "CHECKED_IN", "IN_ROOM"] },
      payment: null,
    },
    select: { id: true, session: { select: { code: true } }, user: { select: { email: true } } },
  });
  if (untracedPaidRegistrations.length > 0) {
    throw new Error(
      `Seed traceability failed: paid registrations without payment ${JSON.stringify(untracedPaidRegistrations)}`,
    );
  }

  const seedPaymentsWithoutLedger = await prisma.paymentTransaction.findMany({
    where: {
      status: "SUCCESSFUL",
      provider: "SEED_WALLET",
      ledger: { none: {} },
    },
    select: { id: true, registrationId: true, reference: true },
  });
  if (seedPaymentsWithoutLedger.length > 0) {
    throw new Error(
      `Seed traceability failed: seed payments without ledger ${JSON.stringify(seedPaymentsWithoutLedger)}`,
    );
  }
}

const commonMiniGameAntiCheat = {
  serverTimersOnly: true,
  nonceRequired: true,
  rejectAfterDeadline: true,
  sensitiveStateKeysBlocked: ["answer", "answers", "solution", "seed", "targetValue"],
};

const configKinds = {
  solo: {
    schema: {
      type: "object",
      required: ["durationSeconds", "winnersCount", "maxAttempts"],
      properties: {
        durationSeconds: { type: "integer", minimum: 10, maximum: 180 },
        winnersCount: { type: "integer", minimum: 1, maximum: 100 },
        maxAttempts: { type: "integer", minimum: 1, maximum: 200 },
      },
    },
    defaultConfig: { durationSeconds: 60, winnersCount: 3, maxAttempts: 20 },
  },
  duel: {
    schema: {
      type: "object",
      required: ["durationSeconds", "roundsToWin", "falseStartPenaltyMs"],
      properties: {
        durationSeconds: { type: "integer", minimum: 5, maximum: 120 },
        roundsToWin: { type: "integer", minimum: 1, maximum: 5 },
        falseStartPenaltyMs: { type: "integer", minimum: 0, maximum: 5000 },
      },
    },
    defaultConfig: { durationSeconds: 30, roundsToWin: 2, falseStartPenaltyMs: 1000 },
  },
  survival: {
    schema: {
      type: "object",
      required: ["durationSeconds", "winnersCount", "hazardIntervalMs"],
      properties: {
        durationSeconds: { type: "integer", minimum: 15, maximum: 240 },
        winnersCount: { type: "integer", minimum: 1, maximum: 100 },
        hazardIntervalMs: { type: "integer", minimum: 500, maximum: 10000 },
      },
    },
    defaultConfig: { durationSeconds: 90, winnersCount: 5, hazardIntervalMs: 3000 },
  },
  group: {
    schema: {
      type: "object",
      required: ["durationSeconds", "winnersCount", "teamSize", "maxAttempts"],
      properties: {
        durationSeconds: { type: "integer", minimum: 20, maximum: 240 },
        winnersCount: { type: "integer", minimum: 1, maximum: 100 },
        teamSize: { type: "integer", minimum: 2, maximum: 12 },
        maxAttempts: { type: "integer", minimum: 1, maximum: 200 },
      },
    },
    defaultConfig: { durationSeconds: 90, winnersCount: 6, teamSize: 3, maxAttempts: 30 },
  },
  hidden: {
    schema: {
      type: "object",
      required: ["durationSeconds", "winnersCount", "discussionSeconds", "accusationsPerPlayer"],
      properties: {
        durationSeconds: { type: "integer", minimum: 30, maximum: 300 },
        winnersCount: { type: "integer", minimum: 1, maximum: 100 },
        discussionSeconds: { type: "integer", minimum: 10, maximum: 120 },
        accusationsPerPlayer: { type: "integer", minimum: 1, maximum: 5 },
      },
    },
    defaultConfig: {
      durationSeconds: 120,
      winnersCount: 6,
      discussionSeconds: 45,
      accusationsPerPlayer: 1,
    },
  },
} as const;

const miniGameBlueprints = [
  ["memory-sequence", "Sequence memoire", "Reproduire une sequence affichee par le serveur.", "SOLO", "SOLO", "solo-score", "solo", "sequence-input", 3, "roundNum", "Memorise la suite et reproduis-la dans l'ordre."],
  ["rapid-calculation", "Calcul rapide", "Serie de calculs server-side, classement par bonnes reponses.", "SOLO", "SOLO", "solo-score", "solo", "answer", 4, "promptId", "Reponds au plus grand nombre de calculs avant la fin."],
  ["target-precision", "Precision de tir", "Cibles generees cote serveur, classement par touches.", "SOLO", "SOLO", "solo-score", "solo", "target-hit", 8, "visibleTargets", "Touche les cibles visibles, evite les clics inutiles."],
  ["pattern-recall", "Rappel de motif", "Retrouver un motif affiche temporairement.", "SOLO", "SOLO", "solo-score", "solo", "pattern-input", 3, "patternId", "Recompose le motif apres sa disparition."],
  ["logic-grid", "Grille logique", "Resoudre des contraintes simples generees serveur.", "SOLO", "SOLO", "solo-score", "solo", "grid-submit", 2, "puzzleId", "Valide la grille la plus coherente possible."],
  ["timing-window", "Fenetre parfaite", "Appuyer dans une fenetre de timing serveur.", "SOLO", "SOLO", "solo-score", "solo", "timing-tap", 5, "markerId", "Tape au plus proche du signal autorise."],
  ["pure-reaction-duel", "Reaction pure duel", "Duel de reaction apres signal serveur.", "DUEL", "DUEL", "duel-score", "duel", "reaction-click", 2, "signalVisible", "Clique seulement apres le signal."],
  ["mirror-match", "Miroir duel", "Reproduire plus vite que l'adversaire une action serveur.", "DUEL", "DUEL", "duel-score", "duel", "mirror-input", 3, "promptId", "Copie le signal avant ton adversaire."],
  ["quick-draw", "Degainage", "Duel a faux signaux, penalite sur depart anticipe.", "DUEL", "DUEL", "duel-score", "duel", "draw-click", 2, "signalId", "Clique uniquement sur le vrai signal."],
  ["duel-calculation", "Calcul duel", "Face-a-face de calcul mental.", "DUEL", "DUEL", "duel-score", "duel", "duel-answer", 4, "promptId", "Reponds juste avant ton adversaire."],
  ["rhythm-duel", "Rythme duel", "Suite de taps horodates serveur.", "DUEL", "DUEL", "duel-score", "duel", "rhythm-tap", 8, "beatId", "Garde le rythme plus precisement que ton adversaire."],
  ["bluff-duel", "Bluff duel", "Choix simultane et lecture de pattern.", "DUEL", "DUEL", "duel-score", "duel", "duel-choice", 2, "choiceWindowId", "Anticipe le choix adverse sans hasard dominant."],
  ["trust-bridge", "Pont de confiance", "Deux joueurs doivent confirmer la meme route.", "ALLIANCE", "GROUP", "solo-score", "group", "route-choice", 2, "pairId", "Coordonne une route commune avec ton allie impose."],
  ["shared-code", "Code partage", "Assembler un code a partir de fragments publics.", "ALLIANCE", "GROUP", "solo-score", "group", "code-submit", 3, "fragmentId", "Assemble le code avec ton binome."],
  ["pair-memory", "Memoire binome", "Deux joueurs retiennent des fragments differents.", "ALLIANCE", "GROUP", "solo-score", "group", "pair-recall", 3, "fragmentId", "Combine les souvenirs de ton alliance."],
  ["alliance-balance", "Balance alliance", "Repartir des poids sans depasser les limites serveur.", "ALLIANCE", "GROUP", "solo-score", "group", "balance-submit", 3, "boardId", "Equilibre la charge de ton alliance."],
  ["split-focus", "Attention partagee", "Chaque allie gere une partie de l'ecran.", "ALLIANCE", "GROUP", "solo-score", "group", "focus-input", 6, "laneId", "Garde ta voie propre pendant que l'autre fait de meme."],
  ["relay-logic", "Relais logique", "Resolution par etapes avec passage de relais.", "ALLIANCE", "GROUP", "solo-score", "group", "relay-submit", 3, "stepId", "Passe le relais avec une reponse correcte."],
  ["team-relay", "Relais equipe", "Enchainer des validations serveur dans le bon ordre.", "TEAM", "TEAM", "solo-score", "group", "team-relay", 3, "teamId", "Fais avancer ton equipe sans casser l'ordre."],
  ["squad-signal", "Signal escouade", "Tous les membres repondent au meme signal.", "TEAM", "TEAM", "solo-score", "group", "squad-signal", 4, "signalId", "Reagis avec ton escouade au signal serveur."],
  ["formation-hold", "Formation stable", "Maintenir une formation logique selon consignes serveur.", "TEAM", "TEAM", "solo-score", "group", "formation-move", 10, "formationId", "Garde la formation demandee avec ton equipe."],
  ["team-calculation", "Calcul equipe", "Problemes repartis entre membres.", "TEAM", "TEAM", "solo-score", "group", "team-answer", 4, "promptId", "Cumule les bonnes reponses avec ton equipe."],
  ["resource-sort", "Tri ressources", "Classer des ressources dans les bonnes files.", "TEAM", "TEAM", "solo-score", "group", "resource-sort", 6, "batchId", "Trie vite sans erreur avec ton equipe."],
  ["synchronized-tap", "Tap synchronise", "Les membres doivent agir dans une fenetre commune.", "TEAM", "TEAM", "solo-score", "group", "sync-tap", 5, "syncWindowId", "Synchronise ton action avec le groupe."],
  ["safe-zones", "Zones sures", "Survie collective a zones sures.", "SURVIVAL", "GROUP", "solo-score", "survival", "move", 15, "safeZones", "Reste dans une zone sure quand le danger tombe."],
  ["shrinking-floor", "Sol retrecissant", "La zone jouable se reduit par paliers serveur.", "SURVIVAL", "GROUP", "solo-score", "survival", "move", 15, "floorStep", "Reste dans le sol encore valide."],
  ["danger-sweep", "Rayon balayeur", "Eviter une trajectoire deterministe diffusee par le serveur.", "SURVIVAL", "GROUP", "solo-score", "survival", "move", 15, "sweepId", "Evite le rayon jusqu'a la fin."],
  ["last-light", "Derniere lumiere", "Se deplacer entre zones eclairees avant extinction.", "SURVIVAL", "GROUP", "solo-score", "survival", "move", 12, "lightId", "Rejoins une lumiere active avant extinction."],
  ["obstacle-path", "Chemin obstacles", "Choisir des positions valides pendant que le chemin change.", "SURVIVAL", "GROUP", "solo-score", "survival", "path-step", 10, "pathId", "Avance sans toucher les obstacles serveur."],
  ["endurance-count", "Compteur endurance", "Maintenir un rythme d'actions valide sans depasser les caps.", "SURVIVAL", "GROUP", "solo-score", "survival", "endurance-tap", 6, "targetPaceId", "Tiens le rythme sans spammer."],
  ["signal-detective", "Detective signaux", "Identifier les signaux incoherents dans un tour role cache.", "HIDDEN_ROLE", "GROUP", "solo-score", "hidden", "signal-accuse", 2, "clueRound", "Repere les signaux suspects sans information secrete."],
  ["silent-vote", "Vote silencieux", "Vote simultane borne par nonce.", "HIDDEN_ROLE", "GROUP", "solo-score", "hidden", "silent-vote", 1, "voteRound", "Vote une seule fois dans la fenetre serveur."],
  ["decoy-hunt", "Chasse leurre", "Distinguer les indices valides des leurres publics.", "HIDDEN_ROLE", "GROUP", "solo-score", "hidden", "clue-pick", 3, "clueSetId", "Choisis les indices fiables."],
  ["role-memory", "Memoire roles", "Se souvenir des declarations publiques precedentes.", "HIDDEN_ROLE", "GROUP", "solo-score", "hidden", "role-recall", 3, "statementRound", "Retrouve les contradictions dans les declarations."],
  ["suspect-pattern", "Pattern suspect", "Comparer des patterns publics pour identifier une anomalie.", "HIDDEN_ROLE", "GROUP", "solo-score", "hidden", "pattern-accuse", 2, "patternRound", "Trouve le comportement qui ne colle pas."],
  ["alibi-check", "Verification alibi", "Controler des alibis publics avec une limite d'accusations.", "HIDDEN_ROLE", "GROUP", "solo-score", "hidden", "alibi-check", 2, "alibiRound", "Verifie l'alibi le plus incoherent."],
] as const;

const positionValidatedActions = new Set(["move", "formation-move", "path-step"]);
const latencyActions = new Set(["reaction-click", "mirror-input", "draw-click", "rhythm-tap"]);

const minigameDefinitions = miniGameBlueprints.filter(([key]) => RECETTE_MINIGAME_KEYS.has(key)).map(
  ([
    key,
    name,
    description,
    family,
    playerMode,
    resolverId,
    configKind,
    actionType,
    maxPerWindow,
    stateKey,
    objective,
  ]) => {
    const config = configKinds[configKind];
    return {
      key,
      name,
      description,
      family,
      playerMode,
      resolverId,
      version: 1,
      configSchema: config.schema,
      defaultConfig: config.defaultConfig,
      allowedActions: [{ type: actionType, maxPerWindow, windowMs: 1000, requiresNonce: true }],
      antiCheatPolicy: {
        ...commonMiniGameAntiCheat,
        ...(positionValidatedActions.has(actionType) ? { positionValidatedServerSide: true } : {}),
        ...(latencyActions.has(actionType) ? { latencyCorrectionRequired: true } : {}),
      },
      clientStateSchema: { phase: "string", [stateKey]: "string", deadlineEpochMs: "number" },
      uiCopy: { objective },
    };
  },
);

async function main() {
  console.log("Seeding database...");
  await resetDatabase();

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
  const publicPaidRegistration = await prisma.sessionRegistration.upsert({
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

  for (const seededPlayer of [player, extraPlayer1, extraPlayer2]) {
    await prisma.wallet.upsert({
      where: { userId: seededPlayer.id },
      update: { balanceXaf: 10000, isFrozen: false },
      create: { userId: seededPlayer.id, balanceXaf: 10000 },
    });
  }

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

  await createSeedPaymentTrace({
    userId: player.id,
    sessionId: publicSession.id,
    registrationId: publicPaidRegistration.id,
    amountXaf: publicSession.entryFeeXaf,
    paidAt: new Date("2026-07-07T00:00:00Z"),
    scenario: "test-public-paid",
  });

  // Register player in second public session
  const nightDropRegistration = await prisma.sessionRegistration.upsert({
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

  await createSeedPaymentTrace({
    userId: player.id,
    sessionId: publicSession2.id,
    registrationId: nightDropRegistration.id,
    amountXaf: publicSession2.entryFeeXaf,
    paidAt: new Date("2026-07-07T00:00:00Z"),
    scenario: "night-drop-paid",
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

  const liveSession = await prisma.gameSession.create({
    data: {
      code: "RECETTE-LIVE-6",
      name: "Recette live - 6 familles",
      description:
        "Session de recette complete avec Solo, Duel, Alliance, Equipe, Survie et Role cache.",
      status: "LIVE",
      minPlayers: 2,
      maxPlayers: 12,
      entryFee: 500,
      entryFeeXaf: 500,
      prizePool: 1500,
      prizePoolBps: 6000,
      winnerSplitBps: [6000, 3000, 1000],
      providerFeeBps: 300,
      configVersion: 1,
      startTime: new Date("2026-07-09T20:00:00Z"),
      registrationClosesAt: new Date("2026-07-09T19:45:00Z"),
      visibility: "PUBLIC",
      publishedAt: new Date("2026-07-09T12:00:00Z"),
      createdBy: admin.id,
    },
  });

  for (const seededPlayer of [player, extraPlayer1, extraPlayer2]) {
    const registration = await prisma.sessionRegistration.create({
      data: {
        userId: seededPlayer.id,
        sessionId: liveSession.id,
        status: "CHECKED_IN",
        paidAt: new Date("2026-07-09T12:10:00Z"),
        checkedInAt: new Date("2026-07-09T19:50:00Z"),
      },
    });
    await createSeedPaymentTrace({
      userId: seededPlayer.id,
      sessionId: liveSession.id,
      registrationId: registration.id,
      amountXaf: liveSession.entryFeeXaf,
      paidAt: new Date("2026-07-09T12:10:00Z"),
      scenario: `live-recette-${seededPlayer.id}`,
    });
  }

  await prisma.liveSessionState.create({
    data: {
      sessionId: liveSession.id,
      phase: "BRIEFING",
      phaseStartedAt: new Date("2026-07-09T20:00:00Z"),
    },
  });

  for (const [index, key] of [...RECETTE_MINIGAME_KEYS].entries()) {
    const definition = await prisma.miniGameDefinition.findFirstOrThrow({
      where: { key, enabled: true },
      orderBy: { version: "desc" },
    });
    await prisma.roundInstance.create({
      data: {
        sessionId: liveSession.id,
        miniGameDefinitionId: definition.id,
        roundNum: index + 1,
        status: "PENDING",
        configJson: {
          seed: `seed-${liveSession.code}-${key}`,
          miniGameKey: key,
          ...(definition.defaultConfig && typeof definition.defaultConfig === "object"
            ? (definition.defaultConfig as Record<string, unknown>)
            : {}),
        },
      },
    });
  }

  await assertSeedTraceability();

  console.log("Seed completed:");
  console.log(`  - Admin: ${admin.email}`);
  console.log(`  - Players: ${player.email}, ${extraPlayer1.email}, ${extraPlayer2.email}`);
  console.log(`  - Public Session 1: ${publicSession.code} (2 active, 1 cancelled registrations)`);
  console.log(`  - Public Session 2: ${publicSession2.code} (1 active registration)`);
  console.log(`  - Unlisted Session: ${unlistedSession.code}`);
  console.log(`  - Private Session: ${privateSession.code}`);
  console.log(`  - Live Recette Session: ${liveSession.code} (6 family rounds)`);
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
