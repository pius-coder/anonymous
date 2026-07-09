import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const dbMocks = vi.hoisted(() => ({
  tx: {
    auditLog: { create: vi.fn() },
    incidentLog: { create: vi.fn() },
    supportCase: { create: vi.fn() },
    adminActionApproval: { create: vi.fn(), update: vi.fn() },
  },
  prisma: {
    $transaction: vi.fn(),
    authSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    gameSession: { count: vi.fn() },
    sessionRegistration: { count: vi.fn() },
    incidentLog: { count: vi.fn() },
    supportCase: { count: vi.fn() },
    adminActionApproval: { count: vi.fn(), findUnique: vi.fn() },
    paymentTransaction: { count: vi.fn(), findMany: vi.fn() },
    wallet: { count: vi.fn() },
    ledgerEntry: { aggregate: vi.fn() },
    auditLog: { findMany: vi.fn() },
    user: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
  AdminActionApprovalStatus: {
    REQUESTED: "REQUESTED",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
  },
  GameSessionStatus: {
    ACTIVE: "ACTIVE",
    WAITING_START: "WAITING_START",
    LIVE: "LIVE",
    COMPLETED: "COMPLETED",
  },
  IncidentSeverity: {
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    CRITICAL: "CRITICAL",
  },
  PaymentStatus: {
    PENDING: "PENDING",
    SUCCESSFUL: "SUCCESSFUL",
    FAILED: "FAILED",
  },
  Prisma: {},
  SessionRegistrationStatus: {
    PAID: "PAID",
    NO_SHOW: "NO_SHOW",
  },
  SupportCaseStatus: {
    OPEN: "OPEN",
    IN_PROGRESS: "IN_PROGRESS",
  },
}));

import { SESSION_COOKIE_NAME, hashOpaqueToken } from "../../auth/session.js";
import type { AuthVariables } from "../../auth/session.js";
import { requestId } from "../../middleware/requestId.js";
import adminOperations from "../admin/operations.js";

function createApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.use("*", requestId);
  app.route("/v1/admin", adminOperations);
  return app;
}

function validAuthSession(
  role: "PLAYER" | "ADMIN" | "SUPER_ADMIN" | "SUPPORT" | "FINANCE" = "ADMIN",
  id = `${role.toLowerCase()}-1`,
) {
  return {
    id: "auth-session-1",
    tokenHash: hashOpaqueToken("session-token"),
    sessionVersion: 1,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: {
      id,
      email: `${id}@example.com`,
      name: role,
      role,
      isActive: true,
      sessionVersion: 1,
    },
  };
}

function supportUser() {
  const now = new Date("2026-07-08T10:00:00Z");
  return {
    id: "player-1",
    email: "player@example.com",
    phone: "+237600000000",
    name: "Player",
    role: "PLAYER",
    isActive: true,
    createdAt: now,
    profile: {
      username: "playerone",
      avatarUrl: null,
      isPublic: false,
      level: 1,
      xp: 0,
    },
    wallet: {
      id: "wallet-1",
      balanceXaf: 1000,
      currency: "XAF",
      isFrozen: false,
      updatedAt: now,
      ledgers: [
        {
          id: "ledger-1",
          amountXaf: 500,
          balanceAfterXaf: 1000,
          direction: "CREDIT",
          type: "PRIZE",
          referenceType: "PrizeDistribution",
          referenceId: "distribution-1",
          sessionId: "session-1",
          createdAt: now,
        },
      ],
    },
    registrations: [
      {
        id: "registration-1",
        status: "PAID",
        createdAt: now,
        session: {
          id: "session-1",
          code: "ABC123",
          name: "Session",
          status: "COMPLETED",
          startTime: now,
        },
      },
    ],
    payments: [
      {
        id: "payment-1",
        sessionId: "session-1",
        registrationId: "registration-1",
        amountXaf: 1000,
        currency: "XAF",
        status: "SUCCESSFUL",
        provider: "fapshi",
        providerStatus: "SUCCESSFUL",
        reference: "safe-reference",
        createdAt: now,
        updatedAt: now,
      },
    ],
    supportCasesForUser: [
      {
        id: "case-1",
        status: "OPEN",
        subject: "Help",
        createdAt: now,
        closedAt: null,
      },
    ],
  };
}

describe("admin operations routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.$transaction.mockImplementation(async (callback) => callback(dbMocks.tx));
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession());
    dbMocks.prisma.gameSession.count
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(7);
    dbMocks.prisma.sessionRegistration.count.mockResolvedValueOnce(30).mockResolvedValueOnce(1);
    dbMocks.prisma.incidentLog.count.mockResolvedValue(3);
    dbMocks.prisma.supportCase.count.mockResolvedValue(4);
    dbMocks.prisma.adminActionApproval.count.mockResolvedValue(5);
    dbMocks.prisma.user.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    dbMocks.prisma.paymentTransaction.count
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(2);
    dbMocks.prisma.wallet.count.mockResolvedValue(1);
    dbMocks.prisma.ledgerEntry.aggregate.mockResolvedValue({ _sum: { amountXaf: 9000 } });
    dbMocks.prisma.auditLog.findMany.mockResolvedValue([
      {
        id: "audit-1",
        userId: "admin-1",
        action: "session.cancelled",
        entity: "GameSession",
        entityId: "session-1",
        reason: "bad schedule",
        requestId: "req-1",
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
        oldData: { secret: "hidden" },
        newData: { status: "CANCELLED" },
        createdAt: new Date("2026-07-08T10:00:00Z"),
      },
    ]);
    dbMocks.prisma.user.findMany.mockResolvedValue([
      {
        id: "player-1",
        email: "player@example.com",
        phone: "+237600000000",
        name: "Player",
        role: "PLAYER",
        isActive: true,
        createdAt: new Date("2026-07-08T10:00:00Z"),
        profile: { username: "playerone", avatarUrl: null },
        wallet: { balanceXaf: 1000, currency: "XAF", isFrozen: false },
        _count: { registrations: 1, supportCasesForUser: 1 },
      },
    ]);
    dbMocks.prisma.user.findUnique.mockResolvedValue(supportUser());
    dbMocks.prisma.paymentTransaction.findMany.mockResolvedValue(supportUser().payments);
    dbMocks.tx.incidentLog.create.mockResolvedValue({
      id: "incident-1",
      createdById: "support-1",
      sessionId: "session-1",
      severity: "HIGH",
      category: "live",
      title: "Live issue",
      description: null,
      createdAt: new Date("2026-07-08T10:00:00Z"),
      resolvedAt: null,
    });
    dbMocks.tx.supportCase.create.mockResolvedValue({
      id: "case-1",
      userId: "player-1",
      createdById: "support-1",
      status: "OPEN",
      subject: "Payment help",
    });
    dbMocks.tx.adminActionApproval.create.mockResolvedValue({
      id: "action-1",
      action: "results.correct",
      entity: "GameSession",
      status: "REQUESTED",
      reason: "score correction",
    });
    dbMocks.prisma.adminActionApproval.findUnique.mockResolvedValue({
      id: "action-1",
      action: "results.correct",
      entity: "GameSession",
      entityId: "session-1",
      status: "REQUESTED",
      requestedById: "admin-1",
    });
    dbMocks.tx.adminActionApproval.update.mockResolvedValue({
      id: "action-1",
      status: "APPROVED",
      approvedById: "super-admin-1",
    });
    dbMocks.tx.auditLog.create.mockResolvedValue({});
  });

  it("returns dashboard KPIs for admin roles", async () => {
    const res = await app.request("/v1/admin/dashboard", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.dashboard.sessions.total).toBe(12);
    expect(body.data.dashboard.users.total).toBe(3);
    expect(body.data.dashboard.users.players).toBe(2);
    expect(body.data.dashboard.finance.payments.successful).toBe(20);
  });

  it("lists registered users for support views", async () => {
    const res = await app.request("/v1/admin/support/users?q=player&role=PLAYER", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
    expect(dbMocks.prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: "PLAYER",
          OR: expect.any(Array),
        }),
      }),
    );
    const body = await res.json();
    expect(body.data.data[0]).toMatchObject({
      id: "player-1",
      email: "player@example.com",
      role: "PLAYER",
      registrationsCount: 1,
      supportCasesCount: 1,
    });
    expect(JSON.stringify(body)).not.toContain("passwordHash");
    expect(JSON.stringify(body)).not.toContain("providerTransId");
  });

  it("limits support dashboard finance scope", async () => {
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession("SUPPORT", "support-1"));

    const res = await app.request("/v1/admin/dashboard", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.dashboard.finance).toBeNull();
    expect(body.data.dashboard.scope.canViewFinance).toBe(false);
  });

  it("rejects players from dashboard", async () => {
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession("PLAYER", "player-1"));

    const res = await app.request("/v1/admin/dashboard", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(403);
  });

  it("filters audit logs and hides before/after data from support", async () => {
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession("SUPPORT", "support-1"));

    const res = await app.request(
      "/v1/admin/audit-logs?entity=GameSession&entityId=session-1&requestId=req-1",
      { headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` } },
    );

    expect(res.status).toBe(200);
    expect(dbMocks.prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          entity: "GameSession",
          entityId: "session-1",
          requestId: "req-1",
        }),
      }),
    );
    const body = await res.json();
    expect(body.data.entries[0].oldData).toBeNull();
    expect(body.data.entries[0].newData).toBeNull();
  });

  it("does not expose provider secrets in support user view", async () => {
    const res = await app.request("/v1/admin/support/users/player-1", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("safe-reference");
    expect(text).not.toContain("providerTransId");
    expect(text).not.toContain("providerExternalId");
    expect(text).not.toContain("checkoutUrl");
    expect(text).not.toContain("metadata");
    expect(text).not.toContain("webhook");
  });

  it("refuses incident creation without reason", async () => {
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession("SUPPORT", "support-1"));

    const res = await app.request("/v1/admin/incidents", {
      method: "POST",
      body: JSON.stringify({ severity: "HIGH", category: "live", title: "Live issue" }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(400);
    expect(dbMocks.tx.incidentLog.create).not.toHaveBeenCalled();
  });

  it("creates incidents with audit context", async () => {
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession("SUPPORT", "support-1"));

    const res = await app.request("/v1/admin/incidents", {
      method: "POST",
      body: JSON.stringify({
        sessionId: "session-1",
        severity: "HIGH",
        category: "live",
        title: "Live issue",
        reason: "support escalation",
      }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
        "x-request-id": "req-incident",
      },
    });

    expect(res.status).toBe(201);
    expect(dbMocks.tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "incident.created",
        reason: "support escalation",
        requestId: "req-incident",
      }),
    });
  });

  it("refuses approval by the requester", async () => {
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(
      validAuthSession("SUPER_ADMIN", "admin-1"),
    );

    const res = await app.request("/v1/admin/actions/action-1/approve", {
      method: "POST",
      body: JSON.stringify({ reason: "approved" }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(409);
  });

  it("does not expose audit deletion route", async () => {
    const res = await app.request("/v1/admin/audit-logs/audit-1", {
      method: "DELETE",
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(404);
  });
});
