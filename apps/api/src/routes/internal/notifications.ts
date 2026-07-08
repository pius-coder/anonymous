import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { errorResponse, successResponse } from "../../lib/responses.js";
import {
  processNotificationSend,
  sendNotificationSchema,
} from "../../notifications/notifications.js";

const internalNotifications = new Hono();

const validationHook = (result: { success: boolean }, c: Parameters<typeof errorResponse>[0]) => {
  if (!result.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Validation failed");
  }
};

internalNotifications.post(
  "/notifications/send",
  zValidator("json", sendNotificationSchema, validationHook),
  async (c) => {
    const input = c.req.valid("json");
    const result = await processNotificationSend({ notificationJobId: input.notificationJobId });

    if (result.type === "not-found") {
      return errorResponse(c, 404, "NOTIFICATION_NOT_FOUND", "Notification job not found");
    }

    return successResponse(c, { result: result.type });
  },
);

export default internalNotifications;
