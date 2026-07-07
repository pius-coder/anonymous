# Step 01: Analyze

**Task:** Implementer la Feature 01 : Acquisition, landing et catalogue public des sessions
**Started:** 2026-07-07T21:43:52Z

---

## Context7 Documentation Gate

### Next.js (v16.2.9, ID: /vercel/next.js/v16.2.9)
- **params** is a `Promise<{ slug: string }>` — must `await params` in Server Components
- **generateMetadata** accepts `{ params, searchParams }` where params is Promise
- Server Components are `async` by default, can fetch data directly
- No client-side data fetching needed for public pages

### Hono (ID: /websites/hono_dev)
- **zValidator('query', schema)** for query param validation
- **c.json({ ... }, statusCode)** for structured JSON responses
- **cors()** middleware applied before routes
- Route pattern: `app.get('/path', zValidator(...), handler)`

### Prisma (ID: /prisma/web)
- **_count: { select: { relation: true } }** for counting relations in findMany
- **take/skip** for pagination, **orderBy** for sorting
- **where: { field: { in: [...] } }** for enum filtering
- **include** for eager-loading relations

---

## Codebase Analysis

### Existing Schema vs PRD Requirements

| PRD Requirement | Current Schema | Gap |
|---|---|---|
| `visibility` enum (PUBLIC/UNLISTED/PRIVATE) | `isPublic: Boolean` | Simplified — no UNLISTED concept |
| `GameSessionStatus` with REGISTRATION_OPEN etc. | DRAFT, PUBLISHED, ACTIVE, COMPLETED, CANCELLED | Simplified statuses |
| `SessionRegistrationStatus` with PAYMENT_PENDING, PAID etc. | PENDING, CONFIRMED, CANCELLED, WAITLISTED | Different status names |
| `slug` field on GameSession | `code: String @unique` | Different field name |
| `entryFeeXaf` | `entryFee: Int` | Field name differs |
| `minPlayers` | Not present | Missing from schema |
| `prizePoolBps` | `prizePool: Int` | Different type (absolute vs bps) |

### Key Adaptation Decisions
1. Use `code` as the public identifier (slug equivalent)
2. `isPublic = true` → PUBLIC; `isPublic = false` → PRIVATE (UNLISTED not in V1 schema)
3. `placesRemaining = max(0, maxPlayers - count(active registrations))`
4. Active registrations = status IN (PENDING, CONFIRMED) — exclude CANCELLED/WAITLISTED
5. Visible session statuses: PUBLISHED, ACTIVE (catalogue), COMPLETED (closed)

### Files That Need Creation/Modification

| Area | Files | Status |
|---|---|---|
| API routes | `apps/api/src/routes/public/sessions.ts` | NEW |
| API routes | `apps/api/src/routes/public/session-detail.ts` | NEW |
| API routes | `apps/api/src/routes/share.ts` | NEW |
| API index | `apps/api/src/index.ts` | MODIFY — mount new routes |
| Web pages | `apps/web/src/app/page.tsx` | REPLACE — landing page |
| Web pages | `apps/web/src/app/catalogue/page.tsx` | NEW |
| Web pages | `apps/web/src/app/session/[code]/page.tsx` | NEW |
| Web components | `apps/web/src/components/SessionCard.tsx` | NEW |
| Web components | `apps/web/src/components/CTAButton.tsx` | NEW |
| Seed | `packages/db/prisma/seed.ts` | MODIFY — add UNLISTED-like + PRIVATE sessions |
| Tests | Multiple test files | NEW |
| Shared types | `packages/shared/src/types/index.ts` | MODIFY — add public session types |

### Patterns Observed
- Hono API uses `src/routes/` with individual route files
- Middleware in `src/middleware/` — secureHeaders, bodyLimit, requestId
- Tests use Vitest with `__tests__/` directories
- Shared types/errors/events in `packages/shared/src/`
- Seed script creates test data via Prisma

### Existing Test Patterns
- API tests: create app, inject requests, assert responses
- Vitest with `describe/it/expect`
- No test utilities or factories yet

---

## Inferred Acceptance Criteria

- [ ] AC1: Landing page renders with safe wording (no pari/mise/jackpot/gain garanti)
- [ ] AC2: GET /v1/public/sessions returns only isPublic=true sessions
- [ ] AC3: GET /v1/public/sessions/:code returns session detail with placesRemaining
- [ ] AC4: placesRemaining = max(0, maxPlayers - activeRegistrationsCount) computed server-side
- [ ] AC5: Private sessions (isPublic=false) not exposed in catalogue
- [ ] AC6: Share link /share/:token redirects to session detail
- [ ] AC7: CTA buttons present on landing and session pages
- [ ] AC8: SEO metadata present on all public pages
- [ ] AC9: All tests pass (unit + integration)
- [ ] AC10: No forbidden wording in any public text
