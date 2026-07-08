import { z } from "zod";
import {
  GameResultStatus,
  GameSessionStatus,
  LedgerDirection,
  LedgerType,
  Prisma,
  SessionRegistrationStatus,
  prisma,
} from "@session-jeu/db";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,24}$/;
const DEFAULT_HISTORY_LIMIT = 20;
const MAX_HISTORY_LIMIT = 100;

export const playerPublicIdParamsSchema = z.object({
  publicId: z.string().trim().min(1).max(64),
});

export const playerHistoryQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_HISTORY_LIMIT).default(DEFAULT_HISTORY_LIMIT),
});

export const patchPlayerProfileSchema = z
  .object({
    username: z.string().trim().min(1).max(64).optional(),
    bio: z.string().trim().max(280).nullable().optional(),
    avatarUrl: z.string().trim().url().max(500).nullable().optional(),
    preferences: z.record(z.string(), z.unknown()).nullable().optional(),
    isPublic: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

type StatsSource = {
  gameResults: Array<{
    finalRank: number | null;
    finalStatus: GameResultStatus | string;
  }>;
  prizeLedger: {
    _sum: {
      amountXaf: number | null;
    };
  };
};

type PlayerStats = {
  sessionsPlayed: number;
  sessionsWon: number;
  winRate: number;
  avgFinalRank: number | null;
  creditsWonXaf: number;
};

type PlayerProfileRecord = {
  id: string;
  userId: string;
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  preferences: Prisma.JsonValue | null;
  isPublic: boolean;
  level: number;
  xp: number;
  createdAt: Date;
  updatedAt: Date;
};

type PlayerStatsSnapshotRecord = PlayerStats & {
  id: string;
  userId: string;
  computedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

function serializeDate(date: Date | null | undefined) {
  return date?.toISOString() ?? null;
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string) {
  return USERNAME_PATTERN.test(username);
}

function defaultUsernameForUser(userId: string) {
  return `player_${userId.replace(/[^a-zA-Z0-9]/g, "").slice(-12).toLowerCase()}`;
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function nullableJsonInput(value: Record<string, unknown> | null) {
  return value === null ? Prisma.JsonNull : (value as Prisma.InputJsonObject);
}

function auditChanges(input: {
  oldProfile: PlayerProfileRecord;
  newProfile: PlayerProfileRecord;
}) {
  const oldData: Record<string, unknown> = {};
  const newData: Record<string, unknown> = {};

  for (const key of ["username", "avatarUrl", "isPublic"] as const) {
    if (input.oldProfile[key] !== input.newProfile[key]) {
      oldData[key] = input.oldProfile[key];
      newData[key] = input.newProfile[key];
    }
  }

  return Object.keys(newData).length > 0 ? { oldData, newData } : null;
}

function serializeStats(stats: PlayerStats | PlayerStatsSnapshotRecord | null | undefined) {
  return {
    sessionsPlayed: stats?.sessionsPlayed ?? 0,
    sessionsWon: stats?.sessionsWon ?? 0,
    winRate: stats?.winRate ?? 0,
    avgFinalRank: stats?.avgFinalRank ?? null,
    creditsWonXaf: stats?.creditsWonXaf ?? 0,
    computedAt: "computedAt" in (stats ?? {}) ? serializeDate((stats as PlayerStatsSnapshotRecord).computedAt) : null,
  };
}

export function serializePrivateProfile(input: {
  profile: PlayerProfileRecord;
  stats: PlayerStatsSnapshotRecord | null;
}) {
  return {
    id: input.profile.id,
    userId: input.profile.userId,
    username: input.profile.username,
    bio: input.profile.bio,
    avatarUrl: input.profile.avatarUrl,
    preferences: input.profile.preferences ?? {},
    isPublic: input.profile.isPublic,
    level: input.profile.level,
    xp: input.profile.xp,
    stats: serializeStats(input.stats),
    createdAt: input.profile.createdAt.toISOString(),
    updatedAt: input.profile.updatedAt.toISOString(),
  };
}

export function serializePublicProfile(input: {
  profile: PlayerProfileRecord;
  stats: PlayerStatsSnapshotRecord | null;
}) {
  return {
    username: input.profile.username,
    bio: input.profile.bio,
    avatarUrl: input.profile.avatarUrl,
    level: input.profile.level,
    stats: serializeStats(input.stats),
  };
}

export function calculatePlayerStats(input: StatsSource): PlayerStats {
  const playedStatuses = new Set<string>([
    GameResultStatus.WINNER,
    GameResultStatus.ELIMINATED,
    GameResultStatus.COMPLETED,
  ]);
  const playedResults = input.gameResults.filter((result) =>
    playedStatuses.has(String(result.finalStatus)),
  );
  const rankResults = playedResults.filter(
    (result): result is { finalRank: number; finalStatus: GameResultStatus | string } =>
      Number.isInteger(result.finalRank),
  );
  const sessionsPlayed = playedResults.length;
  const sessionsWon = playedResults.filter(
    (result) => result.finalStatus === GameResultStatus.WINNER || result.finalStatus === "WINNER",
  ).length;
  const avgFinalRank =
    rankResults.length > 0
      ? rankResults.reduce((sum, result) => sum + result.finalRank, 0) / rankResults.length
      : null;

  return {
    sessionsPlayed,
    sessionsWon,
    winRate: sessionsWon / Math.max(1, sessionsPlayed),
    avgFinalRank,
    creditsWonXaf: input.prizeLedger._sum.amountXaf ?? 0,
  };
}

export async function getOrCreatePlayerProfile(userId: string) {
  const existing = await prisma.playerProfile.findUnique({
    where: { userId },
    include: { user: { select: { statsSnapshot: true } } },
  });
  if (existing) {
    return {
      profile: existing,
      stats: existing.user.statsSnapshot,
    };
  }

  const profile = await prisma.playerProfile.create({
    data: {
      userId,
      username: defaultUsernameForUser(userId),
    },
    include: { user: { select: { statsSnapshot: true } } },
  });

  return {
    profile,
    stats: profile.user.statsSnapshot,
  };
}

export async function updatePlayerProfile(input: {
  userId: string;
  data: z.infer<typeof patchPlayerProfileSchema>;
}) {
  const normalizedUsername =
    typeof input.data.username === "string" ? normalizeUsername(input.data.username) : undefined;

  if (normalizedUsername !== undefined && !isValidUsername(normalizedUsername)) {
    return { type: "invalid-username" as const };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const current =
        (await tx.playerProfile.findUnique({ where: { userId: input.userId } })) ??
        (await tx.playerProfile.create({
          data: {
            userId: input.userId,
            username: defaultUsernameForUser(input.userId),
          },
        }));

      const profile = await tx.playerProfile.update({
        where: { userId: input.userId },
        data: {
          ...(normalizedUsername !== undefined ? { username: normalizedUsername } : {}),
          ...(input.data.bio !== undefined ? { bio: input.data.bio } : {}),
          ...(input.data.avatarUrl !== undefined ? { avatarUrl: input.data.avatarUrl } : {}),
          ...(input.data.preferences !== undefined
            ? { preferences: nullableJsonInput(input.data.preferences) }
            : {}),
          ...(input.data.isPublic !== undefined ? { isPublic: input.data.isPublic } : {}),
        },
      });

      const changes = auditChanges({ oldProfile: current, newProfile: profile });
      if (changes) {
        await tx.auditLog.create({
          data: {
            userId: input.userId,
            action: "profile.updated",
            entity: "PlayerProfile",
            entityId: profile.id,
            oldData: changes.oldData as Prisma.InputJsonObject,
            newData: changes.newData as Prisma.InputJsonObject,
          },
        });
      }

      return profile;
    });

    const stats = await prisma.playerStatsSnapshot.findUnique({ where: { userId: input.userId } });
    return { type: "ok" as const, profile: updated, stats };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { type: "username-taken" as const };
    }
    throw error;
  }
}

export async function recomputePlayerStats(userId: string, now = new Date()) {
  const [gameResults, prizeLedger] = await Promise.all([
    prisma.gameResult.findMany({
      where: { userId },
      select: {
        finalRank: true,
        finalStatus: true,
      },
    }),
    prisma.ledgerEntry.aggregate({
      where: {
        userId,
        direction: LedgerDirection.CREDIT,
        type: LedgerType.PRIZE,
      },
      _sum: { amountXaf: true },
    }),
  ]);

  const stats = calculatePlayerStats({ gameResults, prizeLedger });
  const snapshot = await prisma.playerStatsSnapshot.upsert({
    where: { userId },
    update: {
      ...stats,
      computedAt: now,
    },
    create: {
      userId,
      ...stats,
      computedAt: now,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "stats.recomputed",
      entity: "PlayerStatsSnapshot",
      entityId: snapshot.id,
      newData: serializeStats(snapshot),
    },
  });

  return snapshot;
}

export async function recomputeSessionPlayerStats(sessionId: string) {
  const results = await prisma.gameResult.findMany({
    where: { sessionId },
    select: { userId: true },
    distinct: ["userId"],
  });

  return Promise.all(results.map((result) => recomputePlayerStats(result.userId)));
}

function historyBucket(input: {
  registrationStatus: SessionRegistrationStatus | string;
  sessionStatus: GameSessionStatus | string;
  startTime: Date | null;
  now: Date;
}) {
  if (
    input.registrationStatus === SessionRegistrationStatus.NO_SHOW ||
    input.registrationStatus === "NO_SHOW"
  ) {
    return "no-show";
  }
  if (
    input.registrationStatus === SessionRegistrationStatus.CANCELLED ||
    input.registrationStatus === SessionRegistrationStatus.REFUNDED ||
    input.sessionStatus === GameSessionStatus.CANCELLED
  ) {
    return "cancelled";
  }
  if (input.sessionStatus === GameSessionStatus.COMPLETED) return "completed";
  if (
    input.sessionStatus === GameSessionStatus.ACTIVE ||
    input.sessionStatus === GameSessionStatus.WAITING_START ||
    input.sessionStatus === GameSessionStatus.LIVE
  ) {
    return "live";
  }
  if (input.startTime && input.startTime > input.now) return "future";
  return "future";
}

export async function listPlayerHistory(input: {
  userId: string;
  cursor?: string;
  limit?: number;
  now?: Date;
}) {
  const limit = input.limit ?? DEFAULT_HISTORY_LIMIT;
  const registrations = await prisma.sessionRegistration.findMany({
    where: { userId: input.userId },
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: {
      session: {
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          startTime: true,
          endTime: true,
          cancelledAt: true,
        },
      },
    },
  });

  const pageItems = registrations.slice(0, limit);
  const results = await prisma.gameResult.findMany({
    where: {
      userId: input.userId,
      sessionId: { in: pageItems.map((registration) => registration.sessionId) },
    },
    select: {
      sessionId: true,
      finalRank: true,
      finalStatus: true,
      prizeWonXaf: true,
      finalizedAt: true,
    },
  });
  const resultBySessionId = new Map(results.map((result) => [result.sessionId, result]));
  const now = input.now ?? new Date();

  return {
    entries: pageItems.map((registration) => {
      const result = resultBySessionId.get(registration.sessionId);
      return {
        registrationId: registration.id,
        session: {
          id: registration.session.id,
          code: registration.session.code,
          name: registration.session.name,
          status: registration.session.status,
          startTime: serializeDate(registration.session.startTime),
          endTime: serializeDate(registration.session.endTime),
          cancelledAt: serializeDate(registration.session.cancelledAt),
        },
        registrationStatus: registration.status,
        bucket: historyBucket({
          registrationStatus: registration.status,
          sessionStatus: registration.session.status,
          startTime: registration.session.startTime,
          now,
        }),
        result: result
          ? {
              finalRank: result.finalRank,
              finalStatus: result.finalStatus,
              prizeWonXaf: result.prizeWonXaf,
              finalizedAt: serializeDate(result.finalizedAt),
            }
          : null,
        createdAt: registration.createdAt.toISOString(),
        updatedAt: registration.updatedAt.toISOString(),
      };
    }),
    nextCursor: registrations.length > limit ? registrations[limit]?.id ?? null : null,
  };
}

export async function getPublicPlayerProfile(publicId: string) {
  const username = normalizeUsername(publicId);
  const profile = await prisma.playerProfile.findUnique({
    where: { username },
    include: { user: { select: { statsSnapshot: true } } },
  });

  if (!profile) return { type: "not-found" as const };
  if (!profile.isPublic) return { type: "private" as const };

  return {
    type: "ok" as const,
    profile,
    stats: profile.user.statsSnapshot,
  };
}
