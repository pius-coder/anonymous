import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const dbMocks = vi.hoisted(() => ({
  userRepository: {
    findUserByEmail: vi.fn(),
    findUserByEmailWithRoles: vi.fn(),
    createUserWithRole: vi.fn(),
    updateUser: vi.fn(),
    updateUserSession: vi.fn(),
  },
  authRepository: {
    createAuthSession: vi.fn(),
    createPasswordResetToken: vi.fn(),
    findPasswordResetToken: vi.fn(),
    consumePasswordResetToken: vi.fn(),
    revokeUserSessions: vi.fn(),
  },
  notificationRepository: {
    createNotificationJob: vi.fn(),
  },
  participationRepository: {
    listParticipationsByUser: vi.fn(),
  },
  realtimeRepository: {
    findByParticipation: vi.fn(),
    deleteConnection: vi.fn(),
  },
}));

vi.mock("@session-jeu/db", () => dbMocks);

const { requestPasswordReset, resetPassword } = await import("../auth.use-case.js");

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

describe("password reset use-cases (L1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.participationRepository.listParticipationsByUser.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requestPasswordReset is enumeration-safe for unknown email", async () => {
    dbMocks.userRepository.findUserByEmail.mockResolvedValue(null);
    const result = await requestPasswordReset({ email: "ghost@example.test" });
    expect(result).toEqual({ issued: false });
    expect(dbMocks.authRepository.createPasswordResetToken).not.toHaveBeenCalled();
    expect(dbMocks.notificationRepository.createNotificationJob).not.toHaveBeenCalled();
  });

  it("requestPasswordReset issues hashed token and delivery job without exposing secrets", async () => {
    dbMocks.userRepository.findUserByEmail.mockResolvedValue({
      id: "user-1",
      email: "player@example.test",
      isActive: true,
      passwordHash: "scrypt$…",
    });
    dbMocks.authRepository.createPasswordResetToken.mockResolvedValue({ id: "prt-1" });
    dbMocks.notificationRepository.createNotificationJob.mockResolvedValue({ id: "job-1" });

    const result = await requestPasswordReset({ email: "player@example.test" });
    expect(result).toEqual({ issued: true });

    expect(dbMocks.authRepository.createPasswordResetToken).toHaveBeenCalledTimes(1);
    const tokenArg = dbMocks.authRepository.createPasswordResetToken.mock.calls[0]?.[0];
    expect(tokenArg.userId).toBe("user-1");
    expect(tokenArg.token).toMatch(/^[a-f0-9]{64}$/);
    expect(tokenArg.expiresAt).toBeInstanceOf(Date);

    const jobArg = dbMocks.notificationRepository.createNotificationJob.mock.calls[0]?.[0];
    expect(jobArg.type).toBe("PASSWORD_RESET");
    expect(jobArg.payload.kind).toBe("PASSWORD_RESET");
    expect(typeof jobArg.payload.token).toBe("string");
    expect(jobArg.payload.token.length).toBeGreaterThan(20);
    // Stored hash must match the delivery plain token.
    expect(tokenArg.token).toBe(hashToken(jobArg.payload.token));
  });

  it("resetPassword rejects weak passwords with stable code", async () => {
    await expect(
      resetPassword({ token: "any", newPassword: "short" }),
    ).rejects.toMatchObject({
      code: "WEAK_PASSWORD",
      httpStatus: 400,
    });
  });

  it("resetPassword rejects invalid/expired/consumed tokens", async () => {
    dbMocks.authRepository.findPasswordResetToken.mockResolvedValue(null);
    await expect(
      resetPassword({ token: "missing", newPassword: "longenough1" }),
    ).rejects.toMatchObject({ code: "INVALID_RESET_TOKEN", httpStatus: 400 });

    dbMocks.authRepository.findPasswordResetToken.mockResolvedValue({
      id: "prt-1",
      userId: "user-1",
      token: "hash",
      consumedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(
      resetPassword({ token: "used", newPassword: "longenough1" }),
    ).rejects.toMatchObject({ code: "INVALID_RESET_TOKEN" });

    dbMocks.authRepository.findPasswordResetToken.mockResolvedValue({
      id: "prt-1",
      userId: "user-1",
      token: "hash",
      consumedAt: null,
      expiresAt: new Date(Date.now() - 1_000),
    });
    await expect(
      resetPassword({ token: "expired", newPassword: "longenough1" }),
    ).rejects.toMatchObject({ code: "INVALID_RESET_TOKEN" });
  });

  it("resetPassword updates password, consumes token, revokes sessions and live tokens", async () => {
    const plain = "opaque-reset-token-value";
    dbMocks.authRepository.findPasswordResetToken.mockResolvedValue({
      id: "prt-1",
      userId: "user-1",
      token: hashToken(plain),
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    dbMocks.userRepository.updateUser.mockResolvedValue({ id: "user-1" });
    dbMocks.authRepository.consumePasswordResetToken.mockResolvedValue({ id: "prt-1" });
    dbMocks.authRepository.revokeUserSessions.mockResolvedValue({ count: 2 });
    dbMocks.participationRepository.listParticipationsByUser.mockResolvedValue([
      { id: "part-1" },
    ]);
    dbMocks.realtimeRepository.findByParticipation.mockResolvedValue({ id: "conn-1" });
    dbMocks.realtimeRepository.deleteConnection.mockResolvedValue({ id: "conn-1" });

    const result = await resetPassword({ token: plain, newPassword: "NewSecurePass1!" });
    expect(result).toEqual({ userId: "user-1" });

    expect(dbMocks.userRepository.updateUser).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ passwordHash: expect.stringContaining("scrypt$") }),
    );
    expect(dbMocks.authRepository.consumePasswordResetToken).toHaveBeenCalledWith("prt-1");
    expect(dbMocks.authRepository.revokeUserSessions).toHaveBeenCalledWith("user-1");
    expect(dbMocks.realtimeRepository.deleteConnection).toHaveBeenCalledWith("conn-1");
  });
});
