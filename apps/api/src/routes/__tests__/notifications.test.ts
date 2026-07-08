import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const dbMocks = vi.hoisted(() => ({
  tx: {
    notificationPreference: { update: vi.fn() },
    consentRecord: { create: vi.fn() },
  },
  prisma: {
    $transaction: vi.fn(),
    authSession: { findUnique: vi.fn(), update: vi.fn() },
    notificationPreference: { upsert: vi.fn() },
    notificationJob: { findMany: vi.fn() },
  },
}));

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
  NotificationChannel: { IN_APP: "IN_APP", WHATSAPP: "WHATSAPP" },
  NotificationJobStatus: { CANCELLED: "CANCELLED" },
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;

      constructor(code: string) {
        super(code);
        this.code = code;
      }
    },
  },
}));

import { SESSION_COOKIE_NAME, hashOpaqueToken } from "../../auth/session.js";
import type { AuthVariables } from "../../auth/session.js";
import notifications from "../notifications.js";

function createApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.route("/v1/me", notifications);
  return app;
}

function validAuthSession(userId = "player-1") {
  return {
    id: "auth-session-1",
    tokenHash: hashOpaqueToken("session-token"),
    sessionVersion: 1,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    user: {
      id: userId,
      email: `${userId}@example.com`,
      name: "Player",
      role: "PLAYER",
      isActive: true,
      sessionVersion: 1,
    },
  };
}

describe("notification routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.$transaction.mockImplementation(async (callback) => callback(dbMocks.tx));
    dbMocks.prisma.authSession.findUnique.mockResolvedValue(validAuthSession());
    dbMocks.prisma.notificationPreference.upsert.mockResolvedValue({
      inAppEnabled: true,
      whatsappOptIn: false,
      whatsappPhone: null,
      transactionalOptIn: false,
      marketingOptIn: false,
      updatedAt: new Date("2026-07-08T10:00:00Z"),
    });
    dbMocks.tx.notificationPreference.update.mockResolvedValue({
      inAppEnabled: true,
      whatsappOptIn: true,
      whatsappPhone: "+237600000000",
      transactionalOptIn: true,
      marketingOptIn: false,
      updatedAt: new Date("2026-07-08T10:00:00Z"),
    });
    dbMocks.tx.consentRecord.create.mockResolvedValue({});
    dbMocks.prisma.notificationJob.findMany.mockResolvedValue([
      {
        id: "notification-1",
        type: "PAYMENT",
        status: "SENT",
        title: "Paiement confirme",
        body: "OK",
        payload: null,
        createdAt: new Date("2026-07-08T10:00:00Z"),
        sentAt: new Date("2026-07-08T10:00:00Z"),
      },
    ]);
  });

  it("returns current player notification preferences", async () => {
    const res = await app.request("/v1/me/notification-preferences", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
    expect(dbMocks.prisma.notificationPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "player-1" } }),
    );
  });

  it("updates WhatsApp opt-in and records consent", async () => {
    const res = await app.request("/v1/me/notification-preferences", {
      method: "PATCH",
      body: JSON.stringify({
        whatsappOptIn: true,
        whatsappPhone: "+237600000000",
        transactionalOptIn: true,
      }),
      headers: {
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=session-token`,
      },
    });

    expect(res.status).toBe(200);
    expect(dbMocks.tx.consentRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "player-1", optedIn: true }),
      }),
    );
  });

  it("lists only current player's in-app notifications", async () => {
    const res = await app.request("/v1/me/notifications", {
      headers: { cookie: `${SESSION_COOKIE_NAME}=session-token` },
    });

    expect(res.status).toBe(200);
    expect(dbMocks.prisma.notificationJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "player-1", channel: "IN_APP" }),
      }),
    );
  });
});
