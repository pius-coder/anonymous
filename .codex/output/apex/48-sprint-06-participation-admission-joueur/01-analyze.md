# Step 01: Analyze

**Task:** Sprint 6 - Participation et admission joueur - Créer/formaliser PartyParticipation avec gestion inscription, annulation, expiration, capacité, statut paiement
**Started:** 2026-07-14T17:09:41Z

---

## Context Discovery

### Documentation Gate

| Library | Version | Context7 ID | Query |
|---------|---------|-------------|-------|
| Prisma | 6.x | /prisma/web | Schema changes, migration workflow |
| Hono | ^4.6.0 | /honojs/hono | Route groups, middleware, Zod validation |

**Local docs consulted:**
- `docs/README.md` — main entry point
- `docs/00-audit/head-forensic-audit.md` — legacy `SessionRegistration` conflation
- `docs/03-architecture/target-architecture.md` — `PartyParticipation` as central pivot
- `docs/03-architecture/uml.md` — 15 mermaid diagrams, participation state machine
- `docs/04-layers/` — domain/persistence/application layer rules
- `docs/05-workflows/feature-delivery.md` — feature delivery pipeline
- `docs/06-roadmap/sprint-plan.md` — Sprint 6 detail
- `packages/contracts/proto/participation/v1/participation.proto` — protobuf contracts

### Domain Layer (`packages/game-engine/`)

**Existing:**
- `ParticipationStatus` enum (14 states), `ReadinessState`, `ConnectionState`, `ParticipationRole`, `ParticipationRights`, `GameParticipation`, `createParticipation()`, `rightsForRole()`
- `PARTICIPATION_TRANSITIONS` map with 15 named transition functions
- `DomainError` hierarchy with `ParticipationNotFoundError`, `InvalidTransitionError`

**Missing:**
- No `RegisterForParty`/`CancelParticipation` as domain commands
- No idempotency on participation commands
- No `GetMyParticipation` / `ListPartyParticipations` queries
- No capacity check (min/max) enforcement in domain

### Database Layer (`packages/db/`)

**Existing Prisma models:**
- `PartyParticipation` (partyId, userId, role, status, readinessState, connectionState)
- `Party` (minPlayers, maxPlayers fields exist)
- `RealtimeConnection` (linked 1:1 via participationId)

**Existing repositories:**
- `participation.repository.ts` — CRUD + `countByPartyId`, `findParticipation(partyId, userId)`

**Missing:**
- No idempotency key field
- No participation expiry field
- No cancellation tracking

### API Layer (`apps/api/`)

**Existing patterns:** Hono sub-routers, `requireAuth`/`requireRole` middleware, Zod validation, `handleError()` mapping, `successResponse`/`errorResponse`

**Missing routes:**
- `POST /v1/parties/:code/register` (RegisterForParty)
- `POST /v1/parties/:code/cancel` (CancelParticipation)
- `GET /v1/parties/:code/my-participation` (GetMyParticipation)
- `GET /v1/admin/parties/:id/participations` (ListPartyParticipations)

### Protobuf Contracts (`packages/contracts/proto/participation/v1/participation.proto`)
- `AttachParticipationCommand`, `ParticipationRole`, `ParticipationStatus`
- Contracts exist but not yet generated/consumed in API

### Test Patterns
- Vitest 2.1.0, `makeParticipation()` factory, status assertions, `.toThrow(InvalidTransitionError)`
- API tests: `app.request()` (Hono built-in)

---

## Inferred Acceptance Criteria

- [ ] AC1: `RegisterForParty` creates participation with capacity check
- [ ] AC2: Duplicate registration returns idempotent success
- [ ] AC3: `CancelParticipation` transitions to cancelled/abandoned
- [ ] AC4: `GetMyParticipation` returns current user's participation
- [ ] AC5: `ListPartyParticipations` (admin) returns all participations
- [ ] AC6: Participation required for live entry
- [ ] AC7: Expiration of pending participation after timeout
- [ ] AC8: Payment status distinct from participation status
- [ ] AC9: Stable error codes matching Protobuf conventions
