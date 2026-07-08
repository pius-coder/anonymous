# Validate

## Commands
- `pnpm --filter @session-jeu/db exec prisma format` - passed
- `pnpm --filter @session-jeu/db exec prisma validate` - passed
- `pnpm --filter @session-jeu/db db:generate` - passed
- `pnpm --filter @session-jeu/api test -- --run src/routes/__tests__/admin-sessions.test.ts` - passed
- `pnpm typecheck` - passed
- `pnpm lint` - passed
- `pnpm test` - passed
- `pnpm build` - passed

## Final Test Result
- Full monorepo test suite passed.
- API package: 47 test files, 199 tests passed.
- All Turbo tasks successful.
