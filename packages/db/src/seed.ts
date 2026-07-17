/**
 * Deterministic foundation seed for v0.1 / production data model.
 *
 * - Upsert by stable unique keys (email, party code, composite uniques).
 * - Safe to run twice: second run re-affirms the same graph without orphans.
 * - Demo password for all seeded users: SeedPass123! (test/local only).
 * - Forbidden when APP_ENV is production or staging.
 * - Never logs credential values or secret material.
 */
import {
  EncryptedSecretPurpose,
  EncryptionKeyStatus,
  PaymentStatus,
  PaymentInternalStatus,
  ProviderServiceKind,
  RetentionAction,
  type PrismaClient,
} from "@prisma/client";

/** Fixed scrypt hash for password "SeedPass123!" (same format as apps/api). */
export const SEED_PASSWORD_HASH =
  "scrypt$16384$8$1$64$c2VlZC12MC4xLWZpeGVkLXNhbHQAAAAAAAAAAAAAAAA$h5jyz_hjh8nABuYvlOigv2PoybonwRSgRo9oj7oFINgyskiYj7oN9kjYnx5w89dRe2j9h7Oi1PrOXAJcfUSHGg";

export const SEED = {
  admin: { email: "admin@seed.local", name: "Seed Admin", role: "ADMIN" },
  support: { email: "support@seed.local", name: "Seed Support", role: "SUPPORT" },
  finance: { email: "finance@seed.local", name: "Seed Finance", role: "FINANCE" },
  player1: { email: "player1@seed.local", name: "Seed Player One", role: "PLAYER" },
  player2: { email: "player2@seed.local", name: "Seed Player Two", role: "PLAYER" },
  partyCode: "SEED-PARTY-01",
  partyName: "Seed Published Party",
  entryFeeAmount: 500,
  entryFeeCurrency: "XAF",
  configVersion: 1,
  feeVersion: 1,
  walletBalance: 1000,
  walletCurrency: "XAF",
  minigame: "memory_sequence",
  adminSessionToken: "seed-admin-session-token",
  player1SessionToken: "seed-player1-session-token",
  player1ConnectionId: "seed-player1-connection",
  player1TokenHash: "seed-player1-token-hash",
  paymentIdempotencyP1: "seed-wallet-credit-p1",
  paymentIdempotencyP2: "seed-wallet-credit-p2",
  encryptionKeyId: "seed-key-checkpoint-v1",
  consentPolicyKey: "privacy",
  consentPolicyVersion: "1.0.0",
} as const;

export type SeedResult = {
  users: {
    adminId: string;
    supportId: string;
    financeId: string;
    player1Id: string;
    player2Id: string;
  };
  partyId: string;
  roundId: string;
  participationIds: { player1: string; player2: string };
  reRun: boolean;
};

/**
 * Block seed in staging/production. Safe for unit tests that pass APP_ENV explicitly.
 */
export function assertSeedAllowed(env: NodeJS.ProcessEnv = process.env): void {
  const appEnv = (env.APP_ENV || "").toLowerCase();
  if (appEnv === "production" || appEnv === "staging") {
    throw new Error(`db:seed forbidden when APP_ENV=${appEnv}`);
  }
}

async function upsertUserWithRole(
  prisma: PrismaClient,
  email: string,
  name: string,
  role: string,
): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      passwordHash: SEED_PASSWORD_HASH,
      isActive: true,
      roleAssignments: { create: { role } },
    },
    update: {
      name,
      passwordHash: SEED_PASSWORD_HASH,
      isActive: true,
    },
  });

  await prisma.roleAssignment.upsert({
    where: { userId_role: { userId: user.id, role } },
    create: { userId: user.id, role },
    update: {},
  });

  return user.id;
}

async function ensureWallet(
  prisma: PrismaClient,
  userId: string,
  idempotencyKey: string,
): Promise<void> {
  const wallet = await prisma.wallet.upsert({
    where: { userId },
    create: {
      userId,
      balance: SEED.walletBalance,
      currency: SEED.walletCurrency,
    },
    update: {
      currency: SEED.walletCurrency,
    },
  });

  const existing = await prisma.paymentTransaction.findUnique({
    where: { idempotencyKey },
  });
  if (existing) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const again = await tx.paymentTransaction.findUnique({ where: { idempotencyKey } });
    if (again) return;

    const transaction = await tx.paymentTransaction.create({
      data: {
        walletId: wallet.id,
        userId,
        amount: SEED.walletBalance,
        type: "WALLET_CREDIT",
        provider: "SEED",
        reference: idempotencyKey,
        idempotencyKey,
        status: PaymentStatus.SUCCESSFUL,
        internalStatus: PaymentInternalStatus.SUCCEEDED,
        serviceKind: ProviderServiceKind.COLLECTION,
        settledAt: new Date(),
      },
    });

    const current = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
    const nextBalance =
      Number(current.balance) === 0 ? SEED.walletBalance : Number(current.balance);

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: nextBalance },
    });

    await tx.ledgerEntry.create({
      data: {
        transactionId: transaction.id,
        walletId: wallet.id,
        debit: 0,
        credit: SEED.walletBalance,
        balance: nextBalance,
        balanceAfter: nextBalance,
        reason: "Seed wallet credit",
        idempotencyKey,
      },
    });
  });
}

/**
 * Apply the deterministic seed graph. Safe to call repeatedly.
 */
export async function runSeed(prisma: PrismaClient): Promise<SeedResult> {
  assertSeedAllowed();

  const priorParty = await prisma.party.findUnique({ where: { code: SEED.partyCode } });
  const reRun = !!priorParty;

  const adminId = await upsertUserWithRole(prisma, SEED.admin.email, SEED.admin.name, SEED.admin.role);
  const supportId = await upsertUserWithRole(
    prisma,
    SEED.support.email,
    SEED.support.name,
    SEED.support.role,
  );
  const financeId = await upsertUserWithRole(
    prisma,
    SEED.finance.email,
    SEED.finance.name,
    SEED.finance.role,
  );
  const player1Id = await upsertUserWithRole(
    prisma,
    SEED.player1.email,
    SEED.player1.name,
    SEED.player1.role,
  );
  const player2Id = await upsertUserWithRole(
    prisma,
    SEED.player2.email,
    SEED.player2.name,
    SEED.player2.role,
  );

  const sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.authSession.upsert({
    where: { token: SEED.adminSessionToken },
    create: {
      userId: adminId,
      token: SEED.adminSessionToken,
      expiresAt: sessionExpires,
      sessionVersion: 0,
    },
    update: {
      userId: adminId,
      expiresAt: sessionExpires,
      sessionVersion: 0,
    },
  });
  await prisma.authSession.upsert({
    where: { token: SEED.player1SessionToken },
    create: {
      userId: player1Id,
      token: SEED.player1SessionToken,
      expiresAt: sessionExpires,
      sessionVersion: 0,
    },
    update: {
      userId: player1Id,
      expiresAt: sessionExpires,
      sessionVersion: 0,
    },
  });

  const party = await prisma.party.upsert({
    where: { code: SEED.partyCode },
    create: {
      code: SEED.partyCode,
      name: SEED.partyName,
      status: "SCHEDULED",
      visibility: "public",
      minPlayers: 2,
      maxPlayers: 8,
      entryFeeAmount: SEED.entryFeeAmount,
      entryFeeCurrency: SEED.entryFeeCurrency,
      configVersion: SEED.configVersion,
      feeVersion: SEED.feeVersion,
      scheduledAt: new Date("2030-01-15T18:00:00.000Z"),
      roundProgram: {
        rounds: [{ number: 1, minigame: SEED.minigame }],
      },
    },
    update: {
      name: SEED.partyName,
      status: "SCHEDULED",
      visibility: "public",
      minPlayers: 2,
      maxPlayers: 8,
      entryFeeAmount: SEED.entryFeeAmount,
      entryFeeCurrency: SEED.entryFeeCurrency,
      configVersion: SEED.configVersion,
      feeVersion: SEED.feeVersion,
      scheduledAt: new Date("2030-01-15T18:00:00.000Z"),
      roundProgram: {
        rounds: [{ number: 1, minigame: SEED.minigame }],
      },
    },
  });

  const p1 = await prisma.partyParticipation.upsert({
    where: { partyId_userId: { partyId: party.id, userId: player1Id } },
    create: {
      partyId: party.id,
      userId: player1Id,
      role: "player",
      status: "REGISTERED",
      paymentState: "NONE",
      admissionState: "PENDING",
      readinessState: "ready",
      connectionState: "disconnected",
      idempotencyKey: "seed-participation-p1",
    },
    update: {
      status: "REGISTERED",
      readinessState: "ready",
      role: "player",
      paymentState: "NONE",
      admissionState: "PENDING",
    },
  });

  const p2 = await prisma.partyParticipation.upsert({
    where: { partyId_userId: { partyId: party.id, userId: player2Id } },
    create: {
      partyId: party.id,
      userId: player2Id,
      role: "player",
      status: "REGISTERED",
      paymentState: "NONE",
      admissionState: "PENDING",
      readinessState: "ready",
      connectionState: "disconnected",
      idempotencyKey: "seed-participation-p2",
    },
    update: {
      status: "REGISTERED",
      readinessState: "ready",
      role: "player",
      paymentState: "NONE",
      admissionState: "PENDING",
    },
  });

  await ensureWallet(prisma, player1Id, SEED.paymentIdempotencyP1);
  await ensureWallet(prisma, player2Id, SEED.paymentIdempotencyP2);

  // Dual Fapshi credential refs (env key names only — never secret values).
  await prisma.providerCredentialRef.upsert({
    where: {
      serviceKind_name: {
        serviceKind: ProviderServiceKind.COLLECTION,
        name: "fapshi-collection-default",
      },
    },
    create: {
      serviceKind: ProviderServiceKind.COLLECTION,
      name: "fapshi-collection-default",
      envKeyName: "FAPSHI_COLLECTION_API_KEY",
      provider: "fapshi",
    },
    update: {
      envKeyName: "FAPSHI_COLLECTION_API_KEY",
      isActive: true,
    },
  });
  await prisma.providerCredentialRef.upsert({
    where: {
      serviceKind_name: {
        serviceKind: ProviderServiceKind.PAYOUT,
        name: "fapshi-payout-default",
      },
    },
    create: {
      serviceKind: ProviderServiceKind.PAYOUT,
      name: "fapshi-payout-default",
      envKeyName: "FAPSHI_PAYOUT_API_KEY",
      provider: "fapshi",
    },
    update: {
      envKeyName: "FAPSHI_PAYOUT_API_KEY",
      isActive: true,
    },
  });

  await prisma.realtimeConnection.upsert({
    where: { participationId: p1.id },
    create: {
      participationId: p1.id,
      connectionId: SEED.player1ConnectionId,
      state: "disconnected",
      tokenHash: SEED.player1TokenHash,
      tokenExpiresAt: sessionExpires,
    },
    update: {
      connectionId: SEED.player1ConnectionId,
      tokenHash: SEED.player1TokenHash,
      tokenExpiresAt: sessionExpires,
      state: "disconnected",
      disconnectedAt: null,
    },
  });

  const round = await prisma.round.upsert({
    where: { partyId_number: { partyId: party.id, number: 1 } },
    create: {
      partyId: party.id,
      number: 1,
      minigame: SEED.minigame,
      status: "SETUP",
      runtimeVersion: "1.0.0",
      configVersion: 1,
    },
    update: {
      minigame: SEED.minigame,
      status: "SETUP",
      runtimeVersion: "1.0.0",
      configVersion: 1,
    },
  });

  await prisma.roundParticipant.upsert({
    where: { roundId_participationId: { roundId: round.id, participationId: p1.id } },
    create: {
      roundId: round.id,
      participationId: p1.id,
      status: "PENDING",
    },
    update: { status: "PENDING" },
  });
  await prisma.roundParticipant.upsert({
    where: { roundId_participationId: { roundId: round.id, participationId: p2.id } },
    create: {
      roundId: round.id,
      participationId: p2.id,
      status: "PENDING",
    },
    update: { status: "PENDING" },
  });

  // Encryption key metadata only (placeholder wrapped material, not a real secret).
  const encKey = await prisma.encryptionKey.upsert({
    where: { keyId: SEED.encryptionKeyId },
    create: {
      keyId: SEED.encryptionKeyId,
      purpose: EncryptedSecretPurpose.CHECKPOINT,
      algorithm: "AES-256-GCM",
      status: EncryptionKeyStatus.ACTIVE,
      kmsKeyRef: "seed/local/checkpoint",
      createdByUserId: adminId,
      wrappedMaterial: Buffer.from("seed-wrapped-placeholder-not-a-secret"),
    },
    update: {
      status: EncryptionKeyStatus.ACTIVE,
      kmsKeyRef: "seed/local/checkpoint",
    },
  });

  // Ciphertext-only checkpoint (opaque bytes — not cleartext game state).
  const checkpointCipher = Buffer.from("seed-checkpoint-ciphertext-opaque");
  const existingCheckpoint = await prisma.roundCheckpoint.findUnique({
    where: { roundId_version: { roundId: round.id, version: 1 } },
  });
  if (!existingCheckpoint) {
    await prisma.roundCheckpoint.create({
      data: {
        roundId: round.id,
        version: 1,
        phase: "SETUP",
        configVersion: 1,
        runtimeVersion: "1.0.0",
        payloadCipher: checkpointCipher,
        payloadHash: "seed-checkpoint-hash",
        keyId: encKey.id,
        acceptedInputIds: [],
        deadlines: {},
      },
    });
  }

  await prisma.minigameManifest.upsert({
    where: { key_version: { key: SEED.minigame, version: "1.0.0" } },
    create: {
      key: SEED.minigame,
      family: "SOLO",
      name: "Memory Sequence",
      version: "1.0.0",
      enabled: true,
      production: true,
      config: { length: 4 },
    },
    update: {
      enabled: true,
      production: true,
      family: "SOLO",
      name: "Memory Sequence",
    },
  });

  const retentionRules: Array<{
    domain: string;
    entityType: string;
    retainDays: number;
    action: RetentionAction;
  }> = [
    { domain: "game", entityType: "RoundCheckpoint", retainDays: 90, action: RetentionAction.DELETE },
    { domain: "game", entityType: "EncryptedSecret", retainDays: 90, action: RetentionAction.DELETE },
    { domain: "finance", entityType: "PaymentTransaction", retainDays: 2555, action: RetentionAction.KEEP },
    { domain: "audit", entityType: "AuditLog", retainDays: 2555, action: RetentionAction.KEEP },
  ];
  for (const rule of retentionRules) {
    await prisma.retentionPolicyRule.upsert({
      where: {
        domain_entityType: { domain: rule.domain, entityType: rule.entityType },
      },
      create: {
        domain: rule.domain,
        entityType: rule.entityType,
        retainDays: rule.retainDays,
        action: rule.action,
        active: true,
      },
      update: {
        retainDays: rule.retainDays,
        action: rule.action,
        active: true,
      },
    });
  }

  await prisma.consentRecord.upsert({
    where: {
      userId_policyKey_policyVersion: {
        userId: player1Id,
        policyKey: SEED.consentPolicyKey,
        policyVersion: SEED.consentPolicyVersion,
      },
    },
    create: {
      userId: player1Id,
      policyKey: SEED.consentPolicyKey,
      policyVersion: SEED.consentPolicyVersion,
    },
    update: {},
  });

  const prov1 = await prisma.provisionalScore.upsert({
    where: { roundId_participationId: { roundId: round.id, participationId: p1.id } },
    create: {
      roundId: round.id,
      participationId: p1.id,
      score: 10,
      rank: 1,
      status: "PENDING",
      evidenceHash: "seed-evidence-p1",
      evidence: { source: "seed" },
    },
    update: {
      score: 10,
      rank: 1,
      status: "PENDING",
      evidenceHash: "seed-evidence-p1",
    },
  });
  const prov2 = await prisma.provisionalScore.upsert({
    where: { roundId_participationId: { roundId: round.id, participationId: p2.id } },
    create: {
      roundId: round.id,
      participationId: p2.id,
      score: 8,
      rank: 2,
      status: "PENDING",
      evidenceHash: "seed-evidence-p2",
      evidence: { source: "seed" },
    },
    update: {
      score: 8,
      rank: 2,
      status: "PENDING",
      evidenceHash: "seed-evidence-p2",
    },
  });

  const reviewCount = await prisma.scoreReview.count({
    where: { provisionalScoreId: prov1.id },
  });
  if (reviewCount === 0) {
    await prisma.scoreReview.create({
      data: {
        provisionalScoreId: prov1.id,
        reviewedBy: adminId,
        action: "APPROVE",
        reason: "Seed baseline approval",
        previousScore: 10,
        newScore: 10,
      },
    });
  }

  await prisma.publishedScore.upsert({
    where: { provisionalScoreId: prov1.id },
    create: {
      provisionalScoreId: prov1.id,
      roundId: round.id,
      participationId: p1.id,
      score: 10,
      rank: 1,
      publishedBy: adminId,
      evidenceHash: "seed-evidence-p1",
    },
    update: {
      score: 10,
      rank: 1,
      publishedBy: adminId,
      evidenceHash: "seed-evidence-p1",
    },
  });
  void prov2;

  const existingAnnouncement = await prisma.announcement.findFirst({
    where: { partyId: party.id, title: "Seed lobby announcement" },
  });
  if (!existingAnnouncement) {
    await prisma.announcement.create({
      data: {
        partyId: party.id,
        title: "Seed lobby announcement",
        body: "Bienvenue — partie seed publiee pour auth/lobby/live/scoring.",
        createdBy: adminId,
      },
    });
  }

  let job = await prisma.notificationJob.findFirst({
    where: {
      userId: player1Id,
      type: "SEED_LOBBY_REMINDER",
    },
  });
  if (!job) {
    job = await prisma.notificationJob.create({
      data: {
        userId: player1Id,
        type: "SEED_LOBBY_REMINDER",
        payload: { partyCode: SEED.partyCode, source: "seed" },
        status: "SENT",
        sentAt: new Date(),
        idempotencyKey: "seed-notif-p1-lobby",
      },
    });
  } else {
    job = await prisma.notificationJob.update({
      where: { id: job.id },
      data: {
        payload: { partyCode: SEED.partyCode, source: "seed" },
        status: "SENT",
        sentAt: job.sentAt ?? new Date(),
      },
    });
  }

  const deliveryCount = await prisma.deliveryLog.count({ where: { jobId: job.id } });
  if (deliveryCount === 0) {
    await prisma.deliveryLog.create({
      data: {
        jobId: job.id,
        channel: "in_app",
        status: "SENT",
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: reRun ? "SEED_RERUN" : "SEED_APPLY",
      entity: "Party",
      entityId: party.id,
      result: "SUCCESS",
      metadata: { partyCode: SEED.partyCode, source: "packages/db/src/seed.ts" },
    },
  });

  return {
    users: {
      adminId,
      supportId,
      financeId,
      player1Id,
      player2Id,
    },
    partyId: party.id,
    roundId: round.id,
    participationIds: { player1: p1.id, player2: p2.id },
    reRun,
  };
}
