import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { errorResponse, successResponse } from "../../lib/responses.js";
import { anticheatSignalSchema, createAntiCheatSignal } from "../../security/security.js";

const anticheat = new Hono();

const validationHook = (result: { success: boolean }, c: Parameters<typeof errorResponse>[0]) => {
  if (!result.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Validation failed");
  }
};

anticheat.use("*", async (c, next) => {
  const expected = process.env.INTERNAL_API_KEY;
  if (expected && c.req.header("x-internal-api-key") !== expected) {
    return errorResponse(c, 401, "INTERNAL_AUTH_REQUIRED", "Internal API key is required");
  }
  await next();
});

anticheat.post(
  "/anticheat/signal",
  zValidator("json", anticheatSignalSchema, validationHook),
  async (c) => {
    const data = c.req.valid("json");
    const result = await createAntiCheatSignal(data);
    return successResponse(c, { event: result.event, riskSignal: result.risk }, 201);
  },
);

export default anticheat;
