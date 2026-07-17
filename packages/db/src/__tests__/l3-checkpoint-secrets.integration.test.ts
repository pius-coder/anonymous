/**
 * L3: room restart projection exposes ciphertext metadata, not cleartext secrets.
 */
import {
  DataClassification,
  EncryptedSecretPurpose,
  EncryptionKeyStatus,
} from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  checkpointRepository,
  encryptionRepository,
  partyRepository,
  participationRepository,
  roundRepository,
  userRepository,
} from "../repositories/index.js";
import {
  cleanupL3Fixtures,
  disconnectTestPrisma,
  getTestPrisma,
  isIntegrationEnv,
} from "./helpers.js";

const runL3 = isIntegrationEnv();

describe.skipIf(!runL3)("L3 checkpoint secrets / restart", () => {
  const prisma = getTestPrisma();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  beforeEach(async () => {
    await cleanupL3Fixtures({ emailPrefix: "l3-cp-", partyCodePrefix: "L3-CP-" });
  });

  afterAll(async () => {
    await cleanupL3Fixtures({ emailPrefix: "l3-cp-", partyCodePrefix: "L3-CP-" });
    await disconnectTestPrisma();
  });

  it("restart projection has encrypted payload without logging cleartext roles", async () => {
    const user = await userRepository.createUser({
      email: `l3-cp-u-${suffix}@example.test`,
      name: "CP",
    });
    const party = await partyRepository.createParty({
      code: `L3-CP-${suffix}`,
      name: "CP party",
    });
    const part = await participationRepository.createParticipation({
      partyId: party.id,
      userId: user.id,
      status: "REGISTERED",
      idempotencyKey: `l3-cp-p-${suffix}`,
    });
    const round = await roundRepository.createRound({
      partyId: party.id,
      number: 1,
      minigame: "silent_vote",
      status: "ACTIVE",
      runtimeVersion: "1.0.0",
    });

    const key = await encryptionRepository.createEncryptionKey({
      keyId: `l3-cp-key-${suffix}`,
      purpose: EncryptedSecretPurpose.ROLE,
      status: EncryptionKeyStatus.ACTIVE,
      kmsKeyRef: "test/kms/role",
      createdByUserId: user.id,
    });

    // Opaque ciphertext — not the string "SABOTEUR"
    const cipher = Buffer.from([0x01, 0x02, 0x03, 0xaa, 0xbb]);
    await encryptionRepository.storeEncryptedSecret({
      purpose: EncryptedSecretPurpose.ROLE,
      classification: DataClassification.SECRET,
      entityType: "RoundParticipant",
      entityId: part.id,
      ciphertext: cipher,
      nonce: Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
      keyId: key.id,
      roundId: round.id,
      participationId: part.id,
    });

    await checkpointRepository.saveCheckpoint({
      roundId: round.id,
      version: 1,
      phase: "VOTE",
      runtimeVersion: "1.0.0",
      payloadCipher: Buffer.from([0xde, 0xad, 0xbe, 0xef]),
      payloadHash: `cp-hash-${suffix}`,
      keyId: key.id,
      acceptedInputIds: ["nonce-1"],
      deadlines: { voteLockAt: "2030-01-01T00:00:00.000Z" },
      classification: DataClassification.SYSTEM_ONLY,
    });

    const restart = await checkpointRepository.loadRestartProjection(round.id);
    expect(restart.hasEncryptedPayload).toBe(true);
    expect(restart.payloadHash).toBe(`cp-hash-${suffix}`);
    expect(restart.classification).toBe(DataClassification.SYSTEM_ONLY);
    // Ensure we did not store cleartext role labels in projection fields
    const json = JSON.stringify(restart.acceptedInputIds);
    expect(json).not.toMatch(/SABOTEUR|VILLAGER/i);

    const meta = await encryptionRepository.listSecretMetadataForRound(round.id);
    expect(meta).toHaveLength(1);
    expect(meta[0].hasCiphertext).toBe(true);
    expect(meta[0].purpose).toBe(EncryptedSecretPurpose.ROLE);
    // Metadata API does not return ciphertext bytes as string secrets
    expect(Object.keys(meta[0])).not.toContain("ciphertext");
  });
});
