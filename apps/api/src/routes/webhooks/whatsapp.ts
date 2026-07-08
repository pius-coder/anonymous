import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { errorResponse, successResponse } from "../../lib/responses.js";
import { recordWhatsappWebhook, whatsappWebhookSchema } from "../../notifications/notifications.js";

const whatsappWebhook = new Hono();

const validationHook = (result: { success: boolean }, c: Parameters<typeof errorResponse>[0]) => {
  if (!result.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Validation failed");
  }
};

whatsappWebhook.post(
  "/whatsapp",
  zValidator("json", whatsappWebhookSchema, validationHook),
  async (c) => {
    const payload = c.req.valid("json");
    const delivery = await recordWhatsappWebhook(payload);
    return successResponse(c, { received: true, deliveryLogId: delivery.id });
  },
);

export default whatsappWebhook;
