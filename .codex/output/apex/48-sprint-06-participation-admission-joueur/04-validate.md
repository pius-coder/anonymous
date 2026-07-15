# Step 04: Validate

**Task:** Sprint 6 - Participation et admission joueur
**Started:** 2026-07-14T17:09:41Z

---

## Validation Results

**Typecheck:** ✅ 12/12 tasks passing (game-engine, db, api, web, contracts, worker, game-server)

**Lint:** ✅ 12/12 tasks passing

**Tests:** ✅ 12/12 tasks passing

| Package | Tests | Status |
|---------|-------|--------|
| game-engine | 96 (6 files) | ✅ |
| db | 12 (3 files) | ✅ |
| api | 19 (3 files) | ✅ |

## Acceptance Criteria Verification

- [x] AC1: `RegisterForParty` creates participation with capacity check → `participation.use-case.ts:registerForParty` calls `canRegister()` domain function, checks `maxPlayers` vs `countByPartyId`
- [x] AC2: Duplicate registration returns idempotent success → Existing participation by `(partyId, userId)` returns existing; `idempotencyKey` uniqueness check at DB level
- [x] AC3: `CancelParticipation` transitions to cancelled → `cancelMyParticipation` in use-case calls `participationRepository.cancelParticipation()` with status `ABANDONED`
- [x] AC4: `GetMyParticipation` returns current user's participation → `GET /parties/:code/my-participation` with auth middleware
- [x] AC5: `ListPartyParticipations` (admin) returns all participations → `GET /parties/:id/participations` with `requireRole("ADMIN")`. Includes user name/email
- [x] AC6: Participation required for live entry → Domain guarantees via `@@unique([partyId, userId])` constraint; API uses same constraint for idempotency checks
- [x] AC7: Expiration of pending participation → `expiresAt` field on Prisma model; set to `party.scheduledAt` or 24h default in use-case
- [x] AC8: Payment status distinct from participation status → `ParticipationStatus.Paid(3)` is separate from `Registered(2)`, `Present(4)`, etc.
- [x] AC9: Stable error codes → `PARTY_FULL`, `PARTY_NOT_FOUND`, `PARTICIPATION_NOT_FOUND`, `PARTICIPATION_CANNOT_CANCEL`, `PARTY_NOT_REGISTRABLE` — all consistent with Protobuf conventions

## Patterns Verification

- [x] Domain is pure: no framework transports, no DB access in domain
- [x] Repository pattern: DB layer encapsulates Prisma
- [x] API uses use-case pattern: routes delegate to use cases
- [x] Error handling: typed error classes mapped in route handlers
- [x] State machine: `cancelParticipation` follows existing transition pattern
- [x] Tests: pure domain factories, state assertions, `.toThrow(InvalidTransitionError)`
