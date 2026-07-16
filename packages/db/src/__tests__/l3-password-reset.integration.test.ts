/**
 * L3 integration: password reset token storage + sessionVersion revocation on PostgreSQL.
 * Frontiers: Prisma → PostgreSQL (no mocks).
 */
import { createHash, randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  authRepository,
  realtimeRepository,
  participationRepository,
  partyRepository,
  userRepository,
} from "../repositories/index.js";
import {
  cleanupL3Fixtures,
  disconnectTestPrisma,
  getTestPrisma,
  isIntegrationEnv,
} from "./helpers.js";

const runL3 = isIntegrationEnv();

function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function opaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

describe.skipIf(!runL3)("L3 password reset token + session revocation", () => {
  const prisma = getTestPrisma();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `l3-reset-${suffix}@example.test`;

  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  beforeEach(async () => {
    await cleanupL3Fixtures({ emailPrefix: "l3-reset-", partyCodePrefix: "L3R-" });
  });

  afterAll(async () => {
    await cleanupL3Fixtures({ emailPrefix: "l3-reset-", partyCodePrefix: "L3R-" });
    await disconnectTestPrisma();
  });

  it("stores hashed reset token, single-use consume, and revokes sessions via sessionVersion", async () => {
    const user = await userRepository.createUserWithRole({
      email,
      name: "L3 Reset",
      passwordHash: "scrypt$placeholder",
      sessionVersion: 1,
      role: "PLAYER",
    });

    const sessionToken = opaqueToken();
    await authRepository.createAuthSession({
      userId: user.id,
      token: hashOpaqueToken(sessionToken),
      expiresAt: new Date(Date.now() + 86_400_000),
      sessionVersion: 1,
    });

    const plainReset = opaqueToken();
    const resetRow = await authRepository.createPasswordResetToken({
      userId: user.id,
      token: hashOpaqueToken(plainReset),
      expiresAt: new Date(Date.now() + 3_600_000),
    });

    // Lookup by hash only (plain token never stored).
    const found = await authRepository.findPasswordResetToken(hashOpaqueToken(plainReset));
    expect(found?.id).toBe(resetRow.id);
    expect(found?.token).toBe(hashOpaqueToken(plainReset));
    expect(found?.token).not.toBe(plainReset);

    const party = await partyRepository.createParty({
      code: `L3R-${suffix}`,
      name: "L3 Reset Party",
    });
    const participation = await participationRepository.createParticipation({
      partyId: party.id,
      userId: user.id,
      status: "PRESENT",
    });
    await realtimeRepository.upsertConnection(participation.id, {
      participationId: participation.id,
      connectionId: `conn-${suffix}`,
      state: "connected",
      tokenHash: hashOpaqueToken("live-token-before-reset"),
      tokenExpiresAt: new Date(Date.now() + 60_000),
    });

    // Simulate reset: consume token + update password + revoke sessions + drop live conn.
    await userRepository.updateUser(user.id, { passwordHash: "scrypt$new" });
    await authRepository.consumePasswordResetToken(resetRow.id);
    await authRepository.revokeUserSessions(user.id);
    const live = await realtimeRepository.findByParticipation(participation.id);
    if (live) await realtimeRepository.deleteConnection(live.id);

    const consumed = await authRepository.findPasswordResetToken(hashOpaqueToken(plainReset));
    expect(consumed?.consumedAt).toBeInstanceOf(Date);

    const sessions = await authRepository.findActiveSessionsByUser(user.id);
    expect(sessions).toHaveLength(0);

    const refreshed = await userRepository.findUserById(user.id);
    expect(refreshed?.sessionVersion).toBe(2);

    // Session row with old version is gone; lookup by old token hash fails.
    const oldSession = await authRepository.findAuthSessionByToken(hashOpaqueToken(sessionToken));
    expect(oldSession).toBeNull();

    const liveAfter = await realtimeRepository.findByParticipation(participation.id);
    expect(liveAfter).toBeNull();
  });

  it("rejects reuse of a consumed reset token (single-use)", async () => {
    const user = await userRepository.createUserWithRole({
      email: `l3-reset-reuse-${suffix}@example.test`,
      name: "L3 Reuse",
      passwordHash: "scrypt$placeholder",
      sessionVersion: 0,
      role: "PLAYER",
    });
    const plain = opaqueToken();
    const row = await authRepository.createPasswordResetToken({
      userId: user.id,
      token: hashOpaqueToken(plain),
      expiresAt: new Date(Date.now() + 3_600_000),
    });
    await authRepository.consumePasswordResetToken(row.id);
    const again = await authRepository.findPasswordResetToken(hashOpaqueToken(plain));
    expect(again?.consumedAt).not.toBeNull();
  });
});
