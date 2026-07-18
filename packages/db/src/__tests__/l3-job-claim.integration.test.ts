/**
 * L3: concurrent notification job claims — single winner.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { notificationRepository, userRepository } from "../repositories/index.js";
import {
  cleanupL3Fixtures,
  disconnectTestPrisma,
  getTestPrisma,
  isIntegrationEnv,
} from "./helpers.js";

const runL3 = isIntegrationEnv();

describe.skipIf(!runL3)("L3 notification job claim", () => {
  const prisma = getTestPrisma();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  beforeEach(async () => {
    await cleanupL3Fixtures({ emailPrefix: "l3-job-", partyCodePrefix: "L3-JOB-" });
  });

  afterAll(async () => {
    await cleanupL3Fixtures({ emailPrefix: "l3-job-", partyCodePrefix: "L3-JOB-" });
    await disconnectTestPrisma();
  });

  it("only one worker claims a pending job", async () => {
    const user = await userRepository.createUser({
      email: `l3-job-u-${suffix}@example.test`,
      name: "Job",
    });
    await notificationRepository.createNotificationJob({
      userId: user.id,
      type: "REMINDER",
      payload: { n: 1 },
      status: "PENDING",
      idempotencyKey: `l3-job-idemp-${suffix}`,
    });

    // Double create with same key returns same job
    const again = await notificationRepository.createNotificationJob({
      userId: user.id,
      type: "REMINDER",
      payload: { n: 1 },
      status: "PENDING",
      idempotencyKey: `l3-job-idemp-${suffix}`,
    });
    const count = await prisma.notificationJob.count({
      where: { idempotencyKey: `l3-job-idemp-${suffix}` },
    });
    expect(count).toBe(1);
    expect(again.idempotencyKey).toBe(`l3-job-idemp-${suffix}`);

    const [c1, c2] = await Promise.all([
      notificationRepository.claimNextNotificationJob({ workerId: "w1" }),
      notificationRepository.claimNextNotificationJob({ workerId: "w2" }),
    ]);

    const claimed = [c1, c2].filter(Boolean);
    expect(claimed).toHaveLength(1);
    expect(claimed[0]?.status).toBe("PROCESSING");

    const done = await notificationRepository.completeNotificationJob(
      claimed[0]!.id,
      claimed[0]!.claimToken!,
    );
    expect(done?.status).toBe("SENT");
  });
});
