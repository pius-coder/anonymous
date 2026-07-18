import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeNotificationProvider } from "@session-jeu/whatsapp-gateway";
import { resetMetrics, getMetrics } from "../metrics.js";

const dbMocks = vi.hoisted(() => ({
  notificationRepository: {
    findNotificationJobById: vi.fn(),
    updateNotificationJobStatus: vi.fn(),
    createDeliveryLog: vi.fn(),
  },
}));

vi.mock("@session-jeu/db", () => dbMocks);

const { deliverNotificationJob, RetryableDeliveryError } = await import(
  "../jobs/notificationDelivery.js"
);

beforeEach(() => {
  vi.clearAllMocks();
  resetMetrics();
  dbMocks.notificationRepository.updateNotificationJobStatus.mockImplementation(
    async (id: string, status: string) => ({ id, status }),
  );
  dbMocks.notificationRepository.createDeliveryLog.mockImplementation(
    async (data: { jobId: string; status: string }) => ({
      id: `log-${data.jobId}-${data.status}`,
      ...data,
    }),
  );
});

describe("deliverNotificationJob", () => {
  it("sends via provider and writes SENT DeliveryLog", async () => {
    dbMocks.notificationRepository.findNotificationJobById.mockResolvedValue({
      id: "job-1",
      userId: "user-1",
      type: "LOBBY_REMINDER",
      payload: { body: "hi" },
      status: "PENDING",
    });
    const provider = new FakeNotificationProvider();

    const result = await deliverNotificationJob(
      { notificationJobId: "job-1", correlationId: "c1" },
      { provider, channel: "whatsapp", attempt: 1, maxAttempts: 5 },
    );

    expect(result.outcome).toBe("sent");
    expect(dbMocks.notificationRepository.updateNotificationJobStatus).toHaveBeenCalledWith(
      "job-1",
      "PROCESSING",
    );
    expect(dbMocks.notificationRepository.updateNotificationJobStatus).toHaveBeenCalledWith(
      "job-1",
      "SENT",
    );
    expect(dbMocks.notificationRepository.createDeliveryLog).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: "job-1", channel: "whatsapp", status: "SENT" }),
    );
    expect(provider.sent).toHaveLength(1);
    expect(getMetrics().success).toBe(1);
  });

  it("skips already SENT jobs without calling provider", async () => {
    dbMocks.notificationRepository.findNotificationJobById.mockResolvedValue({
      id: "job-2",
      userId: "user-1",
      type: "LOBBY_REMINDER",
      payload: {},
      status: "SENT",
    });
    const provider = new FakeNotificationProvider();

    const result = await deliverNotificationJob(
      { notificationJobId: "job-2", correlationId: "c2" },
      { provider, channel: "whatsapp", attempt: 1, maxAttempts: 5 },
    );

    expect(result.outcome).toBe("skipped");
    expect(provider.sent).toHaveLength(0);
    expect(dbMocks.notificationRepository.createDeliveryLog).not.toHaveBeenCalled();
  });

  it("throws RetryableDeliveryError when provider fails and attempts remain", async () => {
    dbMocks.notificationRepository.findNotificationJobById.mockResolvedValue({
      id: "job-3",
      userId: "user-1",
      type: "LOBBY_REMINDER",
      payload: {},
      status: "PENDING",
    });
    const provider = new FakeNotificationProvider();
    provider.failNext = 1;

    await expect(
      deliverNotificationJob(
        { notificationJobId: "job-3", correlationId: "c3" },
        { provider, channel: "whatsapp", attempt: 1, maxAttempts: 5 },
      ),
    ).rejects.toBeInstanceOf(RetryableDeliveryError);

    expect(getMetrics().retry).toBe(1);
    expect(dbMocks.notificationRepository.createDeliveryLog).not.toHaveBeenCalled();
  });

  it("writes FAILED DeliveryLog on final attempt", async () => {
    dbMocks.notificationRepository.findNotificationJobById.mockResolvedValue({
      id: "job-4",
      userId: "user-1",
      type: "LOBBY_REMINDER",
      payload: {},
      status: "PROCESSING",
    });
    const provider = new FakeNotificationProvider();
    provider.failNext = 1;

    const result = await deliverNotificationJob(
      { notificationJobId: "job-4", correlationId: "c4" },
      { provider, channel: "whatsapp", attempt: 5, maxAttempts: 5 },
    );

    expect(result.outcome).toBe("failed");
    expect(dbMocks.notificationRepository.updateNotificationJobStatus).toHaveBeenCalledWith(
      "job-4",
      "FAILED",
    );
    expect(dbMocks.notificationRepository.createDeliveryLog).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: "job-4",
        status: "FAILED",
        error: expect.stringContaining("FAKE_PROVIDER_ERROR"),
      }),
    );
    expect(getMetrics().failure).toBe(1);
  });
});
