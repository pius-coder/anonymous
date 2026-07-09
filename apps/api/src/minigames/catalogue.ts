import { z } from "zod";
import {
  MiniGameFamily,
  MiniGamePlayerMode,
  Prisma,
  prisma,
} from "@session-jeu/db";

export type MiniGameDefinitionSeed = {
  key: string;
  name: string;
  description: string;
  family: MiniGameFamily;
  playerMode: MiniGamePlayerMode;
  resolverId: "solo-score" | "duel-score";
  version: number;
  configSchema: Prisma.InputJsonObject;
  defaultConfig: Prisma.InputJsonObject;
  allowedActions: Array<{
    type: string;
    maxPerWindow: number;
    windowMs: number;
    requiresNonce: boolean;
  }>;
  antiCheatPolicy: Prisma.InputJsonObject;
  clientStateSchema: Prisma.InputJsonObject;
  uiCopy: Prisma.InputJsonObject;
};

const commonAntiCheat = {
  serverTimersOnly: true,
  nonceRequired: true,
  rejectAfterDeadline: true,
  sensitiveStateKeysBlocked: ["answer", "answers", "solution", "seed", "targetValue"],
};

const MVP_MINIGAME_SCHEMA_PLACEHOLDER = {
  type: "object",
  required: ["durationSeconds", "winnersCount", "maxAttempts"],
  properties: {
    durationSeconds: { type: "integer", minimum: 10, maximum: 180 },
    winnersCount: { type: "integer", minimum: 1, maximum: 100 },
    maxAttempts: { type: "integer", minimum: 1, maximum: 200 },
  },
} as const;

const soloScoreSchema = z.object({
  durationSeconds: z.number().int().min(10).max(180),
  winnersCount: z.number().int().min(1).max(100),
  maxAttempts: z.number().int().min(1).max(200),
});

const duelScoreSchema = z.object({
  durationSeconds: z.number().int().min(5).max(120),
  roundsToWin: z.number().int().min(1).max(5),
  falseStartPenaltyMs: z.number().int().min(0).max(5000),
});

const survivalScoreSchema = z.object({
  durationSeconds: z.number().int().min(15).max(240),
  winnersCount: z.number().int().min(1).max(100),
  hazardIntervalMs: z.number().int().min(500).max(10000),
});

export const MVP_MINIGAME_DEFINITIONS: MiniGameDefinitionSeed[] = [
  {
    key: "memory-sequence",
    name: "Sequence memoire",
    description: "Reproduire une sequence affichee par le serveur, classement par manches reussies.",
    family: MiniGameFamily.SOLO,
    playerMode: MiniGamePlayerMode.SOLO,
    resolverId: "solo-score",
    version: 1,
    configSchema: {
      type: "object",
      required: ["durationSeconds", "winnersCount", "maxAttempts"],
      properties: {
        durationSeconds: { type: "integer", minimum: 10, maximum: 180 },
        winnersCount: { type: "integer", minimum: 1, maximum: 100 },
        maxAttempts: { type: "integer", minimum: 1, maximum: 200 },
      },
    },
    defaultConfig: { durationSeconds: 60, winnersCount: 3, maxAttempts: 20 },
    allowedActions: [{ type: "sequence-input", maxPerWindow: 3, windowMs: 1000, requiresNonce: true }],
    antiCheatPolicy: commonAntiCheat,
    clientStateSchema: { phase: "string", roundNum: "number", deadlineEpochMs: "number" },
    uiCopy: { objective: "Memorise la suite et reproduis-la dans l'ordre." },
  },
  {
    key: "rapid-calculation",
    name: "Calcul rapide",
    description: "Serie de calculs server-side, classement par bonnes reponses puis temps.",
    family: MiniGameFamily.SOLO,
    playerMode: MiniGamePlayerMode.SOLO,
    resolverId: "solo-score",
    version: 1,
    configSchema: MVP_MINIGAME_SCHEMA_PLACEHOLDER,
    defaultConfig: { durationSeconds: 45, winnersCount: 3, maxAttempts: 30 },
    allowedActions: [{ type: "answer", maxPerWindow: 4, windowMs: 1000, requiresNonce: true }],
    antiCheatPolicy: commonAntiCheat,
    clientStateSchema: { phase: "string", promptId: "string", deadlineEpochMs: "number" },
    uiCopy: { objective: "Reponds au plus grand nombre de calculs avant la fin." },
  },
  {
    key: "pure-reaction-duel",
    name: "Reaction pure duel",
    description: "Duel de reaction apres signal serveur, faux depart penalise.",
    family: MiniGameFamily.DUEL,
    playerMode: MiniGamePlayerMode.DUEL,
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
    antiCheatPolicy: { ...commonAntiCheat, latencyCorrectionRequired: true },
    clientStateSchema: { phase: "string", signalVisible: "boolean", deadlineEpochMs: "number" },
    uiCopy: { objective: "Clique seulement apres le signal." },
  },
  {
    key: "target-precision",
    name: "Precision de tir",
    description: "Cibles generees cote serveur, classement par touches et precision.",
    family: MiniGameFamily.SOLO,
    playerMode: MiniGamePlayerMode.SOLO,
    resolverId: "solo-score",
    version: 1,
    configSchema: MVP_MINIGAME_SCHEMA_PLACEHOLDER,
    defaultConfig: { durationSeconds: 45, winnersCount: 3, maxAttempts: 40 },
    allowedActions: [{ type: "target-hit", maxPerWindow: 8, windowMs: 1000, requiresNonce: true }],
    antiCheatPolicy: { ...commonAntiCheat, hitboxValidatedServerSide: true },
    clientStateSchema: { phase: "string", visibleTargets: "array", deadlineEpochMs: "number" },
    uiCopy: { objective: "Touche les cibles visibles, evite les clics inutiles." },
  },
  {
    key: "safe-zones",
    name: "Zones sures",
    description: "Survie collective a zones sures, classement par statut et temps de survie.",
    family: MiniGameFamily.SURVIVAL,
    playerMode: MiniGamePlayerMode.GROUP,
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
    antiCheatPolicy: { ...commonAntiCheat, positionValidatedServerSide: true },
    clientStateSchema: { phase: "string", safeZones: "array", deadlineEpochMs: "number" },
    uiCopy: { objective: "Reste dans une zone sure quand le danger tombe." },
  },
];

const configValidators: Record<string, z.ZodType> = {
  "memory-sequence": soloScoreSchema,
  "rapid-calculation": soloScoreSchema,
  "target-precision": soloScoreSchema,
  "pure-reaction-duel": duelScoreSchema,
  "safe-zones": survivalScoreSchema,
};

export function validateMiniGameConfig(input: { key: string; config: unknown }) {
  const schema = configValidators[input.key];
  if (!schema) return { type: "unknown-minigame" as const };
  const result = schema.safeParse(input.config);
  if (!result.success) {
    return { type: "invalid" as const, issues: result.error.issues };
  }
  return { type: "ok" as const, config: result.data };
}

export function validateMiniGameAction(input: {
  definition: Pick<MiniGameDefinitionSeed, "allowedActions">;
  actionType: string;
  actionNonce: string;
  seenNonces: Set<string>;
  deadlineAt: Date;
  now?: Date;
  recentActionCount: number;
}) {
  const now = input.now ?? new Date();
  const rule = input.definition.allowedActions.find((action) => action.type === input.actionType);
  if (!rule) return { type: "action-not-allowed" as const };
  if (input.deadlineAt <= now) return { type: "action-too-late" as const };
  if (rule.requiresNonce && input.seenNonces.has(input.actionNonce)) {
    return { type: "duplicate-action" as const };
  }
  if (input.recentActionCount >= rule.maxPerWindow) {
    return { type: "rate-limit" as const, policy: rule };
  }
  return { type: "ok" as const, policy: rule };
}

export async function listMiniGames() {
  return prisma.miniGameDefinition.findMany({
    orderBy: [{ family: "asc" }, { key: "asc" }, { version: "desc" }],
  });
}

export async function setMiniGameEnabled(input: { id: string; enabled: boolean; adminUserId: string }) {
  const updated = await prisma.miniGameDefinition.update({
    where: { id: input.id },
    data: { enabled: input.enabled },
  });
  await prisma.auditLog.create({
    data: {
      userId: input.adminUserId,
      action: input.enabled ? "minigame.enabled" : "minigame.disabled",
      entity: "MiniGameDefinition",
      entityId: updated.id,
      newData: { key: updated.key, version: updated.version, enabled: updated.enabled },
    },
  });
  return updated;
}

export async function findMiniGameDefinition(input: { key: string; version?: number }) {
  return prisma.miniGameDefinition.findFirst({
    where: { key: input.key, ...(input.version ? { version: input.version } : {}) },
    orderBy: { version: "desc" },
  });
}
