# Step 04: Validate

**Task:** Feature 08 lobby check-in preparation
**Started:** 2026-07-08T05:35:40Z

---

## Validation Progress

- `DATABASE_URL=... pnpm --filter @session-jeu/db exec prisma format` passed.
- `DATABASE_URL=... pnpm --filter @session-jeu/db exec prisma validate` passed.
- `DATABASE_URL=... pnpm --filter @session-jeu/db exec prisma generate` passed.
- `pnpm --filter @session-jeu/db build` passed.
- `pnpm typecheck` passed.
- `pnpm lint` passed.
- `pnpm test` initially failed because BullMQ custom job IDs cannot contain `:`; changed the job ID to `checkin.deadline-<sessionId>`.
- `pnpm test` passed after the fix.
- `pnpm build` passed.
