# Step 02: Plan

**Task:** Implementer la Feature 01 : Acquisition, landing et catalogue public des sessions
**Started:** 2026-07-07T21:43:52Z

---

## Implementation Plan: Feature 01 - Acquisition, landing et catalogue public

### Overview
Build public-facing pages (landing, catalogue, session detail) and API endpoints for session discovery. Adapt to existing schema: `isPublic` boolean instead of visibility enum, `code` instead of slug.

### Prerequisites
- [x] Sprint 0 complete (monorepo, Prisma, Docker, shared packages)
- [x] GameSession and SessionRegistration models exist
- [x] Seed with test sessions

---

### File Changes

#### 1. `packages/shared/src/types/index.ts` (MODIFY)
- Add `PublicSession` interface: `{ code, name, description, entryFee, maxPlayers, prizePool, startTime, endTime, status, isPublic }`
- Add `PublicSessionDetail` extends PublicSession with `placesRemaining, registrationCount`
- Add `ShareLink` type if needed

#### 2. `packages/db/prisma/seed.ts` (MODIFY)
- Add 3rd session: UNLISTED-like (isPublic=false but with a known code for direct link testing)
- Add registrations to test capacity calculation (mix of PENDING, CONFIRMED, CANCELLED)
- Keep existing sessions, enhance with more test data

#### 3. `apps/api/src/routes/public/sessions.ts` (NEW)
- `GET /v1/public/sessions` — list PUBLIC sessions
- Query: `findMany({ where: { isPublic: true, status: { in: ['PUBLISHED', 'ACTIVE'] } } })`
- For each session: count active registrations, compute `placesRemaining`
- Pagination: `skip`, `take` from query params
- Return: `{ data: PublicSession[], meta: { total, page, limit, totalPages } }`

#### 4. `apps/api/src/routes/public/session-detail.ts` (NEW)
- `GET /v1/public/sessions/:code` — session detail
- If `isPublic = true`: return full detail
- If `isPublic = false`: return 404 (PRIVATE — no leak)
- Compute `placesRemaining` server-side
- Include: name, description, entryFee, maxPlayers, prizePool, startTime, endTime, status, placesRemaining

#### 5. `apps/api/src/routes/share.ts` (NEW)
- `GET /v1/share/:token` — redirect to session detail
- Token = session code (simplified for V1)
- If valid session: redirect 302 to `/session/:code`
- If invalid: 404
- Log event: `share.link-opened`

#### 6. `apps/api/src/index.ts` (MODIFY)
- Mount new routes: public sessions, session detail, share
- Route prefixes: `/v1/public/*`, `/v1/share/*`

#### 7. `apps/web/src/app/layout.tsx` (MODIFY)
- Update metadata defaults (title, description)
- Keep existing font setup

#### 8. `apps/web/src/app/page.tsx` (REPLACE)
- Landing page with:
  - Hero section: competition structuree, adresse, strategie, social
  - Features section: how it works
  - CTA button → /catalogue
  - Footer
- Safe wording: no pari, mise, jackpot, gain garanti
- Metadata: title, description, openGraph

#### 9. `apps/web/src/app/catalogue/page.tsx` (NEW)
- Server Component fetching from API
- Grid of SessionCard components
- Pagination controls
- Metadata: title, description

#### 10. `apps/web/src/components/SessionCard.tsx` (NEW)
- Display: name, date, entryFee, placesRemaining, status
- Link to `/session/:code`
- CTA button

#### 11. `apps/web/src/app/session/[code]/page.tsx` (NEW)
- Server Component with dynamic params
- Fetch session detail from API
- Display: full details, places remaining, rules, warnings
- CTA: conditional on auth state (placeholder for Feature 02)
- generateMetadata for SEO

#### 12. `apps/web/src/components/CTAButton.tsx` (NEW)
- Reusable CTA button
- Props: variant (primary/secondary), label, href, onClick
- Styled with Tailwind

#### 13. Tests — `apps/api/src/routes/__tests__/public-sessions.test.ts` (NEW)
- GET /v1/public/sessions returns only isPublic=true
- Pagination works
- Empty catalogue returns empty array

#### 14. Tests — `apps/api/src/routes/__tests__/public-session-detail.test.ts` (NEW)
- GET /v1/public/sessions/:code returns detail for PUBLIC
- GET /v1/public/sessions/:code returns 404 for PRIVATE
- placesRemaining computed correctly

#### 15. Tests — `apps/api/src/routes/__tests__/share.test.ts` (NEW)
- Valid token redirects 302
- Invalid token returns 404

#### 16. Tests — `apps/web/src/__tests__/landing.test.tsx` (NEW)
- Landing renders without forbidden wording
- Metadata present

#### 17. Tests — `apps/web/src/__tests__/catalogue.test.tsx` (NEW)
- Catalogue renders session cards
- Empty state handled

---

### Acceptance Criteria Mapping
- [x] AC1: Landing page — `page.tsx` (landing) + wording tests
- [x] AC2: Catalogue API — `public/sessions.ts` + integration tests
- [x] AC3: Session detail API — `public/session-detail.ts` + integration tests
- [x] AC4: placesRemaining — computed in both API routes + unit tests
- [x] AC5: Private not exposed — WHERE filter in catalogue + 404 in detail
- [x] AC6: Share links — `share.ts` + redirect tests
- [x] AC7: CTA buttons — `CTAButton.tsx` + landing/catalogue pages
- [x] AC8: SEO metadata — generateMetadata + static metadata
- [x] AC9: Tests pass — all new test files
- [x] AC10: No forbidden wording — landing test + manual review

### Risks & Considerations
- Schema uses `isPublic` boolean — no UNLISTED concept in V1 (document as future enhancement)
- Auth integration deferred to Feature 02 — CTA shows "register" by default
- Share link uses session code as token — simple but functional for V1
