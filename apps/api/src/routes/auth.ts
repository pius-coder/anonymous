import { Hono } from "hono";
import type { AppEnv } from "../app-env.js";
import { auditRepository } from "@session-jeu/db";
import { zValidator } from "@hono/zod-validator";
import { setSessionCookieValue, clearSessionCookieValue, getClientIp } from "../auth/session.js";
import { registerSchema, loginSchema } from "../auth/validation.js";
import { consumeRateLimit, clearRateLimit } from "../auth/rateLimit.js";
import { requireAuth } from "../middleware/auth.js";
import { successResponse, errorResponse } from "../lib/responses.js";
import type { StatusCode } from "hono/utils/http-status";
import { registerUser, loginUser, logoutUser, UseCaseError } from "../use-cases/auth/auth.use-case.js";

const authRouter = new Hono<AppEnv>();

const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

function handleError(c: Parameters<typeof errorResponse>[0], err: unknown) {
  if (err instanceof UseCaseError) {
    return errorResponse(c, err.httpStatus as StatusCode, err.code, err.message);
  }
  console.error("Unexpected auth error:", err);
  return errorResponse(c, 500 as StatusCode, "INTERNAL", "Erreur interne du serveur");
}

authRouter.post("/register", zValidator("json", registerSchema), async (c) => {
  try {
    const { email, password, name } = c.req.valid("json");
    const result = await registerUser({ email, password, name });

    c.header("Set-Cookie", setSessionCookieValue(c, result.session.token, new Date(result.session.expiresAt)));

    await auditRepository.createAuditLog({
      userId: result.user.id,
      action: "REGISTER",
      entity: "User",
      entityId: result.user.id,
      ipAddress: getClientIp(c),
    }).catch(() => {});

    return successResponse(c, { user: result.user, session: result.session }, 201);
  } catch (err) {
    return handleError(c, err);
  }
});

authRouter.post("/login", zValidator("json", loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid("json");
    const ip = getClientIp(c);
    const rateLimitKey = `auth:login:${ip}:${email}`;

    const check = consumeRateLimit(rateLimitKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW);
    if (!check.allowed) {
      c.header("Retry-After", String(Math.ceil((check.resetAt - Date.now()) / 1000)));
      return errorResponse(c, 429, "RATE_LIMITED", "Trop de tentatives, réessayez plus tard", {
        remaining: check.remaining,
        resetAt: new Date(check.resetAt).toISOString(),
      });
    }

    const result = await loginUser({ email, password });
    clearRateLimit(rateLimitKey);
    c.header("Set-Cookie", setSessionCookieValue(c, result.session.token, new Date(result.session.expiresAt)));

    await auditRepository.createAuditLog({
      userId: result.user.id,
      action: "LOGIN",
      entity: "User",
      entityId: result.user.id,
      ipAddress: ip,
    }).catch(() => {});

    return successResponse(c, { user: result.user, session: result.session });
  } catch (err) {
    return handleError(c, err);
  }
});

authRouter.post("/logout", requireAuth, async (c) => {
  try {
    const user = c.get("user");
    await logoutUser(user.id);
    c.header("Set-Cookie", clearSessionCookieValue(c));

    await auditRepository.createAuditLog({
      userId: user.id,
      action: "LOGOUT",
      entity: "User",
      entityId: user.id,
      ipAddress: getClientIp(c),
    }).catch(() => {});

    return successResponse(c, { message: "Déconnecté" });
  } catch (err) {
    return handleError(c, err);
  }
});

export { authRouter };
