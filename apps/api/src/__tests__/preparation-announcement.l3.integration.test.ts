/**
 * L3: atomic Announcement + AuditLog + NotificationJob on real PostgreSQL.
 * Frontiers: use-case → Prisma → PostgreSQL (no mocks for persistence).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  openPreparation,
  markPresent,
  markReady,
  confirmStart,
  sendPreparationAnnouncement,
} from "../use-cases/preparation/preparation.use-case.js";

const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
const runL3 = Boolean(databaseUrl);

const prisma = new PrismaClient(
  databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined,
);

const suffix = `prep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const emailPrefix = `l3-prep-${suffix}`;
const partyCode = `L3-PREP-${suffix}`.slice(0, 32);

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: "l3-prep-" } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);
  const parties = await prisma.party.findMany({
    where: { code: { startsWith: "L3-PREP-" } },
    select: { id: true },
  });
  const partyIds = parties.map((p) => p.id);

  const jobs = await prisma.notificationJob.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  await prisma.deliveryLog.deleteMany({ where: { jobId: { in: jobs.map((j) => j.id) } } });
  await prisma.notificationJob.deleteMany({ where: { id: { in: jobs.map((j) => j.id) } } });
  await prisma.announcement.deleteMany({
    where: { OR: [{ partyId: { in: partyIds } }, { createdBy: { in: userIds } }] },
  });
  await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.partyParticipation.deleteMany({
    where: { OR: [{ partyId: { in: partyIds } }, { userId: { in: userIds } }] },
  });
  await prisma.party.deleteMany({ where: { id: { in: partyIds } } });
  await prisma.roleAssignment.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

describe.skipIf(!runL3)("L3 preparation atomicity / idempotence", () => {
  let adminId = "";
  let playerId = "";
  let partyId = "";

  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  beforeEach(async () => {
    await cleanup();
    const admin = await prisma.user.create({
      data: {
        email: `${emailPrefix}-admin@example.test`,
        name: "Admin Prep",
        roleAssignments: { create: { role: "ADMIN" } },
      },
    });
    const player = await prisma.user.create({
      data: {
        email: `${emailPrefix}-player@example.test`,
        name: "Player Prep",
        roleAssignments: { create: { role: "PLAYER" } },
      },
    });
    const party = await prisma.party.create({
      data: {
        code: partyCode,
        name: "Prep L3",
        status: "SCHEDULED",
      },
    });
    await prisma.partyParticipation.create({
      data: {
        partyId: party.id,
        userId: player.id,
        role: "player",
        status: "PAID",
        readinessState: "offline",
        idempotencyKey: `l3-prep-part-${suffix}`,
      },
    });
    adminId = admin.id;
    playerId = player.id;
    partyId = party.id;
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("atomically creates announcement + audit + pending NotificationJob", async () => {
    await openPreparation({ partyId, userId: adminId });

    const result = await sendPreparationAnnouncement({
      partyId,
      userId: adminId,
      title: "Lobby open",
      body: "Confirmez présence puis prêt",
    });

    const announcement = await prisma.announcement.findUnique({ where: { id: result.id } });
    const job = await prisma.notificationJob.findUnique({
      where: { id: result.notificationJobId },
    });
    const audits = await prisma.auditLog.findMany({
      where: { action: "ANNOUNCEMENT_SEND", entityId: result.id },
    });

    expect(announcement?.title).toBe("Lobby open");
    expect(job?.status).toBe("PENDING");
    expect(job?.type).toBe("PREPARATION_ANNOUNCEMENT");
    expect(audits).toHaveLength(1);
    // Delivery must not be created by preparation (A-WORKERS ownership).
    const deliveries = await prisma.deliveryLog.count({ where: { jobId: job!.id } });
    expect(deliveries).toBe(0);
  });

  it("is idempotent for present/ready and requires reason when absents on confirm", async () => {
    await openPreparation({ partyId, userId: adminId });

    const first = await markPresent({ partyId, userId: playerId });
    const second = await markPresent({ partyId, userId: playerId });
    expect(first.status).toBe("PRESENT");
    expect(second.status).toBe("PRESENT");

    const ready1 = await markReady({ partyId, userId: playerId });
    const ready2 = await markReady({ partyId, userId: playerId });
    expect(ready1.status).toBe("READY");
    expect(ready2.status).toBe("READY");

    // Add an absent participant
    const absentee = await prisma.user.create({
      data: { email: `${emailPrefix}-abs@example.test`, name: "Absent" },
    });
    await prisma.partyParticipation.create({
      data: {
        partyId,
        userId: absentee.id,
        role: "player",
        status: "PAID",
        readinessState: "offline",
        idempotencyKey: `l3-prep-abs-${suffix}`,
      },
    });

    await expect(confirmStart({ partyId, userId: adminId, forceWithAbsents: true })).rejects.toMatchObject({
      code: "ABSENT_CONFIRMATION_REQUIRED",
    });

    const locked = await confirmStart({
      partyId,
      userId: adminId,
      forceWithAbsents: true,
      overrideReason: "Absent contacté par support — autorisation manuelle.",
    });
    expect(locked.status).toBe("PREPARATION_LOCKED");
    const party = await prisma.party.findUnique({ where: { id: partyId } });
    expect(party?.status).toBe("PREPARATION_LOCKED");
    expect(party?.status).not.toBe("ROUND_ACTIVE");
  });
});
