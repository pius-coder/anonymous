import { Code, ConnectError, type HandlerContext } from "@connectrpc/connect";
import { authRepository } from "@session-jeu/db";
import { AUTH_ERRORS } from "@session-jeu/shared";
import {
  createClearSessionCookieValue,
  hashOpaqueToken,
  readSessionCookieHeader,
} from "../auth/session.js";
import type { AuthUser } from "../middleware/auth.js";

function forwardedProto(context: HandlerContext): string | undefined {
  return context.requestHeader.get("x-forwarded-proto") ?? undefined;
}

export function getRpcClientIp(context: HandlerContext): string {
  const forwarded = context.requestHeader.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return context.requestHeader.get("x-real-ip") ?? "unknown";
}

export function readRpcSessionToken(context: HandlerContext): string | undefined {
  return readSessionCookieHeader(
    context.requestHeader.get("cookie") ?? undefined,
    forwardedProto(context),
  );
}

export async function getRpcUserFromToken(token: string): Promise<AuthUser | null> {
  const session = await authRepository.findAuthSessionByToken(hashOpaqueToken(token));
  if (!session || session.expiresAt < new Date()) {
    if (session) void authRepository.revokeAuthSession(session.id);
    return null;
  }

  if (session.sessionVersion !== session.user.sessionVersion) {
    void authRepository.revokeAuthSession(session.id);
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    avatarUrl: session.user.avatarUrl,
    roles: session.user.roleAssignments?.map((assignment) => assignment.role) ?? [],
    sessionVersion: session.user.sessionVersion,
    createdAt: session.user.createdAt.toISOString(),
  };
}

export async function requireRpcUser(context: HandlerContext): Promise<AuthUser> {
  const token = readRpcSessionToken(context);
  if (!token) {
    throw new ConnectError(AUTH_ERRORS.UNAUTHORIZED.message, Code.Unauthenticated);
  }

  const user = await getRpcUserFromToken(token);
  if (!user) {
    context.responseHeader.append(
      "set-cookie",
      createClearSessionCookieValue(forwardedProto(context)),
    );
    throw new ConnectError(AUTH_ERRORS.SESSION_EXPIRED.message, Code.Unauthenticated);
  }
  return user;
}

export async function requireRpcRole(
  context: HandlerContext,
  ...roles: string[]
): Promise<AuthUser> {
  const user = await requireRpcUser(context);
  if (!roles.some((role) => user.roles.includes(role))) {
    throw new ConnectError("Permission insuffisante", Code.PermissionDenied);
  }
  return user;
}

export function rpcForwardedProto(context: HandlerContext): string | undefined {
  return forwardedProto(context);
}

export function connectCodeFromHttpStatus(status: number): Code {
  switch (status) {
    case 400:
      return Code.InvalidArgument;
    case 401:
      return Code.Unauthenticated;
    case 403:
      return Code.PermissionDenied;
    case 404:
      return Code.NotFound;
    case 409:
      return Code.AlreadyExists;
    case 422:
      return Code.FailedPrecondition;
    case 429:
      return Code.ResourceExhausted;
    default:
      return Code.Internal;
  }
}
