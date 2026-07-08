# Run Tests

## Focused Tests
- `pnpm --filter @session-jeu/api test -- --run src/security/__tests__/security.test.ts src/routes/__tests__/security.test.ts src/routes/__tests__/admin-security.test.ts src/routes/__tests__/internal-anticheat.test.ts src/middleware/__tests__/rateLimit.test.ts src/routes/__tests__/admin-minigames.test.ts` - passed
- `pnpm --filter @session-jeu/game-server test -- --run src/live/__tests__/sessionStore.test.ts` - passed
- `pnpm --filter @session-jeu/db test` - passed
- `pnpm --filter @session-jeu/api test -- --run src/routes/__tests__/admin-sessions.test.ts` - passed

## Full Validation
- `pnpm typecheck` - passed
- `pnpm lint` - passed
- `pnpm test` - passed
- `pnpm build` - passed
