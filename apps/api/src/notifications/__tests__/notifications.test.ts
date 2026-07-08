import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    notificationPreference: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    notificationJob: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    deliveryLog: {
      create: vi.fn(),
    },
    gameSession: {
      findUnique: vi.fn(),
    },
    shareLink: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    consentRecord: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
  DeliveryStatus: {
    SENT: "SENT",
    DELIVERED: "DELIVERED",
    FAILED: "FAILED",
    SKIPPED: "SKIPPED",
  },
  GameSessionStatus: {
    CANCELLED: "CANCELLED",
  },
  NotificationChannel: {
    IN_APP: "IN_APP",
    WHATSAPP: "WHATSAPP",
  },
  NotificationJobStatus: {
    QUEUED: "QUEUED",
    SENT: "SENT",
    FAILED: "FAILED",
    CANCELLED: "CANCELLED",
    SKIPPED: "SKIPPED",
  },
  NotificationType: {
    REGISTRATION: "REGISTRATION",
    REMINDER: "REMINDER",
    SHARE: "SHARE",
  },
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;

      constructor(code: string) {
        super(code);
        this.code = code;
      }
    },
  },
  SessionVisibility: {
    PUBLIC: "PUBLIC",
    PRIVATE: "PRIVATE",
  },
}));

import {
  buildSessionShareMessage,
  createSessionShareMessage,
  processNotificationSend,
  queueNotification,
} from "../notifications.js";
import { Prisma } from "@session-jeu/db";

function notificationJob(overrides: Record<string, unknown> = {}) {
  return {
    id: "notification-1",
    userId: "player-1",
    sessionId: "session-1",
    type: "REMINDER",
    channel: "IN_APP",
    status: "QUEUED",
    title: "Reminder",
    body: "Check in",
    payload: null,
    idempotencyKey: "unique-key",
    scheduledFor: null,
    sentAt: null,
    failedAt: null,
    error: null,
    createdAt: new Date("2026-07-08T10:00:00Z"),
    updatedAt: new Date("2026-07-08T10:00:00Z"),
    ...overrides,
  };
}

describe("notification service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.$transaction.mockImplementation(async (operations) => {
      if (typeof operations === "function") return operations(dbMocks.prisma);
      return Promise.all(operations);
    });
    dbMocks.prisma.notificationJob.create.mockResolvedValue(notificationJob());
    dbMocks.prisma.notificationJob.update.mockResolvedValue(notificationJob({ status: "SENT" }));
    dbMocks.prisma.deliveryLog.create.mockResolvedValue({ id: "delivery-1" });
    dbMocks.prisma.gameSession.findUnique.mockResolvedValue({ status: "ACTIVE" });
  });

  it("builds a share message without private player or result data", () => {
    const message = buildSessionShareMessage({
      name: "Finale",
      code: "ABC123",
      startsAt: new Date("2026-07-08T20:00:00Z"),
      shareUrl: "https://example.com/v1/share/token",
    });

    expect(message).toContain("Finale");
    expect(message).toContain("ABC123");
    expect(message).toContain("https://example.com/v1/share/token");
    expect(message).not.toMatch(/phone|email|winner|score|wallet|payment/i);
  });

  it("refuses private session share generation", async () => {
    dbMocks.prisma.gameSession.findUnique.mockResolvedValueOnce({
      id: "session-1",
      code: "ABC123",
      name: "Private",
      visibility: "PRIVATE",
      status: "ACTIVE",
      startTime: null,
    });

    const result = await createSessionShareMessage({
      sessionId: "session-1",
      adminUserId: "admin-1",
    });

    expect(result).toEqual({ type: "private" });
    expect(dbMocks.prisma.shareLink.create).not.toHaveBeenCalled();
  });

  it("deduplicates notification jobs by idempotency key", async () => {
    dbMocks.prisma.notificationJob.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("P2002") as never,
    );

    const result = await queueNotification({
      userId: "player-1",
      type: "REMINDER",
      channel: "IN_APP",
      title: "Reminder",
      body: "Check in",
      idempotencyKey: "duplicate-key",
    });

    expect(result).toEqual({ type: "duplicate" });
  });

  it("skips WhatsApp send without opt-in", async () => {
    dbMocks.prisma.notificationJob.findUnique.mockResolvedValueOnce(
      notificationJob({ channel: "WHATSAPP" }),
    );
    dbMocks.prisma.notificationPreference.findUnique.mockResolvedValueOnce({
      whatsappOptIn: false,
      whatsappPhone: null,
    });

    const result = await processNotificationSend({ notificationJobId: "notification-1" });

    expect(result).toEqual({ type: "opt-in-required" });
    expect(dbMocks.prisma.deliveryLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ errorCode: "403_OPT_IN_REQUIRED", status: "SKIPPED" }),
      }),
    );
  });

  it("records WhatsApp gateway down as non-blocking failure", async () => {
    dbMocks.prisma.notificationJob.findUnique.mockResolvedValueOnce(
      notificationJob({ channel: "WHATSAPP" }),
    );
    dbMocks.prisma.notificationPreference.findUnique.mockResolvedValueOnce({
      whatsappOptIn: true,
      whatsappPhone: "+237600000000",
    });

    const result = await processNotificationSend({ notificationJobId: "notification-1" });

    expect(result).toEqual({ type: "whatsapp-unavailable" });
    expect(dbMocks.prisma.deliveryLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ errorCode: "502_WHATSAPP_UNAVAILABLE", status: "FAILED" }),
      }),
    );
  });
});
