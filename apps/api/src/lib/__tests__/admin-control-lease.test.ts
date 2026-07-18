import { afterEach, describe, expect, it } from "vitest";
import {
  acquireLease,
  assertLease,
  getLeaseStatus,
  releaseLease,
  resetAdminLeaseStoreForTests,
  AdminLeaseError,
} from "../admin-control-lease.js";

describe("admin control lease (L1/L3 memory)", () => {
  afterEach(() => {
    resetAdminLeaseStoreForTests();
    delete process.env.REDIS_URL;
  });

  it("grants lease to first admin and rejects second without release", async () => {
    const a = await acquireLease("party-1", "admin-a");
    expect(a.heldByCaller).toBe(true);
    expect(a.holderUserId).toBe("admin-a");

    await expect(acquireLease("party-1", "admin-b")).rejects.toMatchObject({
      code: "LEASE_HELD_BY_OTHER",
    });

    await expect(assertLease("party-1", "admin-b")).rejects.toBeInstanceOf(AdminLeaseError);
    await assertLease("party-1", "admin-a");
  });

  it("allows re-acquire by same holder and release", async () => {
    await acquireLease("party-1", "admin-a");
    await acquireLease("party-1", "admin-a");
    await releaseLease("party-1", "admin-a");
    const status = await getLeaseStatus("party-1", "admin-b");
    expect(status.holderUserId).toBeNull();
    await acquireLease("party-1", "admin-b");
  });

  it("requires lease for assert when free", async () => {
    await expect(assertLease("party-x", "admin-a")).rejects.toMatchObject({
      code: "ADMIN_LEASE_REQUIRED",
    });
  });
});
