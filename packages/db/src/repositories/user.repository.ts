import { prisma } from "../prisma.js";
import type { User, CreateUserData } from "./types.js";

export function createUser(data: CreateUserData): Promise<User> {
  return prisma.user.create({ data });
}

export function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export function findUsersByIds(ids: string[]): Promise<User[]> {
  return prisma.user.findMany({ where: { id: { in: ids } } });
}

export function listUsers(skip = 0, take = 50): Promise<User[]> {
  return prisma.user.findMany({ skip, take, orderBy: { createdAt: "desc" } });
}

export function updateUser(id: string, data: Partial<Pick<User, "name" | "avatarUrl">>): Promise<User> {
  return prisma.user.update({ where: { id }, data });
}

export function deleteUser(id: string): Promise<User> {
  return prisma.user.delete({ where: { id } });
}
