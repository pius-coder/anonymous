import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const notificationMocks = vi.hoisted(() => ({
  processNotificationSend: vi.fn(),
}));

vi.mock("../../notifications/notifications.js", async () => {
  const actual = await vi.importActual<typeof import("../../notifications/notifications.js")>(
    "../../notifications/notifications.js",
  );
  return {
    ...actual,
    processNotificationSend: notificationMocks.processNotificationSend,
  };
});

import internalNotifications from "../internal/notifications.js";

function createApp() {
  const app = new Hono();
  app.route("/internal", internalNotifications);
  return app;
}

describe("internal notification routes", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    notificationMocks.processNotificationSend.mockResolvedValue({ type: "whatsapp-unavailable" });
  });

  it("returns 200 for non-blocking WhatsApp gateway failure", async () => {
    const res = await app.request("/internal/notifications/send", {
      method: "POST",
      body: JSON.stringify({ notificationJobId: "notification-1" }),
      headers: { "content-type": "application/json" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.result).toBe("whatsapp-unavailable");
  });
});
