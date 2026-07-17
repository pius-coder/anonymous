import type { MinigameManifest } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import type { CreateManifestData } from "./types.js";

export function upsertManifest(data: CreateManifestData): Promise<MinigameManifest> {
  return prisma.minigameManifest.upsert({
    where: {
      key_version: { key: data.key, version: data.version },
    },
    create: {
      key: data.key,
      family: data.family,
      name: data.name,
      version: data.version,
      enabled: data.enabled ?? true,
      resolverId: data.resolverId,
      config: (data.config ?? undefined) as Prisma.InputJsonValue | undefined,
      production: data.production ?? false,
    },
    update: {
      family: data.family,
      name: data.name,
      enabled: data.enabled ?? true,
      resolverId: data.resolverId,
      config: (data.config ?? undefined) as Prisma.InputJsonValue | undefined,
      production: data.production ?? false,
    },
  });
}

export function findManifest(key: string, version: string): Promise<MinigameManifest | null> {
  return prisma.minigameManifest.findUnique({
    where: { key_version: { key, version } },
  });
}

export function listEnabledManifests(): Promise<MinigameManifest[]> {
  return prisma.minigameManifest.findMany({
    where: { enabled: true },
    orderBy: [{ key: "asc" }, { version: "desc" }],
  });
}

export function listProductionManifests(): Promise<MinigameManifest[]> {
  return prisma.minigameManifest.findMany({
    where: { production: true, enabled: true },
    orderBy: { key: "asc" },
  });
}
