import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    complianceGate: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    riskSignal: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    antiCheatEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
  AntiCheatEventType: {
    DOUBLE_SUBMIT: "DOUBLE_SUBMIT",
    AUTO_CLICK: "AUTO_CLICK",
    LATE_INPUT: "LATE_INPUT",
    LATENCY_ABUSE: "LATENCY_ABUSE",
    MANUAL_REVIEW: "MANUAL_REVIEW",
  },
  ComplianceGateStatus: { BLOCKED: "BLOCKED", PASSED: "PASSED", WAIVED: "WAIVED" },
  ComplianceGateType: {
    WITHDRAWAL: "WITHDRAWAL",
    MINI_GAME_RISK: "MINI_GAME_RISK",
    LEGAL_WORDING: "LEGAL_WORDING",
    PUBLIC_LAUNCH: "PUBLIC_LAUNCH",
  },
  ModerationActionType: {
    WARN_USER: "WARN_USER",
    FREEZE_WALLET: "FREEZE_WALLET",
    SUSPEND_USER: "SUSPEND_USER",
    RESTRICT_SESSION: "RESTRICT_SESSION",
    NOTE: "NOTE",
  },
  Prisma: {},
  RiskSignalSeverity: { LOW: "LOW", MEDIUM: "MEDIUM", HIGH: "HIGH", CRITICAL: "CRITICAL" },
  RiskSignalType: {
    AUTHORIZATION_DENIED: "AUTHORIZATION_DENIED",
    WEBHOOK_SIGNATURE_FAILURE: "WEBHOOK_SIGNATURE_FAILURE",
    MULTI_ACCOUNT: "MULTI_ACCOUNT",
    DEVICE_HASH: "DEVICE_HASH",
    PAYMENT_PATTERN: "PAYMENT_PATTERN",
    ANTICHEAT: "ANTICHEAT",
    COMPLIANCE: "COMPLIANCE",
  },
}));

import {
  assertMiniGameRiskAllowed,
  assertPublicSessionCompliance,
  createAntiCheatSignal,
  getSessionRisk,
} from "../security.js";

describe("security service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.$transaction.mockImplementation(async (callback) => callback(dbMocks.prisma));
    dbMocks.prisma.complianceGate.upsert.mockResolvedValue({});
    dbMocks.prisma.complianceGate.findFirst.mockResolvedValue(null);
    dbMocks.prisma.complianceGate.findUnique.mockResolvedValue({
      id: "gate-1",
      type: "MINI_GAME_RISK",
      scope: "chance-dominant",
      status: "BLOCKED",
      reason: "Legal review required",
    });
    dbMocks.prisma.antiCheatEvent.create.mockResolvedValue({ id: "anticheat-1" });
    dbMocks.prisma.riskSignal.create.mockResolvedValue({ id: "risk-1" });
    dbMocks.prisma.riskSignal.findMany.mockResolvedValue([]);
    dbMocks.prisma.antiCheatEvent.findMany.mockResolvedValue([]);
  });

  it("blocks chance-dominant mini-games until reviewed", async () => {
    const result = await assertMiniGameRiskAllowed({ chanceDominant: true, reviewed: false });

    expect(result.type).toBe("blocked");
  });

  it("blocks public publication while compliance gates are blocked", async () => {
    dbMocks.prisma.complianceGate.findFirst.mockResolvedValueOnce({
      id: "gate-2",
      type: "PUBLIC_LAUNCH",
      scope: "global",
      status: "BLOCKED",
    });

    const result = await assertPublicSessionCompliance({ visibility: "PUBLIC" });

    expect(result.type).toBe("blocked");
  });

  it("creates anti-cheat and risk evidence together", async () => {
    const result = await createAntiCheatSignal({
      type: "DOUBLE_SUBMIT",
      severity: "HIGH",
      sessionId: "session-1",
      userId: "player-1",
      actionNonce: "nonce-1",
    });

    expect(result.event.id).toBe("anticheat-1");
    expect(dbMocks.prisma.riskSignal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "ANTICHEAT", reason: "DOUBLE_SUBMIT" }),
      }),
    );
  });

  it("redacts sensitive hashes in session risk output", async () => {
    dbMocks.prisma.riskSignal.findMany.mockResolvedValueOnce([
      {
        id: "risk-1",
        type: "DEVICE_HASH",
        severity: "HIGH",
        source: "login",
        reason: "shared device",
        deviceHash: "abcdef1234567890",
        ipHash: "1234567890abcdef",
        createdAt: new Date("2026-07-08T10:00:00Z"),
      },
    ]);

    const risk = await getSessionRisk("session-1");

    expect(risk.signals[0].deviceHash).toBe("abcdef12...");
    expect(risk.signals[0].ipHash).toBe("12345678...");
  });
});
