# Step 02: Plan

**Task:** P-A-SCORING - Preuves, publication et gains atomiques
**Started:** 2026-07-18T01:23:48Z

---

## Planning Progress

_Implementation plan will be written here..._
## Implementation Plan: P-A-SCORING - Preuves, publication et gains atomiques

### Overview
Keep public/player published reads on the existing ConnectRPC surface, and add an admin-only Hono scoring dossier route because the frozen `scoring.proto` contract does not carry evidence details, `expectedVersion`, review history, or conflict payloads. Wire the application publish flow to the existing atomic repository primitive `publishRoundScoresWithGainsAndAudit()` and layer proof validation/tie-break resolution in the scoring use-case.

### Prerequisites
- [ ] Preserve frozen proto/schema ownership: no contract or DB migration edits.
- [ ] Reuse signed rulebooks under `docs/01-product/rulebooks/` for tie-break logic.
- [ ] Keep player/observer projections published-only.

### File Changes

#### `apps/api/src/use-cases/scoring/scoring.use-case.ts`
- Replace the placeholder evidence handling in `toDomainEntry()` currently hardcoding `evidenceHash: ""` at lines 151-167.
- Add a shared proof-validation step before publication using persisted `ProvisionalScore.evidenceHash`, `ProvisionalScore.evidence`, and `ScoreEvidence` metadata.
- Add admin dossier read-model helpers for `/admin/parties/[partyId]/scores` including evidence summary/detail, stale version token, review history, publication block reason, and gain preview.
- Change `publishResults()` from `scoreRepository.publishRoundScores(...)` at lines 516-521 to the atomic gains/audit variant already available in the repository.
- Replace the fallback rank computation at lines 187-192 with rulebook-aware ranking/tie-break logic keyed from the round minigame.
- Extend player published projection to include post-publication gain/ledger concordance data if available from existing persistence.
- Emit application-level audit/metric events for missing evidence, mismatches, corrections, and publication latency.

#### `packages/db/src/repositories/score.repository.ts`
- Reuse the existing serializable/idempotent write unit at lines 258-424 instead of re-implementing atomic gains.
- Add repository helpers to load `ScoreEvidence`, `ScoreReview[]`, `PublishedScore`, and prize-ledger rows by `roundId` / `participationId`.
- Populate `PublishedScore.evidenceHash` during atomic publication.
- Expose a read model or helper outputs sufficient for application-level admin dossier and player gain concordance.
- Preserve the `Serializable` + retry/idempotent behavior already present around lines 268-420.

#### `apps/api/src/rpc/scoring-service.ts`
- Keep `getPublishedResults()` published-only behavior at lines 129-164.
- Extend error mapping for new typed scoring errors (`EVIDENCE_MISSING`, `EVIDENCE_HASH_INVALID`, `EVIDENCE_VERSION_UNKNOWN`, `EVIDENCE_MISMATCH`, stale publication conflict).
- Keep provisional read/correct/publish handlers only where the frozen contract remains sufficient; do not leak richer admin dossier fields through this transport.

#### `apps/api/src/routes/admin/scoring.ts` (NEW FILE)
- Add admin-only REST endpoints for the scoring dossier because `scoring.proto` cannot transport version/evidence/history without a forbidden contract edit.
- `GET /parties/:partyId/scores?roundId=` returns the admin verification dossier.
- `POST /parties/:partyId/scores/:roundId/corrections` accepts `playerId`, `correctedScore`, `reason`, `expectedVersion`.
- `POST /parties/:partyId/scores/:roundId/publish` performs explicit publication with evidence validation and one-shot gain credit.
- Apply RBAC for `ADMIN` / `SUPER_ADMIN` only.

#### `apps/api/src/index.ts`
- Mount the new admin scoring router next to existing admin party/payment/preparation/round routers (current mount zone lines 34-37).

#### `apps/web/src/services/admin/adminScoringClient.ts` (NEW FILE)
- Add a REST client for the admin scoring dossier and mutation endpoints.
- Model admin dossier payloads with version token, evidence metadata, review history, conflict state, and gain preview.

#### `apps/web/src/components/admin/AdminScoresPanel.tsx`
- Replace the current minimal row model (lines 26-31 and 72-80) with admin dossier data.
- Surface evidence hash/version, mismatch state, review history, stale conflict, and gain preview.
- Submit `expectedVersion` on correction.
- Invalidate admin/player/finance queries after correction or publication.
- Keep player/observer no-leak messaging already present at lines 137-145.

#### `apps/web/src/services/rpcServices.ts`
- Keep `ScoringService.published()` for player/observer result reads.
- Optionally reduce admin use of `provisional/correct/publish` if the page moves to the richer REST client.

#### `apps/web/src/components/party/PlayerResultsPanel.tsx`
- Preserve the waiting behavior before publication (lines 38-83).
- Extend the published result view with official gain/ledger concordance information if the application read model provides it.
- Ensure no provisional/evidence metadata appears in success or error states.

#### `apps/web/src/components/party/PlayerWaitingPanel.tsx`
- Keep the published-only polling model at lines 20-33.
- Improve messaging when publication is blocked by verification/evidence without exposing provisional data.

#### `apps/api/src/use-cases/payment/payment.use-case.ts`
- Preserve the prize gate at lines 255-260 and ensure scoring projections remain consistent with it.

#### `docs/03-architecture/uml/scoring-publication.md`
- Update the UML/rules to mention evidence validation gate, stale conflict handling, and atomic score publication + gains.

### Testing Strategy

#### `packages/db/src/__tests__/l3-score-publish-atomic.integration.test.ts`
- Extend the existing L3 concurrency proof to cover evidence validation preconditions and confirm one published credit path under concurrent publish attempts.

#### `apps/api/src/use-cases/scoring/__tests__/scoring.use-case.test.ts`
- Add cases for missing evidence, empty hash, unknown runtime version, mismatch, stale correction conflict, rulebook tie-break ordering, and gain/ledger concordance after publish.

#### `apps/api/src/rpc/__tests__/scoring-service.test.ts`
- Add transport assertions for new public error mapping and confirm player/observer responses never expose provisional/evidence/review internals.

#### `apps/api/src/routes/__tests__/admin-scoring-rbac.l4.test.ts` (NEW FILE)
- L4 Hono transport tests for admin dossier RBAC, correction with stale version, publication blocked by invalid evidence, and no-leak outside admin roles.

#### `apps/web/e2e/scoring-publication.spec.ts` (NEW FILE, if harness is viable)
- L5 browser flow: admin correction + publication, then player results and wallet/ledger reflect exactly one published gain.

### Acceptance Criteria Mapping
- [ ] Evidence absent/hash empty/version unknown/mismatch blocks publication: `scoring.use-case.ts`, `score.repository.ts`, `admin/scoring.ts`, scoring use-case tests, L4 admin route tests, L3 integration.
- [ ] Two concurrent publications credit only once: `score.repository.ts`, `scoring.use-case.ts`, `l3-score-publish-atomic.integration.test.ts`.
- [ ] No API/UI leak of provisional data: `scoring-service.ts`, `admin/scoring.ts`, `PlayerWaitingPanel.tsx`, `PlayerResultsPanel.tsx`, RPC/L4/E2E tests.
- [ ] Correction preserves old/new/reason/author/version and invalidates stale views: `scoring.use-case.ts`, `score.repository.ts`, `adminScoringClient.ts`, `AdminScoresPanel.tsx`.
- [ ] Visible gains match published ledger exactly: `scoring.use-case.ts`, `score.repository.ts`, `PlayerResultsPanel.tsx`, L3 integration, optional L5 E2E.

### Risks & Considerations
- The frozen `scoring.proto` contract is too thin for the admin dossier; the plan intentionally scopes the richer admin surface to Hono REST while retaining ConnectRPC for the already-contracted public/player reads.
- Tie-break behavior must come from signed rulebooks, not ad-hoc score sorting.
- No schema/proto changes are allowed in this lot.

---
## Step Complete
**Status:** ✓ Complete
**Files planned:** 12-15
**Tests planned:** 4-5
**Next:** step-03-execute.md
