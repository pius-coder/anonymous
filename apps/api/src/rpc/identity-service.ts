import { Code, ConnectError, type ServiceImpl } from "@connectrpc/connect";
import { IdentityV1 } from "@session-jeu/contracts";
import { auditRepository } from "@session-jeu/db";
import { createClearSessionCookieValue, createSessionCookieValue } from "../auth/session.js";
import { clearRateLimit, consumeRateLimit } from "../auth/rateLimit.js";
import {
  loginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  registerSchema,
} from "../auth/validation.js";
import {
  loginUser,
  logoutUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  UseCaseError,
  type UserResult,
} from "../use-cases/auth/auth.use-case.js";
import {
  connectCodeFromHttpStatus,
  getRpcClientIp,
  getRpcUserFromToken,
  readRpcSessionToken,
  requireRpcUser,
  rpcForwardedProto,
} from "./auth-context.js";
import type { AuthUser } from "../middleware/auth.js";

const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

function toTimestamp(value: string | Date) {
  const milliseconds = new Date(value).getTime();
  return {
    seconds: BigInt(Math.floor(milliseconds / 1_000)),
    nanos: (milliseconds % 1_000) * 1_000_000,
  };
}

function toRole(role: string): IdentityV1.UserRole {
  return IdentityV1.UserRole[role as keyof typeof IdentityV1.UserRole]
    ?? IdentityV1.UserRole.UNSPECIFIED;
}

function toUser(user: UserResult | AuthUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? "",
    avatarUrl: user.avatarUrl ?? "",
    roles: user.roles.map(toRole),
    sessionVersion: user.sessionVersion,
    isActive: true,
    createdAt: toTimestamp(user.createdAt),
  };
}

function validationError(result: { error: { issues: { message: string }[] } }): never {
  throw new ConnectError(
    result.error.issues[0]?.message ?? "Requête invalide",
    Code.InvalidArgument,
  );
}

function handleUseCaseError(error: unknown): never {
  if (error instanceof UseCaseError) {
    throw new ConnectError(error.message, connectCodeFromHttpStatus(error.httpStatus));
  }
  throw ConnectError.from(error, Code.Internal);
}

export const identityService: Partial<ServiceImpl<typeof IdentityV1.IdentityService>> = {
  async register(request, context) {
    const parsed = registerSchema.safeParse(request);
    if (!parsed.success) validationError(parsed);

    try {
      const result = await registerUser(parsed.data);
      context.responseHeader.append(
        "set-cookie",
        createSessionCookieValue(
          result.session.token,
          new Date(result.session.expiresAt),
          rpcForwardedProto(context),
        ),
      );
      void auditRepository.createAuditLog({
        userId: result.user.id,
        action: "REGISTER",
        entity: "User",
        entityId: result.user.id,
        ipAddress: getRpcClientIp(context),
      });
      return {
        user: toUser(result.user),
        sessionToken: result.session.token,
        expiresAt: toTimestamp(result.session.expiresAt),
      };
    } catch (error) {
      handleUseCaseError(error);
    }
  },

  async login(request, context) {
    const parsed = loginSchema.safeParse(request);
    if (!parsed.success) validationError(parsed);

    const ip = getRpcClientIp(context);
    const rateLimitKey = `auth:login:${ip}:${parsed.data.email}`;
    const check = consumeRateLimit(rateLimitKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW);
    if (!check.allowed) {
      context.responseHeader.set(
        "retry-after",
        String(Math.ceil((check.resetAt - Date.now()) / 1_000)),
      );
      throw new ConnectError("Trop de tentatives, réessayez plus tard", Code.ResourceExhausted);
    }

    try {
      const result = await loginUser(parsed.data);
      clearRateLimit(rateLimitKey);
      context.responseHeader.append(
        "set-cookie",
        createSessionCookieValue(
          result.session.token,
          new Date(result.session.expiresAt),
          rpcForwardedProto(context),
        ),
      );
      void auditRepository.createAuditLog({
        userId: result.user.id,
        action: "LOGIN",
        entity: "User",
        entityId: result.user.id,
        ipAddress: ip,
      });
      return {
        user: toUser(result.user),
        sessionToken: result.session.token,
        expiresAt: toTimestamp(result.session.expiresAt),
      };
    } catch (error) {
      handleUseCaseError(error);
    }
  },

  async logout(_request, context) {
    const user = await requireRpcUser(context);
    await logoutUser(user.id);
    context.responseHeader.append(
      "set-cookie",
      createClearSessionCookieValue(rpcForwardedProto(context)),
    );
    void auditRepository.createAuditLog({
      userId: user.id,
      action: "LOGOUT",
      entity: "User",
      entityId: user.id,
      ipAddress: getRpcClientIp(context),
    });
    return {};
  },

  async authenticate(request, context) {
    const token = request.sessionToken || readRpcSessionToken(context);
    if (!token) throw new ConnectError("Session requise", Code.Unauthenticated);
    const user = await getRpcUserFromToken(token);
    if (!user) throw new ConnectError("Session invalide ou expirée", Code.Unauthenticated);
    return { user: toUser(user) };
  },

  async getCurrentUser(_request, context) {
    const user = await requireRpcUser(context);
    return { user: toUser(user) };
  },

  async revokeSession(request, context) {
    const currentUser = await requireRpcUser(context);
    const token = request.sessionToken || readRpcSessionToken(context);
    if (!token) throw new ConnectError("Session requise", Code.InvalidArgument);
    const targetUser = await getRpcUserFromToken(token);
    if (targetUser && targetUser.id !== currentUser.id && !currentUser.roles.includes("SUPER_ADMIN")) {
      throw new ConnectError("Permission insuffisante", Code.PermissionDenied);
    }
    if (targetUser) await logoutUser(targetUser.id);
    return {};
  },

  async requestPasswordReset(request, context) {
    const parsed = passwordResetRequestSchema.safeParse(request);
    if (!parsed.success) validationError(parsed);

    const ip = getRpcClientIp(context);
    const rateLimitKey = `auth:password-reset-request:${ip}:${parsed.data.email}`;
    const check = consumeRateLimit(rateLimitKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW);
    if (!check.allowed) {
      context.responseHeader.set(
        "retry-after",
        String(Math.ceil((check.resetAt - Date.now()) / 1_000)),
      );
      throw new ConnectError("Trop de tentatives, réessayez plus tard", Code.ResourceExhausted);
    }

    try {
      const result = await requestPasswordReset(parsed.data);
      // Identical public response whether the account exists or not.
      void auditRepository.createAuditLog({
        userId: undefined,
        action: "PASSWORD_RESET_REQUEST",
        entity: "User",
        // No email, no token — only a boolean + IP for security telemetry.
        metadata: { issued: result.issued },
        ipAddress: ip,
      });
      return {};
    } catch (error) {
      handleUseCaseError(error);
    }
  },

  async resetPassword(request, context) {
    const parsed = passwordResetSchema.safeParse(request);
    if (!parsed.success) validationError(parsed);

    const ip = getRpcClientIp(context);
    const rateLimitKey = `auth:password-reset:${ip}`;
    const check = consumeRateLimit(rateLimitKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW);
    if (!check.allowed) {
      context.responseHeader.set(
        "retry-after",
        String(Math.ceil((check.resetAt - Date.now()) / 1_000)),
      );
      throw new ConnectError("Trop de tentatives, réessayez plus tard", Code.ResourceExhausted);
    }

    try {
      const result = await resetPassword({
        token: parsed.data.token,
        newPassword: parsed.data.newPassword,
      });
      clearRateLimit(rateLimitKey);
      context.responseHeader.append(
        "set-cookie",
        createClearSessionCookieValue(rpcForwardedProto(context)),
      );
      void auditRepository.createAuditLog({
        userId: result.userId,
        action: "PASSWORD_RESET",
        entity: "User",
        entityId: result.userId,
        // Never log the reset token or the new password.
        metadata: { sessionsRevoked: true },
        ipAddress: ip,
      });
      return {};
    } catch (error) {
      handleUseCaseError(error);
    }
  },
};
