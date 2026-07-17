import type { EncryptionKey, EncryptedSecret } from "@prisma/client";
import {
  DataClassification,
  EncryptedSecretPurpose,
  EncryptionKeyStatus,
} from "@prisma/client";
import { prisma } from "../prisma.js";
import type { CreateEncryptedSecretData, CreateEncryptionKeyData } from "./types.js";

export function createEncryptionKey(data: CreateEncryptionKeyData): Promise<EncryptionKey> {
  return prisma.encryptionKey.create({
    data: {
      keyId: data.keyId,
      purpose: data.purpose,
      algorithm: data.algorithm ?? "AES-256-GCM",
      status: data.status ?? EncryptionKeyStatus.ACTIVE,
      wrappedMaterial: data.wrappedMaterial ? Buffer.from(data.wrappedMaterial) : undefined,
      kmsKeyRef: data.kmsKeyRef,
      createdByUserId: data.createdByUserId,
    },
  });
}

export function findEncryptionKeyByKeyId(keyId: string): Promise<EncryptionKey | null> {
  return prisma.encryptionKey.findUnique({ where: { keyId } });
}

export function findActiveKeyForPurpose(
  purpose: EncryptedSecretPurpose,
): Promise<EncryptionKey | null> {
  return prisma.encryptionKey.findFirst({
    where: { purpose, status: EncryptionKeyStatus.ACTIVE, purgedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function rotateEncryptionKey(input: {
  oldKeyId: string;
  newKeyId: string;
  purpose: EncryptedSecretPurpose;
  wrappedMaterial?: Uint8Array;
  kmsKeyRef?: string;
  createdByUserId?: string;
}): Promise<{ oldKey: EncryptionKey; newKey: EncryptionKey }> {
  return prisma.$transaction(async (tx) => {
    const oldKey = await tx.encryptionKey.update({
      where: { keyId: input.oldKeyId },
      data: {
        status: EncryptionKeyStatus.RETIRED,
        rotatedAt: new Date(),
      },
    });
    const newKey = await tx.encryptionKey.create({
      data: {
        keyId: input.newKeyId,
        purpose: input.purpose,
        status: EncryptionKeyStatus.ACTIVE,
        wrappedMaterial: input.wrappedMaterial
          ? Buffer.from(input.wrappedMaterial)
          : undefined,
        kmsKeyRef: input.kmsKeyRef,
        createdByUserId: input.createdByUserId,
      },
    });
    return { oldKey, newKey };
  });
}

export async function purgeEncryptionKey(keyId: string): Promise<EncryptionKey> {
  return prisma.$transaction(async (tx) => {
    await tx.encryptedSecret.updateMany({
      where: { key: { keyId } },
      data: { purgedAt: new Date(), ciphertext: Buffer.alloc(0) },
    });
    return tx.encryptionKey.update({
      where: { keyId },
      data: {
        status: EncryptionKeyStatus.PURGED,
        purgedAt: new Date(),
        wrappedMaterial: null,
      },
    });
  });
}

export function storeEncryptedSecret(data: CreateEncryptedSecretData): Promise<EncryptedSecret> {
  return prisma.encryptedSecret.create({
    data: {
      purpose: data.purpose,
      classification: data.classification ?? DataClassification.SECRET,
      entityType: data.entityType,
      entityId: data.entityId,
      ciphertext: Buffer.from(data.ciphertext),
      nonce: data.nonce ? Buffer.from(data.nonce) : undefined,
      keyId: data.keyId,
      aad: data.aad,
      roundId: data.roundId,
      participationId: data.participationId,
    },
  });
}

export function listSecretsByEntity(
  entityType: string,
  entityId: string,
): Promise<EncryptedSecret[]> {
  return prisma.encryptedSecret.findMany({
    where: { entityType, entityId, purgedAt: null },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Returns metadata only — never decodes ciphertext.
 * Used for room restart reconstruction without exposing secrets.
 */
export async function listSecretMetadataForRound(roundId: string): Promise<
  Array<{
    id: string;
    purpose: EncryptedSecretPurpose;
    classification: DataClassification;
    entityType: string;
    entityId: string;
    keyId: string;
    hasCiphertext: boolean;
    purgedAt: Date | null;
  }>
> {
  const rows = await prisma.encryptedSecret.findMany({
    where: { roundId },
    select: {
      id: true,
      purpose: true,
      classification: true,
      entityType: true,
      entityId: true,
      keyId: true,
      ciphertext: true,
      purgedAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    purpose: r.purpose,
    classification: r.classification,
    entityType: r.entityType,
    entityId: r.entityId,
    keyId: r.keyId,
    hasCiphertext: r.ciphertext.length > 0 && !r.purgedAt,
    purgedAt: r.purgedAt,
  }));
}
