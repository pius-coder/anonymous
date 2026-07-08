import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, type AuthVariables } from "../auth/session.js";
import { errorResponse, successResponse } from "../lib/responses.js";
import {
  getNotificationPreference,
  listInAppNotifications,
  notificationPreferencesPatchSchema,
  notificationsQuerySchema,
  updateNotificationPreference,
} from "../notifications/notifications.js";

const notifications = new Hono<{ Variables: AuthVariables }>();

const validationHook = (result: { success: boolean }, c: Parameters<typeof errorResponse>[0]) => {
  if (!result.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Validation failed");
  }
};

notifications.get("/notification-preferences", requireAuth, async (c) => {
  const user = c.get("user");
  const preferences = await getNotificationPreference(user.id);
  return successResponse(c, { preferences });
});

notifications.patch(
  "/notification-preferences",
  requireAuth,
  zValidator("json", notificationPreferencesPatchSchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const data = c.req.valid("json");
    const preferences = await updateNotificationPreference({ userId: user.id, data });
    return successResponse(c, { preferences });
  },
);

notifications.get(
  "/notifications",
  requireAuth,
  zValidator("query", notificationsQuerySchema, validationHook),
  async (c) => {
    const user = c.get("user");
    const query = c.req.valid("query");
    const result = await listInAppNotifications({
      userId: user.id,
      cursor: query.cursor,
      limit: query.limit,
    });
    return successResponse(c, result);
  },
);

export default notifications;
