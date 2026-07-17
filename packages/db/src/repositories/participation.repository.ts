import { Prisma, type PartyParticipation } from "@prisma/client";
import { prisma } from "../prisma.js";
import type { CreateParticipationData } from "./types.js";

const OCCUPYING_STATUSES_EXCLUDED = ["ABANDONED"] as const;

export function createParticipation(data: CreateParticipationData): Promise<PartyParticipation> {
  return prisma.partyParticipation.create({
    data: {
      partyId: data.partyId,
      userId: data.userId,
      role: data.role ?? "player",
      status: data.status ?? "INVITED",
      paymentState: data.paymentState ?? "NONE",
      admissionState: data.admissionState ?? "NOT_ADMITTED",
      idempotencyKey: data.idempotencyKey,
      expiresAt: data.expiresAt,
    },
  });
}

export function findParticipationById(id: string): Promise<PartyParticipation | null> {
  return prisma.partyParticipation.findUnique({ where: { id } });
}

export function findParticipation(partyId: string, userId: string): Promise<PartyParticipation | null> {
  return prisma.partyParticipation.findUnique({
    where: { partyId_userId: { partyId, userId } },
  });
}

export function findParticipationByIdempotencyKey(key: string): Promise<PartyParticipation | null> {
  return prisma.partyParticipation.findUnique({
    where: { idempotencyKey: key },
  });
}

export function listParticipationsByParty(partyId: string): Promise<PartyParticipation[]> {
  return prisma.partyParticipation.findMany({
    where: { partyId },
    orderBy: { createdAt: "asc" },
  });
}

export function listParticipationsByUser(userId: string): Promise<PartyParticipation[]> {
  return prisma.partyParticipation.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export function updateParticipationStatus(id: string, status: string): Promise<PartyParticipation> {
  return prisma.partyParticipation.update({ where: { id }, data: { status } });
}

export function updateParticipation(
  id: string,
  data: Partial<
    Pick<
      PartyParticipation,
      "status" | "readinessState" | "connectionState" | "role" | "paymentState" | "admissionState"
    >
  >,
): Promise<PartyParticipation> {
  return prisma.partyParticipation.update({ where: { id }, data });
}

export function updateParticipationReadiness(
  id: string,
  readinessState: string,
): Promise<PartyParticipation> {
  return prisma.partyParticipation.update({ where: { id }, data: { readinessState } });
}

export function updateParticipationStatusReadiness(
  id: string,
  status: string,
  readinessState: string,
): Promise<PartyParticipation> {
  return prisma.partyParticipation.update({ where: { id }, data: { status, readinessState } });
}

export function cancelParticipation(
  id: string,
  reason?: string,
): Promise<PartyParticipation> {
  return prisma.partyParticipation.update({
    where: { id },
    data: {
      status: "ABANDONED",
      admissionState: "RELEASED",
      cancelledAt: new Date(),
      cancellationReason: reason ?? null,
    },
  });
}

export function reactivateParticipation(id: string): Promise<PartyParticipation> {
  return prisma.partyParticipation.update({
    where: { id },
    data: {
      status: "REGISTERED",
      cancelledAt: null,
      cancellationReason: null,
      admissionState: "NOT_ADMITTED",
    },
  });
}

export function deleteParticipation(id: string): Promise<PartyParticipation> {
  return prisma.partyParticipation.delete({ where: { id } });
}

export function countByPartyId(partyId: string): Promise<number> {
  return prisma.partyParticipation.count({ where: { partyId } });
}

/** Count seats that still occupy capacity (excludes abandoned / cancelled). */
export function countActiveByPartyId(partyId: string): Promise<number> {
  return prisma.partyParticipation.count({
    where: {
      partyId,
      status: { notIn: [...OCCUPYING_STATUSES_EXCLUDED] },
      cancelledAt: null,
    },
  });
}

export type RegisterWithCapacityResult =
  | { ok: true; participation: PartyParticipation; created: boolean }
  | { ok: false; reason: "CAPACITY_FULL" | "PARTY_NOT_FOUND" };

/**
 * Atomic capacity-aware registration.
 * Two concurrent claims for the last seat: only one succeeds.
 * Uses party row lock + active count inside Serializable transaction.
 */
export async function tryRegisterWithCapacity(input: {
  partyId: string;
  userId: string;
  role?: string;
  status?: string;
  idempotencyKey?: string;
  expiresAt?: Date;
  /** Internal retry counter for serializable aborts. */
  _attempt?: number;
}): Promise<RegisterWithCapacityResult> {
  const attempt = input._attempt ?? 0;
  try {
    return await prisma.$transaction(
      async (tx) => {
        if (input.idempotencyKey) {
          const byKey = await tx.partyParticipation.findUnique({
            where: { idempotencyKey: input.idempotencyKey },
          });
          if (byKey) {
            return { ok: true as const, participation: byKey, created: false };
          }
        }

        const existing = await tx.partyParticipation.findUnique({
          where: {
            partyId_userId: { partyId: input.partyId, userId: input.userId },
          },
        });
        if (existing && existing.status !== "ABANDONED" && !existing.cancelledAt) {
          return { ok: true as const, participation: existing, created: false };
        }

        // Lock party row for capacity decision.
        const locked = await tx.$queryRaw<Array<{ id: string; maxPlayers: number | null }>>`
          SELECT id, "maxPlayers" FROM "Party" WHERE id = ${input.partyId} FOR UPDATE
        `;
        if (!locked.length) {
          return { ok: false as const, reason: "PARTY_NOT_FOUND" as const };
        }
        const maxPlayers = locked[0].maxPlayers;

        if (maxPlayers != null) {
          const active = await tx.partyParticipation.count({
            where: {
              partyId: input.partyId,
              status: { notIn: [...OCCUPYING_STATUSES_EXCLUDED] },
              cancelledAt: null,
            },
          });
          if (active >= maxPlayers) {
            return { ok: false as const, reason: "CAPACITY_FULL" as const };
          }
        }

        if (existing) {
          const reactivated = await tx.partyParticipation.update({
            where: { id: existing.id },
            data: {
              status: input.status ?? "REGISTERED",
              role: input.role ?? existing.role,
              cancelledAt: null,
              cancellationReason: null,
              admissionState: "PENDING",
              paymentState: existing.paymentState === "PAID" ? "PAID" : "NONE",
              idempotencyKey: input.idempotencyKey ?? existing.idempotencyKey,
              expiresAt: input.expiresAt ?? existing.expiresAt,
            },
          });
          return { ok: true as const, participation: reactivated, created: false };
        }

        const participation = await tx.partyParticipation.create({
          data: {
            partyId: input.partyId,
            userId: input.userId,
            role: input.role ?? "player",
            status: input.status ?? "REGISTERED",
            paymentState: "NONE",
            admissionState: "PENDING",
            idempotencyKey: input.idempotencyKey,
            expiresAt: input.expiresAt,
          },
        });
        return { ok: true as const, participation, created: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isSerialize =
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" || error.code === "P2028")) ||
      /could not serialize|40001/i.test(message);
    if (isSerialize && attempt < 12) {
      return tryRegisterWithCapacity({ ...input, _attempt: attempt + 1 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const again = await prisma.partyParticipation.findUnique({
        where: {
          partyId_userId: { partyId: input.partyId, userId: input.userId },
        },
      });
      if (again && again.status !== "ABANDONED" && !again.cancelledAt) {
        return { ok: true, participation: again, created: false };
      }
      if (attempt < 12) {
        return tryRegisterWithCapacity({ ...input, _attempt: attempt + 1 });
      }
      return { ok: false, reason: "CAPACITY_FULL" };
    }
    throw error;
  }
}

/**
 * Link payment success to participation admission atomically.
 */
export async function linkPaymentAndAdmit(input: {
  participationId: string;
  paymentTransactionId: string;
  paymentState?: string;
  admissionState?: string;
}): Promise<PartyParticipation> {
  return prisma.partyParticipation.update({
    where: { id: input.participationId },
    data: {
      paymentTransactionId: input.paymentTransactionId,
      paymentState: input.paymentState ?? "PAID",
      admissionState: input.admissionState ?? "ADMITTED",
    },
  });
}
