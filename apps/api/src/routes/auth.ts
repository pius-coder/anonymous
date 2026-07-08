import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { prisma } from "@session-jeu/db";
import { hashPassword, verifyPassword } from "../auth/password.js";
import {
  PASSWORD_RESET_TTL_MS,
  createAuthSession,
  createOpaqueToken,
  clearSessionCookie,
  getClientIp,
  getRequestId,
  getUserAgent,
  hashOpaqueToken,
  requireAuth,
  revokeSessionFromRequest,
} from "../auth/session.js";
import type { AuthVariables } from "../auth/session.js";
import { clearAuthRateLimit, consumeAuthRateLimit } from "../auth/rateLimit.js";
import {
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "../auth/validation.js";
import { errorResponse, successResponse } from "../lib/responses.js";

const auth = new Hono<{ Variables: AuthVariables }>();

const validationHook = (
  result: { success: boolean; error?: unknown },
  c: Parameters<typeof errorResponse>[0],
) => {
  if (!result.success) {
    return errorResponse(c, 400, "VALIDATION_ERROR", "Validation failed");
  }
};

function publicUser(user: { id: string; email: string; name: string | null; role: string }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

function auditContext(c: Parameters<typeof getClientIp>[0]) {
  return {
    requestId: getRequestId(c),
    ipAddress: getClientIp(c),
    userAgent: getUserAgent(c),
  };
}

function rateLimitKey(c: Parameters<typeof getClientIp>[0], scope: string, email: string) {
  return `${scope}:${getClientIp(c) ?? "unknown"}:${email}`;
}

auth.post("/register", zValidator("json", registerSchema, validationHook), async (c) => {
  const input = c.req.valid("json");

  const [existingEmail, existingUsername, existingPhone] = await Promise.all([
    prisma.user.findUnique({ where: { email: input.email } }),
    prisma.playerProfile.findUnique({ where: { username: input.username } }),
    input.phone ? prisma.user.findUnique({ where: { phone: input.phone } }) : Promise.resolve(null),
  ]);

  if (existingEmail) {
    return errorResponse(c, 409, "EMAIL_ALREADY_USED", "Email is already used");
  }
  if (existingPhone) {
    return errorResponse(c, 409, "PHONE_ALREADY_USED", "Phone is already used");
  }
  if (existingUsername) {
    return errorResponse(c, 409, "USERNAME_ALREADY_USED", "Username is already used");
  }

  const passwordHash = await hashPassword(input.password);
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        passwordHash,
        name: input.name,
        role: "PLAYER",
        isActive: true,
        profile: {
          create: {
            username: input.username,
          },
        },
        roleAssignments: {
          create: {
            role: "PLAYER",
            reason: "auth.register",
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        sessionVersion: true,
      },
    });

    const session = await createAuthSession(c, tx, user);
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "auth.user-created",
        entity: "User",
        entityId: user.id,
        newData: { role: user.role },
        ...auditContext(c),
      },
    });

    return { user, sessionExpiresAt: session.expiresAt };
  });

  return successResponse(
    c,
    {
      user: publicUser(result.user),
      sessionExpiresAt: result.sessionExpiresAt.toISOString(),
    },
    201,
  );
});

auth.post("/login", zValidator("json", loginSchema, validationHook), async (c) => {
  const input = c.req.valid("json");
  const key = rateLimitKey(c, "login", input.email);
  const rate = consumeAuthRateLimit(key);
  if (!rate.allowed) {
    return errorResponse(c, 429, "LOGIN_RATE_LIMITED", "Too many login attempts", {
      resetAt: new Date(rate.resetAt).toISOString(),
    });
  }

  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
      isActive: true,
      sessionVersion: true,
    },
  });

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    return errorResponse(c, 401, "INVALID_CREDENTIALS", "Invalid credentials");
  }

  if (!user.isActive) {
    return errorResponse(c, 403, "ACCOUNT_DISABLED", "Account is disabled");
  }

  await revokeSessionFromRequest(c, prisma);
  const session = await createAuthSession(c, prisma, user);
  clearAuthRateLimit(key);

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "auth.login-succeeded",
      entity: "AuthSession",
      entityId: session.sessionId,
      ...auditContext(c),
    },
  });

  return successResponse(c, {
    user: publicUser(user),
    sessionExpiresAt: session.expiresAt.toISOString(),
  });
});

auth.post("/logout", requireAuth, async (c) => {
  const user = c.get("user");
  await prisma.authSession.update({
    where: { id: user.sessionId },
    data: { revokedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "auth.session-revoked",
      entity: "AuthSession",
      entityId: user.sessionId,
      ...auditContext(c),
    },
  });
  clearSessionCookie(c);

  return successResponse(c, { loggedOut: true });
});

auth.post(
  "/password/request-reset",
  zValidator("json", requestPasswordResetSchema, validationHook),
  async (c) => {
    const input = c.req.valid("json");
    const key = rateLimitKey(c, "password-reset", input.email);
    const rate = consumeAuthRateLimit(key);
    if (!rate.allowed) {
      return errorResponse(c, 429, "PASSWORD_RESET_RATE_LIMITED", "Too many reset attempts", {
        resetAt: new Date(rate.resetAt).toISOString(),
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, isActive: true },
    });

    if (user?.isActive) {
      const token = createOpaqueToken();
      await prisma.$transaction(async (tx) => {
        await tx.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: hashOpaqueToken(token),
            expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
          },
        });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "auth.password-reset-requested",
            entity: "User",
            entityId: user.id,
            ...auditContext(c),
          },
        });
      });
    }

    return successResponse(c, {
      message: "If an active account exists, a reset instruction has been created.",
    });
  },
);

auth.post("/password/reset", zValidator("json", resetPasswordSchema, validationHook), async (c) => {
  const input = c.req.valid("json");
  const tokenHash = hashOpaqueToken(input.token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          isActive: true,
        },
      },
    },
  });

  if (!resetToken || resetToken.usedAt) {
    return errorResponse(c, 400, "RESET_TOKEN_INVALID", "Reset token is invalid");
  }
  if (resetToken.expiresAt <= new Date()) {
    return errorResponse(c, 400, "RESET_TOKEN_EXPIRED", "Reset token is expired");
  }
  if (!resetToken.user.isActive) {
    return errorResponse(c, 403, "ACCOUNT_DISABLED", "Account is disabled");
  }

  const passwordHash = await hashPassword(input.password);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetToken.user.id },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 },
      },
    });
    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });
    await tx.authSession.updateMany({
      where: { userId: resetToken.user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        userId: resetToken.user.id,
        action: "auth.password-reset",
        entity: "User",
        entityId: resetToken.user.id,
        ...auditContext(c),
      },
    });
  });

  clearSessionCookie(c);
  return successResponse(c, { passwordReset: true });
});

export default auth;
