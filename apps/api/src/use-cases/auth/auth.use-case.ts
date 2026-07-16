import {
  authRepository,
  notificationRepository,
  participationRepository,
  realtimeRepository,
  userRepository,
} from "@session-jeu/db";
import { AUTH_ERRORS } from "@session-jeu/shared";
import { hashPassword, verifyPassword } from "../../auth/password.js";
import { createOpaqueToken, hashOpaqueToken } from "../../auth/session.js";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UserResult {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  roles: string[];
  sessionVersion: number;
  createdAt: string;
}

export interface SessionResult {
  token: string;
  expiresAt: string;
}

export interface AuthResult {
  user: UserResult;
  session: SessionResult;
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const existing = await userRepository.findUserByEmail(input.email);
  if (existing) {
    throw new UseCaseError("EMAIL_ALREADY_EXISTS", "Cet email est déjà utilisé", 409);
  }

  if (input.password.length < 8) {
    throw new UseCaseError("WEAK_PASSWORD", "Le mot de passe doit contenir au moins 8 caractères", 422);
  }

  const passwordHash = hashPassword(input.password);
  const user = await userRepository.createUserWithRole({
    email: input.email,
    name: input.name,
    passwordHash,
    sessionVersion: 1,
    role: "PLAYER",
  });

  const token = createOpaqueToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await authRepository.createAuthSession({
    userId: user.id,
    token: hashOpaqueToken(token),
    expiresAt,
    sessionVersion: user.sessionVersion,
  });

  return {
    user: formatUser(user),
    session: { token, expiresAt: expiresAt.toISOString() },
  };
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const userWithRoles = await userRepository.findUserByEmailWithRoles(input.email);
  if (!userWithRoles || !userWithRoles.passwordHash) {
    throw new UseCaseError("INVALID_CREDENTIALS", "Email ou mot de passe incorrect", 401);
  }

  const valid = verifyPassword(input.password, userWithRoles.passwordHash);
  if (!valid) {
    throw new UseCaseError("INVALID_CREDENTIALS", "Email ou mot de passe incorrect", 401);
  }

  if (!userWithRoles.isActive) {
    throw new UseCaseError("ACCOUNT_DISABLED", "Compte désactivé", 403);
  }

  const token = createOpaqueToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await authRepository.createAuthSession({
    userId: userWithRoles.id,
    token: hashOpaqueToken(token),
    expiresAt,
    sessionVersion: userWithRoles.sessionVersion,
  });

  await userRepository.updateUserSession(userWithRoles.id, { lastLoginAt: new Date() });

  return {
    user: formatUser(userWithRoles),
    session: { token, expiresAt: expiresAt.toISOString() },
  };
}

export async function logoutUser(userId: string): Promise<void> {
  await authRepository.revokeUserSessions(userId);
}

/**
 * Always succeeds from the caller's perspective (no account enumeration).
 * When a matching active user exists, stores a hashed single-use token and
 * enqueues a delivery job whose payload carries the opaque token for the worker.
 * The plain token is never returned on the public RPC surface.
 */
export async function requestPasswordReset(input: {
  email: string;
}): Promise<{ issued: boolean }> {
  const user = await userRepository.findUserByEmail(input.email);
  if (!user || !user.isActive || !user.passwordHash) {
    return { issued: false };
  }

  const plainToken = createOpaqueToken();
  const tokenHash = hashOpaqueToken(plainToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await authRepository.createPasswordResetToken({
    userId: user.id,
    token: tokenHash,
    expiresAt,
  });

  // Delivery payload holds the opaque token for the notification worker only.
  // Audit logs must never include this value.
  await notificationRepository.createNotificationJob({
    userId: user.id,
    type: "PASSWORD_RESET",
    status: "PENDING",
    payload: {
      kind: "PASSWORD_RESET",
      expiresAt: expiresAt.toISOString(),
      token: plainToken,
    },
  });

  return { issued: true };
}

export async function resetPassword(input: {
  token: string;
  newPassword: string;
}): Promise<{ userId: string }> {
  if (input.newPassword.length < 8) {
    throw new UseCaseError(
      AUTH_ERRORS.WEAK_PASSWORD.code,
      AUTH_ERRORS.WEAK_PASSWORD.message,
      AUTH_ERRORS.WEAK_PASSWORD.status,
    );
  }

  const tokenHash = hashOpaqueToken(input.token);
  const resetToken = await authRepository.findPasswordResetToken(tokenHash);
  if (!resetToken || resetToken.consumedAt || resetToken.expiresAt <= new Date()) {
    throw new UseCaseError(
      AUTH_ERRORS.INVALID_PASSWORD_RESET_TOKEN.code,
      AUTH_ERRORS.INVALID_PASSWORD_RESET_TOKEN.message,
      AUTH_ERRORS.INVALID_PASSWORD_RESET_TOKEN.status,
    );
  }

  const passwordHash = hashPassword(input.newPassword);
  await userRepository.updateUser(resetToken.userId, { passwordHash });
  await authRepository.consumePasswordResetToken(resetToken.id);

  // Increment sessionVersion + delete auth sessions (public auth repository API).
  await authRepository.revokeUserSessions(resetToken.userId);

  // Expire live connection tokens so existing live access is refused.
  await revokeLiveConnectionsForUser(resetToken.userId);

  return { userId: resetToken.userId };
}

async function revokeLiveConnectionsForUser(userId: string): Promise<void> {
  const participations = await participationRepository.listParticipationsByUser(userId);
  for (const participation of participations) {
    const connection = await realtimeRepository.findByParticipation(participation.id);
    if (connection) {
      await realtimeRepository.deleteConnection(connection.id);
    }
  }
}

function formatUser(user: { id: string; email: string; name: string | null; avatarUrl: string | null; sessionVersion: number; createdAt: Date; roleAssignments?: { role: string }[] }): UserResult {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    roles: user.roleAssignments?.map((r) => r.role) ?? [],
    sessionVersion: user.sessionVersion,
    createdAt: user.createdAt.toISOString(),
  };
}

export class UseCaseError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, message: string, httpStatus: number) {
    super(message);
    this.name = "UseCaseError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}
