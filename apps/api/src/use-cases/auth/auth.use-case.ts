import { userRepository, authRepository } from "@session-jeu/db";
import { hashPassword, verifyPassword } from "../../auth/password.js";
import { createOpaqueToken, hashOpaqueToken } from "../../auth/session.js";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

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
