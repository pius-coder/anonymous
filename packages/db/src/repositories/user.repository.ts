import type { User, RoleAssignment } from "@prisma/client";
import { prisma } from "../prisma.js";
import type { CreateUserData, UpdateUserSessionData } from "./types.js";

export function createUser(data: CreateUserData): Promise<User> {
  return prisma.user.create({ data });
}

export function createUserWithRole(data: CreateUserData & { role: string }): Promise<User & { roleAssignments: RoleAssignment[] }> {
  return prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      avatarUrl: data.avatarUrl,
      passwordHash: data.passwordHash,
      sessionVersion: data.sessionVersion,
      roleAssignments: { create: { role: data.role } },
    },
    include: { roleAssignments: true },
  });
}

export function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export function findUserWithRoles(id: string): Promise<(User & { roleAssignments: RoleAssignment[] }) | null> {
  return prisma.user.findUnique({
    where: { id },
    include: { roleAssignments: true },
  });
}

export function findUserByEmailWithRoles(email: string): Promise<(User & { roleAssignments: RoleAssignment[] }) | null> {
  return prisma.user.findUnique({
    where: { email },
    include: { roleAssignments: true },
  });
}

export function findUsersByIds(ids: string[]): Promise<User[]> {
  return prisma.user.findMany({ where: { id: { in: ids } } });
}

export function listUsers(skip = 0, take = 50): Promise<User[]> {
  return prisma.user.findMany({ skip, take, orderBy: { createdAt: "desc" } });
}

export function updateUser(id: string, data: Partial<Pick<User, "name" | "avatarUrl" | "passwordHash" | "sessionVersion" | "lastLoginAt">>): Promise<User> {
  return prisma.user.update({ where: { id }, data });
}

export function updateUserSession(id: string, data: UpdateUserSessionData): Promise<User> {
  return prisma.user.update({ where: { id }, data });
}

export function deleteUser(id: string): Promise<User> {
  return prisma.user.delete({ where: { id } });
}
