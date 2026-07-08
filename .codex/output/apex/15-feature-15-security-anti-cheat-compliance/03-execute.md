# Execute

## Implemented
- Added Feature 15 Prisma enums, relations, models, and migration SQL.
- Added DB package exports and tests for the new Prisma delegates/enums.
- Added API rate-limit middleware with deterministic test reset helper.
- Added `apps/api/src/security/security.ts` for:
  - default compliance gates,
  - compliance checks,
  - risk signal creation,
  - anti-cheat signal creation,
  - session risk reporting with hash redaction,
  - support dispute and moderation action creation.
- Mounted new API routes in `apps/api/src/index.ts`.
- Added admin security, public support/security, and internal anti-cheat route modules.
- Added publication compliance check to admin session publishing.
- Added mini-game chance-dominant risk compliance check to admin mini-game validation.
- Added payment and wallet rate limits.
- Added payment webhook signature risk logging.
- Added anti-cheat event/risk creation in game-server player action handling.

## Files Touched
- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/20260708130000_feature_15_security_anticheat_compliance/migration.sql`
- `packages/db/src/index.ts`
- `packages/db/src/__tests__/index.test.ts`
- `apps/api/src/index.ts`
- `apps/api/src/middleware/rateLimit.ts`
- `apps/api/src/middleware/__tests__/rateLimit.test.ts`
- `apps/api/src/security/security.ts`
- `apps/api/src/security/__tests__/security.test.ts`
- `apps/api/src/routes/security.ts`
- `apps/api/src/routes/admin/security.ts`
- `apps/api/src/routes/internal/anticheat.ts`
- `apps/api/src/routes/__tests__/security.test.ts`
- `apps/api/src/routes/__tests__/admin-security.test.ts`
- `apps/api/src/routes/__tests__/internal-anticheat.test.ts`
- `apps/api/src/routes/admin/sessions.ts`
- `apps/api/src/routes/__tests__/admin-sessions.test.ts`
- `apps/api/src/routes/admin/minigames.ts`
- `apps/api/src/routes/__tests__/admin-minigames.test.ts`
- `apps/api/src/routes/payments.ts`
- `apps/api/src/routes/wallet.ts`
- `apps/game-server/src/live/sessionStore.ts`
- `apps/game-server/src/live/__tests__/sessionStore.test.ts`
