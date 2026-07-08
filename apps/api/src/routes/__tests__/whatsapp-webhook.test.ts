import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

const notificationMocks = vi.hoisted(() => ({
  recordWhatsappWebhook: vi.fn(),
}));

vi.mock("../../notifications/notifications.js", async () => {
  const actual = await vi.importActual<typeof import("../../notifications/notifications.js")>(
    "../../notifications/notifications.js",
  );
  return {
    ...actual,
    recordWhatsappWebhook: notificationMocks.recordWhatsappWebhook,
  };
});

import whatsappWebhook from "../webhooks/whatsapp.js";

function createApp() {
  const app = new Hono();
  app.route("/v1/webhooks", whatsappWebhook);
  return app;
}

describe("WhatsApp webhook route", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    notificationMocks.recordWhatsappWebhook.mockResolvedValue({ id: "delivery-1" });
  });

  it("accepts valid JSON webhook payloads", async () => {
    const res = await app.request("/v1/webhooks/whatsapp", {
      method: "POST",
      body: JSON.stringify({ object: "whatsapp_business_account" }),
      headers: { "content-type": "application/json" },
    });

    expect(res.status).toBe(200);
    expect(notificationMocks.recordWhatsappWebhook).toHaveBeenCalledWith({
      object: "whatsapp_business_account",
    });
  });
});
