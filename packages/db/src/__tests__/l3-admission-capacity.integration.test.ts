/**
 * L3: last-seat capacity race on real PostgreSQL.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  partyRepository,
  participationRepository,
  userRepository,
} from "../repositories/index.js";
import {
  cleanupL3Fixtures,
  disconnectTestPrisma,
  getTestPrisma,
  isIntegrationEnv,
} from "./helpers.js";

const runL3 = isIntegrationEnv();

describe.skipIf(!runL3)("L3 admission capacity last-seat race", () => {
  const prisma = getTestPrisma();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const partyCode = `L3-ADM-${suffix}`;

  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  beforeEach(async () => {
    await cleanupL3Fixtures({ emailPrefix: "l3-adm-", partyCodePrefix: "L3-ADM-" });
  });

  afterAll(async () => {
    await cleanupL3Fixtures({ emailPrefix: "l3-adm-", partyCodePrefix: "L3-ADM-" });
    await disconnectTestPrisma();
  });

  it("two concurrent admissions for last seat admit only one", async () => {
    const party = await partyRepository.createParty({
      code: partyCode,
      name: "Last seat party",
      maxPlayers: 1,
      entryFeeAmount: 100,
      entryFeeCurrency: "XAF",
      feeVersion: 1,
      configVersion: 1,
    });
    await partyRepository.updatePartyStatus(party.id, "SCHEDULED");

    const userA = await userRepository.createUser({
      email: `l3-adm-a-${suffix}@example.test`,
      name: "A",
    });
    const userB = await userRepository.createUser({
      email: `l3-adm-b-${suffix}@example.test`,
      name: "B",
    });

    const [r1, r2] = await Promise.all([
      participationRepository.tryRegisterWithCapacity({
        partyId: party.id,
        userId: userA.id,
        idempotencyKey: `l3-adm-a-${suffix}`,
      }),
      participationRepository.tryRegisterWithCapacity({
        partyId: party.id,
        userId: userB.id,
        idempotencyKey: `l3-adm-b-${suffix}`,
      }),
    ]);

    const successes = [r1, r2].filter((r) => r.ok);
    const failures = [r1, r2].filter((r) => !r.ok);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    if (!failures[0].ok) {
      expect(failures[0].reason).toBe("CAPACITY_FULL");
    }
    expect(await participationRepository.countActiveByPartyId(party.id)).toBe(1);
  });
});
