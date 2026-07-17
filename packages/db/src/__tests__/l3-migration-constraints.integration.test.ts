/**
 * L3: verify production constraints exist on real PostgreSQL after migrate.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { disconnectTestPrisma, getTestPrisma, isIntegrationEnv } from "./helpers.js";

const runL3 = isIntegrationEnv();

describe.skipIf(!runL3)("L3 migration constraints present", () => {
  const prisma = getTestPrisma();

  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  it("partial unique indexes and enums exist", async () => {
    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname IN (
          'PaymentTransaction_providerTransId_unique',
          'PaymentTransaction_providerExternalId_unique',
          'ProviderWebhookInbox_provider_externalEventId_key',
          'NotificationJob_idempotencyKey_key',
          'RoundCheckpoint_roundId_version_key'
        )
    `;
    const names = indexes.map((i) => i.indexname).sort();
    expect(names).toContain("PaymentTransaction_providerTransId_unique");
    expect(names).toContain("PaymentTransaction_providerExternalId_unique");
    expect(names).toContain("ProviderWebhookInbox_provider_externalEventId_key");
    expect(names).toContain("NotificationJob_idempotencyKey_key");
    expect(names).toContain("RoundCheckpoint_roundId_version_key");

    const enums = await prisma.$queryRaw<Array<{ typname: string }>>`
      SELECT typname FROM pg_type
      WHERE typname IN (
        'PaymentStatus',
        'PaymentInternalStatus',
        'FapshiWireStatus',
        'ProviderServiceKind',
        'WebhookInboxStatus'
      )
      ORDER BY typname
    `;
    expect(enums.map((e) => e.typname)).toEqual(
      expect.arrayContaining([
        "PaymentStatus",
        "PaymentInternalStatus",
        "FapshiWireStatus",
        "ProviderServiceKind",
        "WebhookInboxStatus",
      ]),
    );

    const migrations = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM _prisma_migrations
      WHERE migration_name = '20260717120000_production_data'
    `;
    expect(migrations).toHaveLength(1);
  });
});
