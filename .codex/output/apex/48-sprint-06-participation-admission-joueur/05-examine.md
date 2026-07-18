# Step 05: Examine (Adversarial Review)

**Task:** Sprint 6 - Participation et admission joueur
**Started:** 2026-07-14T17:09:41Z

---

## Files Reviewed

| Layer | Files |
|-------|-------|
| Domain | `errors.ts`, `types/participation.ts`, `transitions/participation.ts`, `types/index.ts`, `transitions/index.ts`, `index.ts` |
| DB | `prisma/schema.prisma`, `src/repositories/types.ts`, `src/repositories/participation.repository.ts` |
| API | `src/use-cases/party/participation.use-case.ts` (NEW), `src/routes/party.ts`, `src/routes/admin/party.ts` |
| Tests | `src/__tests__/participation-transitions.test.ts`, `src/__tests__/participation-domain.test.ts` (NEW) |

## Security Checklist

- [x] No SQL injection — all Prisma parameterized queries
- [x] No XSS — API-only changes (no templating)
- [x] No secrets in code
- [x] Input validation — Zod schemas on all new routes
- [x] Auth checks — `requireAuth` on player routes, `requireAuth + requireRole("ADMIN")` on admin route
- [x] Idempotency — `@@unique([partyId, userId])` constraint + `idempotencyKey` unique constraint

## Logic Checklist

- [x] Capacity check: `canRegister` compares count vs maxPlayers
- [x] Idempotency: returns existing participation on re-registration attempt
- [x] Visibility gate: only public parties are registrable
- [x] Status gate: only DRAFT/SCHEDULED/PREPARATION_OPEN parties accept registrations
- [x] Cancellation gate: only INVITED/REGISTERED/PAID can be cancelled
- [x] Error handling: all failure modes return typed errors (404/409/422)

## Quality Checklist

- [x] Follows existing patterns (Hono sub-routers, use-case, repository)
- [x] No code duplication beyond established patterns
- [x] Clear naming consistent with codebase conventions
- [x] Type safety (TypeScript strict)

---

## Findings

| ID | Severity | Category | Location | Issue | Validity |
|----|----------|----------|----------|-------|----------|
| F1 | MEDIUM | Architecture | `participation.use-case.ts:cancelMyParticipation` | Bypasses domain transition validation: checks status via ad-hoc array instead of calling domain `cancelParticipation()`. Existing pattern (`publishParty` → `schedule(domainGame)`) validates via domain first. | Real |
| F2 | LOW | Missing | `participation.use-case.ts` | No `ParticipationStatusChanged` event emission. Domain events (`events.ts`) define event types but aren't wired into the use-case flow. | Real |
| F3 | LOW | Missing | All routes | No rate limiting on register endpoint. Consistent with existing pattern (login has rate limiting, register doesn't). Not actionable without decision. | Noise |

**Summary:** 3 findings (0 CRITICAL, 1 MEDIUM, 2 LOW)
