# Step 02: Plan

**Task:** Sprint 6 - Participation et admission joueur
**Started:** 2026-07-14T17:09:41Z

---

## Implementation Plan

### Overview

Add domain-level `RegisterForParty`/`CancelParticipation` commands with capacity checks and idempotency, wire them through Prisma persistence into Hono API routes, and expose player+admin participation queries.

### Prerequisites

- Protobuf contracts exist in `packages/contracts/proto/participation/v1/` (not yet generated — out of scope for this sprint)
- Auth middleware (`requireAuth`, `requireRole`) exists and is tested

---

### File Changes

#### Domain Layer (`packages/game-engine/`)

##### `src/types/participation.ts`
- Add `canRegister(game: Game, currentCount: number)` — returns `{ allowed: boolean; reason?: string }`
  - Checks `maxPlayers` capacity: if currentCount >= maxPlayers → `{ allowed: false, reason: "PARTY_FULL" }`
  - Checks `minPlayers` is satisfied for start (not needed for registration, only for launch)
- Add `registerParticipant(params: CreateParticipationParams)` — creates in `Registered` status directly (player self-registration vs admin invite)

##### `src/transitions/participation.ts`
- Add `Abandoned` to `PARTICIPATION_TRANSITIONS` for Invited → [Registered, Abandoned], Registered → [Paid, Abandoned], Paid → [Present, Abandoned]
- Add `cancelParticipation(p)` — calls `transitionParticipation(p, Abandoned)` — handles pre-game cancellation (Invited/Registered/Paid → Abandoned)

##### `src/errors.ts`
- Add `CapacityExceededError` class with code `CAPACITY_EXCEEDED`, takes partyId and maxPlayers
- Add `AlreadyRegisteredError` class with code `ALREADY_REGISTERED`, takes userId and partyId

##### `src/types/index.ts`
- Export new types: `RegisterParticipationResult` or similar

##### `src/transitions/index.ts`
- Export `cancelParticipation` from participation transitions

##### `src/index.ts`
- Export new error classes (`CapacityExceededError`, `AlreadyRegisteredError`)
- Export new functions (`canRegister`, `registerParticipant`, `cancelParticipation`)

---

#### Database Layer (`packages/db/`)

##### `prisma/schema.prisma`
- Add `idempotencyKey` String? @unique to `PartyParticipation` model
- Add `expiresAt` DateTime? to `PartyParticipation` model
- Add `cancelledAt` DateTime? to `PartyParticipation` model
- Add `cancellationReason` String? to `PartyParticipation` model

##### `src/repositories/types.ts`
- Add `idempotencyKey?: string` to `CreateParticipationData`

##### `src/repositories/participation.repository.ts`
- Add `findParticipationByIdempotencyKey(key: string): Promise<PartyParticipation | null>`
- Update `CreateParticipationData` usage in `createParticipation` to pass `idempotencyKey` and `expiresAt`

##### Migration
- Run `npx prisma migrate dev --name add-participation-fields` to generate migration

---

#### API Layer (`apps/api/`)

##### `src/use-cases/party/participation.use-case.ts` (NEW)
- `ParticipationUseCaseError` class (same pattern as `PartyUseCaseError`, `UseCaseError`)
- `registerForParty(input: { code: string; idempotencyKey?: string })`:
  1. Find party by code (404 if not found, 404 if not accessible)
  2. Check user not already registered (409 if already registered + same status)
  3. Find existing by idempotencyKey → return existing if found
  4. Get current participant count
  5. Check capacity via `canRegister` (422 if full)
  6. Create participation with status `REGISTERED`
  7. Return participation detail

- `cancelParticipation(input: { code: string })`:
  1. Find party by code (404)
  2. Find participation by partyId + userId (404 if not found)
  3. Call domain `cancelParticipation()`
  4. Update DB status to `ABANDONED` with cancellation tracking
  5. Return result

- `getMyParticipation(input: { code: string })`:
  1. Find party by code (404)
  2. Find participation by partyId + userId (404 if not found)
  3. Return participation detail with user and party info

- `listPartyParticipations(input: { partyId: string })`:
  1. Find party by id (404)
  2. List all participations for party
  3. Return list with user details (name, email), status, role

##### `src/routes/party.ts`
- Add `POST /parties/:code/register`:
  - Middleware: requireAuth, zValidator("json", registerSchema), zValidator("param", codeParamSchema)
  - Schema: `{ idempotencyKey: string.optional() }`
  - Calls `registerForParty()`
  - Errors: 404 (party not found), 409 (already registered), 422 (party full)

- Add `POST /parties/:code/cancel`:
  - Middleware: requireAuth, zValidator("param", codeParamSchema)
  - Calls `cancelParticipation()`
  - Errors: 404 (participation not found)

- Add `GET /parties/:code/my-participation`:
  - Middleware: requireAuth, zValidator("param", codeParamSchema)
  - Calls `getMyParticipation()`
  - Errors: 404 (participation not found)

##### `src/routes/admin/party.ts`
- Add `GET /parties/:id/participations`:
  - Middleware: requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), zValidator("param", partyIdParamSchema)
  - Calls `listPartyParticipations()`

##### `src/routes/party.ts` — handleError
- Add `ParticipationUseCaseError` handling to the `handleError` function

##### `src/routes/admin/party.ts` — handleError
- Add `ParticipationUseCaseError` handling

---

#### Test Layer

##### `packages/game-engine/src/__tests__/participation-transitions.test.ts`
- Add `cancelParticipation` tests:
  - Invited -> Abandoned
  - Registered -> Abandoned
  - Paid -> Abandoned
  - Denied from Playing (InvalidTransitionError)
  - Denied from Completed (InvalidTransitionError)

##### `packages/game-engine/src/__tests__/participation-domain.test.ts` (NEW)
- `canRegister`: allowed when under maxPlayers
- `canRegister`: denied when at maxPlayers (reason PARTY_FULL)
- `canRegister`: allowed when maxPlayers is null (unlimited)
- `registerParticipant`: creates in Registered status
- `registerParticipant`: creates with correct gameId and userId
- `registerParticipant`: defaults role to "player"

##### `apps/api/src/__tests__/participation.test.ts` (NEW)
- Integration tests using `app.request()`:
  - Register for public party (authenticated) → 201
  - Register duplicate → 409 or 200 (idempotent)
  - Register for full party → 422
  - Cancel participation → 200
  - Cancel non-existent → 404
  - Get my participation → 200
  - Get my participation (not registered) → 404
  - List participations (admin) → 200
  - List participations (non-admin) → 403

---

### Acceptance Criteria Mapping

- [ ] AC1: `RegisterForParty` creates participation with capacity check → `participation.use-case.ts:registerForParty`, `participation.ts:canRegister`
- [ ] AC2: Duplicate registration returns idempotent success → `participation.use-case.ts:registerForParty` (checks existing + idempotencyKey)
- [ ] AC3: `CancelParticipation` transitions to cancelled → `participation.use-case.ts:cancelParticipation`, `participation.ts:cancelParticipation`
- [ ] AC4: `GetMyParticipation` returns current user's participation → `routes/party.ts:GET /my-participation`
- [ ] AC5: `ListPartyParticipations` (admin) returns all participations → `routes/admin/party.ts:GET /:id/participations`
- [ ] AC6: Participation required for live entry → domain-level check `canRegister`, enforced at DB level by `@@unique([partyId, userId])`
- [ ] AC7: Expiration of pending participation → `expiresAt` field on Prisma model
- [ ] AC8: Payment status distinct from participation status → status `Paid(3)` is separate from `Registered(2)` in ParticipationStatus enum
- [ ] AC9: Stable error codes → `CapacityExceededError(CAPACITY_EXCEEDED)`, `AlreadyRegisteredError(ALREADY_REGISTERED)`, `ParticipationUseCaseError` with proto-compatible codes

---

### Risks & Considerations

- **Dirty worktree**: Current branch has modified files from Sprint 5 — ensure no conflicts with existing `participation.repository.ts` changes
- **No protobuf generation**: Contracts exist in proto files but are not generated yet — use Zod validation as interim
- **Expiration job**: `expiresAt` tracking is added but no background worker to expire them — deferred to worker sprint
- **Cancellation from Paid**: Cancelling a paid participation should ideally trigger a refund — out of scope for this sprint
- **Idempotency key collision**: The `@unique` constraint on idempotencyKey is DB-level; we also check at the app level for better UX

---

## Step Complete

**Status:** ✓ Complete
**Files planned:** 12-15 (domain: 5, DB: 3, API: 4, tests: 3)
**Tests planned:** 3 test files (domain transitions, domain logic, API integration)
**Next:** step-03-execute.md
