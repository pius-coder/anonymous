import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    notificationJob: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    notificationPreference: {
      findUnique: vi.fn(),
    },
    gameSession: {
      findUnique: vi.fn(),
    },
    deliveryLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@session-jeu/db", () => ({
  prisma: dbMocks.prisma,
  DeliveryStatus: {
    SENT: "SENT",
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
}));

import { processNotificationSend } from "../notifications.js";

function notificationJob(overrides: Record<string, unknown> = {}) {
  return {
    id: "notification-1",
    userId: "player-1",
    sessionId: "session-1",
    channel: "IN_APP",
    status: "QUEUED",
    ...overrides,
  };
}

describe("notification worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.prisma.$transaction.mockImplementation((operations) => Promise.all(operations));
    dbMocks.prisma.notificationJob.findUnique.mockResolvedValue(notificationJob());
    dbMocks.prisma.gameSession.findUnique.mockResolvedValue({ status: "ACTIVE" });
    dbMocks.prisma.notificationJob.update.mockResolvedValue({});
    dbMocks.prisma.deliveryLog.create.mockResolvedValue({});
  });

  it("sends in-app reminders", async () => {
    const result = await processNotificationSend({ notificationJobId: "notification-1" });

    expect(result).toEqual({ sent: true, notificationJobId: "notification-1" });
    expect(dbMocks.prisma.notificationJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SENT" }),
      }),
    );
  });

  it("cancels reminders for cancelled sessions", async () => {
    dbMocks.prisma.gameSession.findUnique.mockResolvedValueOnce({ status: "CANCELLED" });

    const result = await processNotificationSend({ notificationJobId: "notification-1" });

    expect(result).toEqual({ sent: false, reason: "session-cancelled" });
    expect(dbMocks.prisma.notificationJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "CANCELLED" },
      }),
    );
    expect(dbMocks.prisma.deliveryLog.create).not.toHaveBeenCalled();
  });

  it("does not throw when WhatsApp gateway is unavailable", async () => {
    dbMocks.prisma.notificationJob.findUnique.mockResolvedValueOnce(
      notificationJob({ channel: "WHATSAPP" }),
    );
    dbMocks.prisma.notificationPreference.findUnique.mockResolvedValueOnce({
      whatsappOptIn: true,
      whatsappPhone: "+237600000000",
    });

    const result = await processNotificationSend({ notificationJobId: "notification-1" });

    expect(result).toEqual({ sent: false, reason: "whatsapp-unavailable" });
    expect(dbMocks.prisma.deliveryLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ errorCode: "502_WHATSAPP_UNAVAILABLE" }),
      }),
    );
  });
});
