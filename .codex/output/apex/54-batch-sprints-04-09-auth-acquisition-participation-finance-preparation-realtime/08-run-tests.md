# Step 08: Run Tests

**Task:** batch sprints 04-09 - auth acquisition participation finance preparation realtime
**Started:** 2026-07-15T09:11:25Z

---

## Commands Run

- `pnpm --filter @session-jeu/db exec prisma generate --schema prisma/schema.prisma`
- `pnpm --filter @session-jeu/db exec prisma validate --schema prisma/schema.prisma`
- `pnpm --filter @session-jeu/db exec prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`
- `pnpm --filter @session-jeu/shared typecheck`
- `pnpm --filter @session-jeu/shared lint`
- `pnpm --filter @session-jeu/shared test`
- `pnpm --filter @session-jeu/shared build`
- `pnpm --filter @session-jeu/db typecheck`
- `pnpm --filter @session-jeu/db lint`
- `pnpm --filter @session-jeu/db test`
- `pnpm --filter @session-jeu/db build`
- `pnpm --filter @session-jeu/api typecheck`
- `pnpm --filter @session-jeu/api lint`
- `pnpm --filter @session-jeu/api test`
- `pnpm --filter @session-jeu/game-server typecheck`
- `pnpm --filter @session-jeu/game-server lint`
- `pnpm --filter @session-jeu/game-server test`
- `pnpm install --offline`
- `pnpm --filter @session-jeu/api build`
- `pnpm --filter @session-jeu/game-server build`
- `pnpm docs:check`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

## Result

All commands passed. The first game-server typecheck/test attempt failed before `pnpm install --offline`
because the new workspace dependency link for `@session-jeu/shared` was not materialized; rerun after the
offline install passed.
