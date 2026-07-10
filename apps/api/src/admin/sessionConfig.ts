import { z } from "zod";

export const MIN_ENTRY_FEE_XAF = 100;
export const DEFAULT_PROVIDER_FEE_BPS = 300;
export const DEFAULT_PRIZE_POOL_BPS = 6000;
export const DEFAULT_WINNER_SPLIT_BPS = [10000] as const;

const xafAmountSchema = z.int().min(0).max(100_000_000);
const bpsSchema = z.int().min(0).max(10000);
const winnerSplitSchema = z
  .array(z.int().min(1).max(10000))
  .min(1)
  .max(10)
  .refine((splits) => splits.reduce((total, split) => total + split, 0) === 10000, {
    message: "La somme des parts doit etre egale a 10000",
  });

export const createAdminSessionSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3)
      .max(64)
      .regex(/^[A-Z0-9-]+$/)
      .optional(),
    name: z.string().trim().min(3).max(120),
    description: z.string().trim().max(1000).optional(),
    minPlayers: z.int().min(2).default(2),
    maxPlayers: z.int().min(2).default(10),
    entryFeeXaf: xafAmountSchema.min(MIN_ENTRY_FEE_XAF),
    visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).default("PRIVATE"),
    prizePoolBps: bpsSchema.default(DEFAULT_PRIZE_POOL_BPS),
    winnerSplitBps: winnerSplitSchema.default([...DEFAULT_WINNER_SPLIT_BPS]),
    providerFeeBps: bpsSchema.default(DEFAULT_PROVIDER_FEE_BPS),
    selectedMiniGameIds: z.array(z.string()).optional(),
    startsAt: z.iso.datetime().optional(),
    registrationClosesAt: z.iso.datetime().optional(),
    reason: z.string().trim().min(3).max(500).optional(),
  })
  .superRefine((value, ctx) => {
    validateSessionTiming(value.startsAt, value.registrationClosesAt, ctx);
    validateCapacity(value.minPlayers, value.maxPlayers, ctx);
  });

export const updateAdminSessionSchema = z
  .object({
    expectedConfigVersion: z.int().min(1),
    name: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    minPlayers: z.int().min(2).optional(),
    maxPlayers: z.int().min(2).optional(),
    entryFeeXaf: xafAmountSchema.min(MIN_ENTRY_FEE_XAF).optional(),
    visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).optional(),
    prizePoolBps: bpsSchema.optional(),
    winnerSplitBps: winnerSplitSchema.optional(),
    providerFeeBps: bpsSchema.optional(),
    selectedMiniGameIds: z.array(z.string()).nullable().optional(),
    startsAt: z.iso.datetime().nullable().optional(),
    registrationClosesAt: z.iso.datetime().nullable().optional(),
    reason: z.string().trim().min(3).max(500),
  })
  .superRefine((value, ctx) => {
    if (value.minPlayers !== undefined && value.maxPlayers !== undefined) {
      validateCapacity(value.minPlayers, value.maxPlayers, ctx);
    }
    validateSessionTiming(
      value.startsAt ?? undefined,
      value.registrationClosesAt ?? undefined,
      ctx,
    );
  });

export const adminSessionParamsSchema = z.object({
  id: z.string().min(1),
});

export const versionedActionSchema = z.object({
  expectedConfigVersion: z.int().min(1),
  reason: z.string().trim().min(3).max(500),
});

export const cancelSessionSchema = z.object({
  expectedConfigVersion: z.int().min(1),
  reason: z.string().trim().min(3).max(500),
});

export type CreateAdminSessionInput = z.infer<typeof createAdminSessionSchema>;
export type UpdateAdminSessionInput = z.infer<typeof updateAdminSessionSchema>;
export type VersionedActionInput = z.infer<typeof versionedActionSchema>;
export type CancelSessionInput = z.infer<typeof cancelSessionSchema>;

type RefinementContext = {
  addIssue: (issue: { code: "custom"; message: string; path?: (string | number)[] }) => void;
};

function validateCapacity(minPlayers: number, maxPlayers: number, ctx: RefinementContext) {
  if (maxPlayers < minPlayers) {
    ctx.addIssue({
      code: "custom",
      path: ["maxPlayers"],
      message: "Le max de joueurs doit etre superieur ou egal au min",
    });
  }
}

function validateSessionTiming(
  startsAtInput: string | null | undefined,
  registrationClosesAtInput: string | null | undefined,
  ctx: RefinementContext,
) {
  const startsAt = startsAtInput ? new Date(startsAtInput) : null;
  const registrationClosesAt = registrationClosesAtInput
    ? new Date(registrationClosesAtInput)
    : null;

  if (startsAt && startsAt <= new Date()) {
    ctx.addIssue({
      code: "custom",
      path: ["startsAt"],
      message: "La date de debut doit etre dans le futur",
    });
  }

  if (startsAt && registrationClosesAt && registrationClosesAt > startsAt) {
    ctx.addIssue({
      code: "custom",
      path: ["registrationClosesAt"],
      message: "La fin des inscriptions doit etre avant le debut",
    });
  }
}

export function generateSessionCode(name: string, suffix: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return `${slug || "SESSION"}-${suffix}`;
}

export function calculateSessionFinancials(input: {
  paidRegistrationsCount: number;
  minPlayers: number;
  maxPlayers: number;
  entryFeeXaf: number;
  providerFeeBps: number;
  prizePoolBps: number;
  winnerSplitBps: number[];
}) {
  const current = calculateForPlayerCount({
    playerCount: input.paidRegistrationsCount,
    entryFeeXaf: input.entryFeeXaf,
    providerFeeBps: input.providerFeeBps,
    prizePoolBps: input.prizePoolBps,
    winnerSplitBps: input.winnerSplitBps,
  });
  const minimumViable = calculateForPlayerCount({
    playerCount: input.minPlayers,
    entryFeeXaf: input.entryFeeXaf,
    providerFeeBps: input.providerFeeBps,
    prizePoolBps: input.prizePoolBps,
    winnerSplitBps: input.winnerSplitBps,
  });
  const maximumProjected = calculateForPlayerCount({
    playerCount: input.maxPlayers,
    entryFeeXaf: input.entryFeeXaf,
    providerFeeBps: input.providerFeeBps,
    prizePoolBps: input.prizePoolBps,
    winnerSplitBps: input.winnerSplitBps,
  });

  return {
    paidRegistrationsCount: input.paidRegistrationsCount,
    ...current,
    minimumViableRevenueXaf: minimumViable.organizationCommissionXaf,
    maximumProjectedRevenueXaf: maximumProjected.organizationCommissionXaf,
    risks: [
      ...(current.organizationCommissionXaf < 0 ? ["NEGATIVE_MARGIN"] : []),
      ...(input.paidRegistrationsCount < input.minPlayers ? ["BELOW_MIN_PLAYERS"] : []),
    ],
  };
}

function calculateForPlayerCount(input: {
  playerCount: number;
  entryFeeXaf: number;
  providerFeeBps: number;
  prizePoolBps: number;
  winnerSplitBps: number[];
}) {
  const grossCollectionXaf = input.playerCount * input.entryFeeXaf;
  const estimatedFeesXaf = Math.floor((grossCollectionXaf * input.providerFeeBps) / 10000);
  const netCollectionXaf = grossCollectionXaf - estimatedFeesXaf;
  const prizePoolXaf = Math.floor((netCollectionXaf * input.prizePoolBps) / 10000);
  const winnerShareXaf = input.winnerSplitBps.map((split) =>
    Math.floor((prizePoolXaf * split) / 10000),
  );
  const allocatedWinnerShareXaf = winnerShareXaf.reduce((total, amount) => total + amount, 0);
  const roundingRemainderXaf = prizePoolXaf - allocatedWinnerShareXaf;
  const organizationCommissionXaf = netCollectionXaf - prizePoolXaf + roundingRemainderXaf;

  return {
    grossCollectionXaf,
    estimatedFeesXaf,
    netCollectionXaf,
    prizePoolXaf,
    winnerShareXaf,
    roundingRemainderXaf,
    organizationCommissionXaf,
  };
}

export const sensitiveAdminSessionFields = [
  "minPlayers",
  "maxPlayers",
  "entryFeeXaf",
  "prizePoolBps",
  "winnerSplitBps",
  "providerFeeBps",
] as const;
