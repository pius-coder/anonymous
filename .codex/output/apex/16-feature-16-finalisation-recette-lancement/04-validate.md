# Validate

## Commands
- `pnpm --filter @session-jeu/shared typecheck` - passed
- `pnpm --filter @session-jeu/shared lint` - passed
- `pnpm --filter @session-jeu/shared test` - passed
- `pnpm --filter @session-jeu/db exec prisma format` - passed
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/session_jeu?schema=public pnpm --filter @session-jeu/db exec prisma validate` - passed
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/session_jeu?schema=public pnpm --filter @session-jeu/db db:generate` - passed
- `pnpm typecheck` - passed
- `pnpm lint` - passed
- `pnpm test` - passed
- `pnpm build` - passed
- `E2E_BASE_URL=http://localhost:3002 pnpm --filter @session-jeu/web test:e2e` - passed

## Notes
- Plain `pnpm --filter @session-jeu/db exec prisma validate` failed before setting `DATABASE_URL` explicitly because Prisma CLI did not load the repository root `.env` from the package command context.
- A previous dev server was already listening on port 3000 and returned HTTP 500. It was not killed. E2E was run against `next start --port 3002`.
