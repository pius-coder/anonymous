import { beforeEach, describe, expect, it, vi } from "vitest";

const queueAdd = vi.hoisted(() => vi.fn());

vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => ({ add: queueAdd })),
}));

import {
  NOTIFICATION_SEND_JOB,
  scheduleNotificationReminder,
} from "../notificationReminders.js";

describe("notification reminder queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses a stable BullMQ jobId to deduplicate reminders", async () => {
    await scheduleNotificationReminder({
      notificationJobId: "notification-1",
      sessionId: "session-1",
      type: "checkin:player-1",
      scheduledFor: new Date(Date.now() + 60_000),
    });

    expect(queueAdd).toHaveBeenCalledWith(
      NOTIFICATION_SEND_JOB,
      expect.objectContaining({ notificationJobId: "notification-1" }),
      expect.objectContaining({
        jobId: "notification.reminder.session-1.checkin_player-1",
        attempts: 3,
      }),
    );
  });
});
