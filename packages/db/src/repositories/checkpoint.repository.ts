import type { RoundCheckpoint } from "@prisma/client";
import { DataClassification, Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import type { CreateCheckpointData } from "./types.js";

export function saveCheckpoint(data: CreateCheckpointData): Promise<RoundCheckpoint> {
  return prisma.roundCheckpoint.create({
    data: {
      roundId: data.roundId,
      version: data.version,
      phase: data.phase,
      configVersion: data.configVersion,
      runtimeVersion: data.runtimeVersion,
      payloadCipher: Buffer.from(data.payloadCipher),
      payloadNonce: data.payloadNonce ? Buffer.from(data.payloadNonce) : undefined,
      payloadHash: data.payloadHash,
      keyId: data.keyId,
      acceptedInputIds: (data.acceptedInputIds ?? undefined) as Prisma.InputJsonValue | undefined,
      deadlines: (data.deadlines ?? undefined) as Prisma.InputJsonValue | undefined,
      classification: data.classification ?? DataClassification.SYSTEM_ONLY,
    },
  });
}

export function findLatestCheckpoint(roundId: string): Promise<RoundCheckpoint | null> {
  return prisma.roundCheckpoint.findFirst({
    where: { roundId },
    orderBy: { version: "desc" },
  });
}

export function findCheckpoint(roundId: string, version: number): Promise<RoundCheckpoint | null> {
  return prisma.roundCheckpoint.findUnique({
    where: { roundId_version: { roundId, version } },
  });
}

export function listCheckpoints(roundId: string): Promise<RoundCheckpoint[]> {
  return prisma.roundCheckpoint.findMany({
    where: { roundId },
    orderBy: { version: "asc" },
  });
}

/**
 * Reconstructible room state for restart: metadata + ciphertext only.
 * Callers must never log payloadCipher as cleartext; decrypt happens outside this package.
 */
export async function loadRestartProjection(roundId: string): Promise<{
  checkpoint: RoundCheckpoint | null;
  acceptedInputIds: unknown;
  deadlines: unknown;
  payloadHash: string | null;
  classification: DataClassification | null;
  /** True when ciphertext present and not empty — secrets not exposed as strings. */
  hasEncryptedPayload: boolean;
}> {
  const checkpoint = await findLatestCheckpoint(roundId);
  if (!checkpoint) {
    return {
      checkpoint: null,
      acceptedInputIds: null,
      deadlines: null,
      payloadHash: null,
      classification: null,
      hasEncryptedPayload: false,
    };
  }
  return {
    checkpoint,
    acceptedInputIds: checkpoint.acceptedInputIds,
    deadlines: checkpoint.deadlines,
    payloadHash: checkpoint.payloadHash,
    classification: checkpoint.classification,
    hasEncryptedPayload: checkpoint.payloadCipher.length > 0,
  };
}
