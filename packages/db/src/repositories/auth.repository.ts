import type { AuthSession, PasswordResetToken, User, RoleAssignment } from "@prisma/client";
import { prisma } from "../prisma.js";
import type { CreateAuthSessionData, CreatePasswordResetTokenData } from "./types.js";

export type SessionWithUser = AuthSession & { user: User & { roleAssignments: RoleAssignment[] } };

export function createAuthSession(data: CreateAuthSessionData): Promise<AuthSession> {
  return prisma.authSession.create({ data });
}

export function findAuthSessionByToken(token: string): Promise<SessionWithUser | null> {
  return prisma.authSession.findUnique({
    where: { token },
    include: { user: { include: { roleAssignments: true } } },
  });
}

export function revokeAuthSession(id: string): Promise<AuthSession> {
  return prisma.authSession.delete({ where: { id } });
}

export function revokeUserSessions(userId: string): Promise<{ count: number }> {
  return prisma.$transaction(async (tx) => {
    const deleted = await tx.authSession.deleteMany({ where: { userId } });
    await tx.user.update({
      where: { id: userId },
      data: { sessionVersion: { increment: 1 } },
    });
    return deleted;
  });
}

export function findActiveSessionsByUser(userId: string): Promise<AuthSession[]> {
  return prisma.authSession.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
  });
}

export function createPasswordResetToken(data: CreatePasswordResetTokenData): Promise<PasswordResetToken> {
  return prisma.passwordResetToken.create({ data });
}

export function findPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
  return prisma.passwordResetToken.findUnique({ where: { token } });
}

export function consumePasswordResetToken(id: string): Promise<PasswordResetToken> {
  return prisma.passwordResetToken.update({
    where: { id },
    data: { consumedAt: new Date() },
  });
}
