/**
 * L3: capacity / concurrency for party participation (real PostgreSQL).
 * Frontiers: repositories → PostgreSQL (no mocks).
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

describe.skipIf(!runL3)("L3 participation capacity / concurrency", () => {
  const prisma = getTestPrisma();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const partyCode = `L3-CAP-${suffix}`;

  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  beforeEach(async () => {
    await cleanupL3Fixtures({ emailPrefix: "l3-cap-", partyCodePrefix: "L3-CAP-" });
  });

  afterAll(async () => {
    await cleanupL3Fixtures({ emailPrefix: "l3-cap-", partyCodePrefix: "L3-CAP-" });
    await disconnectTestPrisma();
  });

  it("countActiveByPartyId excludes abandoned seats", async () => {
    const userA = await userRepository.createUser({
      email: `l3-cap-a-${suffix}@example.test`,
      name: "Cap A",
    });
    const userB = await userRepository.createUser({
      email: `l3-cap-b-${suffix}@example.test`,
      name: "Cap B",
    });
    const party = await partyRepository.createParty({
      code: partyCode,
      name: "Cap party",
      maxPlayers: 2,
    });
    await partyRepository.updatePartyStatus(party.id, "SCHEDULED");

    await participationRepository.createParticipation({
      partyId: party.id,
      userId: userA.id,
      status: "REGISTERED",
      idempotencyKey: `l3-cap-a-${suffix}`,
    });
    const b = await participationRepository.createParticipation({
      partyId: party.id,
      userId: userB.id,
      status: "REGISTERED",
      idempotencyKey: `l3-cap-b-${suffix}`,
    });
    await participationRepository.cancelParticipation(b.id, "test");

    expect(await participationRepository.countByPartyId(party.id)).toBe(2);
    expect(await participationRepository.countActiveByPartyId(party.id)).toBe(1);
  });

  it("unique (partyId, userId) prevents double seat under concurrent create", async () => {
    const user = await userRepository.createUser({
      email: `l3-cap-race-${suffix}@example.test`,
      name: "Race",
    });
    const party = await partyRepository.createParty({
      code: `${partyCode}-R`,
      name: "Race party",
      maxPlayers: 4,
    });
    await partyRepository.updatePartyStatus(party.id, "SCHEDULED");

    const results = await Promise.allSettled([
      participationRepository.createParticipation({
        partyId: party.id,
        userId: user.id,
        status: "REGISTERED",
        idempotencyKey: `l3-cap-race-a-${suffix}`,
      }),
      participationRepository.createParticipation({
        partyId: party.id,
        userId: user.id,
        status: "REGISTERED",
        idempotencyKey: `l3-cap-race-b-${suffix}`,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(await participationRepository.countActiveByPartyId(party.id)).toBe(1);
  });
});
