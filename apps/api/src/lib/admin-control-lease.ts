/**
 * Multi-admin control lease for sensitive party commands.
 * Uses Redis when REDIS_URL is set; otherwise an in-process map (single instance / tests).
 * No DB schema required (P-A-ADMIN ownership forbids migrations).
 */

import { Redis } from "ioredis";

export class AdminLeaseError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, message: string, httpStatus: number) {
    super(message);
    this.name = "AdminLeaseError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export type LeaseStatus = {
  partyId: string;
  holderUserId: string | null;
  expiresAt: string | null;
  heldByCaller: boolean;
};

type LeaseRecord = {
  holderUserId: string;
  expiresAtMs: number;
};

const DEFAULT_TTL_SEC = 120;
const KEY_PREFIX = "admin:lease:";

const memoryLeases = new Map<string, LeaseRecord>();

let redisClient: Redis | null | undefined;
/** When true, force in-memory store (tests / Redis unavailable). */
let forceMemory = false;

function nowMs(): number {
  return Date.now();
}

function redisUrl(): string | undefined {
  if (forceMemory) return undefined;
  if (process.env.ADMIN_LEASE_MEMORY === "1") return undefined;
  if (process.env.NODE_ENV === "test" && process.env.ADMIN_LEASE_USE_REDIS !== "1") {
    return undefined;
  }
  const url = process.env.REDIS_URL?.trim();
  return url || undefined;
}

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const url = redisUrl();
  if (!url) {
    redisClient = null;
    return null;
  }
  redisClient = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: () => null,
  });
  redisClient.on("error", () => {
    /* avoid unhandled error spam; callers handle throws */
  });
  return redisClient;
}

/** Test helper: reset memory store and redis client handle. */
export function resetAdminLeaseStoreForTests(): void {
  memoryLeases.clear();
  forceMemory = true;
  if (redisClient) {
    void redisClient.quit().catch(() => undefined);
  }
  redisClient = undefined;
}

function key(partyId: string): string {
  return `${KEY_PREFIX}${partyId}`;
}

function parseRecord(raw: string | null): LeaseRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LeaseRecord;
    if (!parsed?.holderUserId || typeof parsed.expiresAtMs !== "number") return null;
    if (parsed.expiresAtMs <= nowMs()) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function readLease(partyId: string): Promise<LeaseRecord | null> {
  const redis = getRedis();
  if (!redis) {
    const rec = memoryLeases.get(partyId);
    if (!rec) return null;
    if (rec.expiresAtMs <= nowMs()) {
      memoryLeases.delete(partyId);
      return null;
    }
    return rec;
  }
  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }
    const raw = await redis.get(key(partyId));
    return parseRecord(raw);
  } catch {
    // Fall back to process memory so single-node/dev still works if Redis is down.
    forceMemory = true;
    redisClient = null;
    const rec = memoryLeases.get(partyId);
    if (!rec) return null;
    if (rec.expiresAtMs <= nowMs()) {
      memoryLeases.delete(partyId);
      return null;
    }
    return rec;
  }
}

async function writeLease(partyId: string, record: LeaseRecord, ttlSec: number): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    memoryLeases.set(partyId, record);
    return;
  }
  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }
    await redis.set(key(partyId), JSON.stringify(record), "EX", ttlSec);
  } catch {
    forceMemory = true;
    redisClient = null;
    memoryLeases.set(partyId, record);
  }
}

async function deleteLease(partyId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    memoryLeases.delete(partyId);
    return;
  }
  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }
    await redis.del(key(partyId));
  } catch {
    forceMemory = true;
    redisClient = null;
    memoryLeases.delete(partyId);
  }
}

export async function getLeaseStatus(partyId: string, callerUserId?: string): Promise<LeaseStatus> {
  const rec = await readLease(partyId);
  return {
    partyId,
    holderUserId: rec?.holderUserId ?? null,
    expiresAt: rec ? new Date(rec.expiresAtMs).toISOString() : null,
    heldByCaller: Boolean(rec && callerUserId && rec.holderUserId === callerUserId),
  };
}

export async function acquireLease(
  partyId: string,
  userId: string,
  ttlSec = DEFAULT_TTL_SEC,
): Promise<LeaseStatus> {
  const existing = await readLease(partyId);
  if (existing && existing.holderUserId !== userId) {
    throw new AdminLeaseError(
      "LEASE_HELD_BY_OTHER",
      `Contrôle détenu par un autre administrateur jusqu'à ${new Date(existing.expiresAtMs).toISOString()}`,
      409,
    );
  }
  const record: LeaseRecord = {
    holderUserId: userId,
    expiresAtMs: nowMs() + ttlSec * 1000,
  };
  await writeLease(partyId, record, ttlSec);
  return getLeaseStatus(partyId, userId);
}

export async function releaseLease(partyId: string, userId: string): Promise<LeaseStatus> {
  const existing = await readLease(partyId);
  if (!existing) {
    return getLeaseStatus(partyId, userId);
  }
  if (existing.holderUserId !== userId) {
    throw new AdminLeaseError(
      "LEASE_HELD_BY_OTHER",
      "Seul le détenteur du lease peut le libérer",
      409,
    );
  }
  await deleteLease(partyId);
  return getLeaseStatus(partyId, userId);
}

export async function assertLease(partyId: string, userId: string): Promise<void> {
  const existing = await readLease(partyId);
  if (!existing) {
    throw new AdminLeaseError(
      "ADMIN_LEASE_REQUIRED",
      "Lease de contrôle requis pour cette commande",
      409,
    );
  }
  if (existing.holderUserId !== userId) {
    throw new AdminLeaseError(
      "LEASE_HELD_BY_OTHER",
      "Un autre administrateur détient le lease de contrôle",
      409,
    );
  }
}
