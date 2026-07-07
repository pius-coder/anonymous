# Step 02: Plan

**Task:** Implement Sprint 0 initialization: monorepo structure, local infra (PostgreSQL/Redis), Prisma schema, and transverse patterns from plan/00-initialisation-projet.md
**Started:** 2026-07-07T20:18:29Z

---

## Planning Progress

## Implementation Plan: Sprint 0 Initialization

### Overview

Build the entire monorepo foundation from scratch using pnpm workspaces + Turborepo. All stories implemented sequentially with CLI commands only (no manual file creation).

### Prerequisites

- [x] Git initialized
- [ ] pnpm installed (or npm with workspaces)
- [ ] Docker installed

---

## Story 0.1: Initialize Monorepo

### File Changes

#### Root `package.json`
- Create with `name: "session-jeu"`, `private: true`
- Add `packageManager: "pnpm@9.x"`
- Add scripts: `dev`, `build`, `lint`, `typecheck`, `test`

#### Root `pnpm-workspace.yaml`
- Define packages: `apps/*`, `packages/*`

#### Root `turbo.json`
- Configure pipeline: `build`, `dev`, `lint`, `typecheck`, `test`

#### Root `tsconfig.base.json`
- Strict mode, ES2022, NodeNext module resolution
- Path aliases for `@session-jeu/*`

#### Root `.eslintrc.cjs`
- Shared ESLint config with TypeScript

#### Root `.prettierrc`
- Shared Prettier config

#### `apps/web/package.json`
- Next.js 14 app
- Scripts: `dev`, `build`, `start`, `lint`

#### `apps/web/tsconfig.json`
- Extends base, includes Next.js config

#### `apps/api/package.json`
- Hono API server
- Scripts: `dev`, `build`, `start`

#### `apps/api/tsconfig.json`
- Extends base

#### `apps/game-server/package.json`
- Colyseus game server
- Scripts: `dev`, `build`, `start`

#### `apps/game-server/tsconfig.json`
- Extends base

#### `apps/worker/package.json`
- BullMQ worker
- Scripts: `dev`, `build`, `start`

#### `apps/worker/tsconfig.json`
- Extends base

#### `apps/whatsapp-gateway/package.json`
- Placeholder service
- Scripts: `dev`, `build`, `start`

#### `packages/db/package.json`
- Prisma client package
- Scripts: `build`, `db:migrate`, `db:seed`, `db:studio`

#### `packages/db/tsconfig.json`
- Extends base

#### `packages/game-engine/package.json`
- Game resolvers package
- Scripts: `build`

#### `packages/game-engine/tsconfig.json`
- Extends base

#### `packages/shared/package.json`
- Shared types, constants, errors, schemas
- Scripts: `build`

#### `packages/shared/tsconfig.json`
- Extends base

---

## Story 0.2: Initialize Local Infrastructure

### File Changes

#### `docker-compose.yml`
- PostgreSQL 16 service
- Redis 7 service
- Health checks
- Volume mounts for data persistence

#### `.env.example`
- `DATABASE_URL`
- `REDIS_URL`
- `FAPSHI_API_KEY_SANDBOX`
- `FAPSHI_API_KEY_LIVE`
- `NODE_ENV`

#### `.env`
- Copy from `.env.example` with defaults

#### Root scripts in `package.json`
- `db:migrate` → `turbo run db:migrate --filter=@session-jeu/db`
- `db:seed` → `turbo run db:seed --filter=@session-jeu/db`
- `dev` → `turbo run dev`
- `test` → `turbo run test`
- `lint` → `turbo run lint`
- `typecheck` → `turbo run typecheck`

---

## Story 0.3: Initialize Prisma

### File Changes

#### `packages/db/prisma/schema.prisma`
- PostgreSQL provider
- Datasource with `DATABASE_URL`
- Enums: UserRole, GameSessionStatus, SessionRegistrationStatus, PaymentStatus, LedgerDirection, LedgerType, RoundStatus
- Models: User, PlayerProfile, GameSession, SessionRegistration, PaymentTransaction, Wallet, LedgerEntry, RoundInstance, RoundResult, GameResult, PrizeDistribution, AuditLog
- Unique constraints on User.email, PlayerProfile, GameSession.code, Wallet.userId, etc.
- Indexes on foreign keys

#### `packages/db/prisma/migrations/`
- Initial migration from schema

#### `packages/db/seed.ts`
- Development seed data
- Public and private sessions
- Runs idempotently (upserts)

---

## Story 0.4: Initialize Transverse Patterns

### File Changes

#### `packages/shared/src/errors/index.ts`
- Standard error format: `ApiError`, `NotFoundError`, `ValidationError`, `UnauthorizedError`

#### `packages/shared/src/constants/index.ts`
- Event names, outbox types, pagination defaults

#### `packages/shared/src/types/index.ts`
- Shared TypeScript types

#### `packages/shared/src/schemas/index.ts`
- Zod validation schemas

#### `packages/shared/src/index.ts`
- Barrel export

#### `apps/api/src/middleware/requestId.ts`
- UUID request ID middleware

#### `apps/api/src/middleware/secureHeaders.ts`
- Security headers middleware

#### `apps/api/src/middleware/bodyLimit.ts`
- Request body size limit middleware

#### `apps/api/src/routes/health.ts`
- Healthcheck endpoint: `GET /health`

#### `packages/db/src/audit.ts`
- `writeAuditLog()` helper

#### `packages/db/src/transaction.ts`
- `prismaTransaction()` helper

#### `packages/shared/src/events/index.ts`
- Event constants for outbox pattern

---

## Testing Strategy

### Unit Tests
- `packages/shared/src/errors/errors.test.ts` - Error classes
- `packages/db/src/audit.test.ts` - Audit log helper
- `packages/db/src/transaction.test.ts` - Transaction rollback

### Integration Tests
- `apps/api/src/routes/health.test.ts` - Healthcheck

### E2E Tests
- `apps/api/src/e2e/health.e2e.ts` - Full API health

---

## Acceptance Criteria Mapping

- [ ] AC1: Monorepo structure → `apps/*`, `packages/*`, `pnpm-workspace.yaml`
- [ ] AC2: Build output → Each package has build script
- [ ] AC3: TypeScript strict → `tsconfig.base.json` with strict: true
- [ ] AC4: Docker Compose → `docker-compose.yml` with PostgreSQL + Redis
- [ ] AC5: Prisma migration → `packages/db/prisma/migrations/`
- [ ] AC6: Seed idempotent → `packages/db/seed.ts` with upserts
- [ ] AC7: Unique constraints → Schema constraints in `schema.prisma`
- [ ] AC8: CI pipeline → Root scripts for typecheck, lint, test
- [ ] AC9: Healthcheck → `apps/api/src/routes/health.ts`

---

## Risks & Considerations

- Risk 1: Colyseus version compatibility → Use latest stable
- Risk 2: Prisma migration conflicts → Generate fresh migration
- Risk 3: pnpm availability → Fallback to npm workspaces if needed
