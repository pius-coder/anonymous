# Step 01: Analyze

**Task:** P-A-SCORING - Preuves, publication et gains atomiques
**Started:** 2026-07-18T01:23:48Z

---

## Context Discovery

_Findings will be appended here as exploration progresses..._
## Codebase Context

### Session / worktree
- Worktree: `/home/afreeserv/worktrees/anonymous/p-a-scoring`
- Branch: `apex/p-a-scoring`
- Base commit: `ea703ab`
- Main checkout `/home/afreeserv/anonymous` left untouched on `v0.1`

### Docs and production task constraints read
- `docs/06-roadmap/apex-tasks/production/wave-a/P-A-SCORING-evidence-gains.md`: mission requires runtime evidence validation, provisional review/correction, explicit publication, atomic gains, no provisional leak, and concurrency-safe publication.
- `docs/03-architecture/uml/scoring-publication.md`: player transitions to waiting state; admin corrects with reason; publication creates official projection; gains happen only after valid publication.
- `docs/01-product/scoring-and-publication.md`: provisional computed server-side; admin verification mandatory; player sees results only after publication.
- `docs/01-product/session-lifecycle.md`: canonical transition is `ROUND_VERIFICATION -> RESULTS_PUBLISHED` only through `publish_results`.
- `docs/06-roadmap/sprints/13-scoring-verification-publication.md`: production scope still expects correction audit, observer no-leak, and post-publication finance gate.
- `docs/05-workflows/test-strategy.md`: this lot must prove L1/L3/L4/L5 with explicit no-leak, idempotence, RBAC, and concurrency.

### Context7 used
- Prisma ID: `/prisma/prisma/6.19.2`
  - Recommended concurrency pattern is `Serializable` transactions plus explicit retry on `P2034` write conflicts.
- Connect ES ID: `/connectrpc/connect-es`
  - Relevant patterns confirmed: `router.service(...)` registration and `createRouterTransport(...)` for transport-level tests.

### Existing contracts
- `packages/contracts/proto/minigame/v1/manifest.proto:135-149`
  - `MiniGameScoreEvidence` currently contains only `round_id`, `player_id`, `raw_score`, `evidence_hash`, `computed_at_ms`, `minigame_version`, and typed game-specific oneofs.
  - No common refs for inputs/config/seed retention, no review payload, no publication/gain linkage.
- `packages/contracts/proto/scoring/v1/scoring.proto:5-89`
  - `ScoringService` only exposes `CorrectProvisionalScore`, `PublishResults`, `ListProvisionalScores`, `GetPublishedResults`.
  - `ListProvisionalScoresResponse` returns only `PlayerScore[]`, aggregate status, and audience.
  - No evidence detail, correction history, publish version, gains, or conflict payload in the contract.

### Existing scoring use-case behavior
- `apps/api/src/use-cases/scoring/scoring.use-case.ts:30-53`
  - Provisional admin view already models `version`, `evidenceSummary`, `reviewedBy`, `reviewedAt`.
- `apps/api/src/use-cases/scoring/scoring.use-case.ts:151-167`
  - Domain conversion hardcodes `evidenceHash: ""` and `publishedAt: null` into the domain entry.
- `apps/api/src/use-cases/scoring/scoring.use-case.ts:187-192`
  - Ranking currently sorts by descending score, then `participationId`; no rulebook/tie-break abstraction.
- `apps/api/src/use-cases/scoring/scoring.use-case.ts:197-240`
  - Admin provisional listing already exists and is separated from player/observer projections.
- `apps/api/src/use-cases/scoring/scoring.use-case.ts:246-309`
  - Player/observer/admin published query returns waiting state with empty scores until a published projection exists.
- `apps/api/src/use-cases/scoring/scoring.use-case.ts:312-445`
  - Correction path already requires reason, checks optimistic `expectedVersion`, writes review + audit, and maps version conflicts.
- `apps/api/src/use-cases/scoring/scoring.use-case.ts:447-550`
  - Publish path validates round/party, rejects unverified or voided scores, computes ranks, then calls `scoreRepository.publishRoundScores(...)`.
  - It updates round/party status and audit logs, but does not validate runtime evidence presence/hash/version and does not post gains.
  - Idempotence is handled only through re-reading existing published rows.

### Existing RPC transport behavior
- `apps/api/src/rpc/scoring-service.ts:72-169`
  - Admin-only provisional listing and correction/publication RBAC exist.
  - `getPublishedResults` intentionally returns empty `finalScores` before publication and never calls provisional listing from player path.
  - Transport currently exposes no evidence/history/gains payloads.
- `apps/api/src/rpc/__tests__/scoring-service.test.ts:53-198`
  - L4 tests already cover RBAC and player no-leak for provisional data.

### Existing repository and DB capabilities
- `packages/db/prisma/schema.prisma:445-528`
  - Schema already has `ProvisionalScore`, `PublishedScore`, `ScoreReview`, and encrypted `ScoreEvidence` tables.
  - `ProvisionalScore` stores `evidenceHash`, redacted `evidence`, review info, and links to `ScoreEvidence`.
  - `PublishedScore` stores `evidenceHash` but current use-case/repository path does not populate it.
- `packages/db/src/repositories/score.repository.ts:87-153`
  - `publishRoundScores(...)` uses `Serializable` isolation and falls back to existing published rows on `P2002` / `P2034`.
- `packages/db/src/repositories/score.repository.ts:195-239`
  - Review write unit already enforces version conflict and blocks correction after publish.
- `packages/db/src/repositories/score.repository.ts:242-424`
  - `publishRoundScoresWithGainsAndAudit(...)` already exists.
  - It atomically creates published scores, updates provisional rows, credits prize ledger entries with idempotency key `prize:{roundId}:{participationId}`, and writes audit inside a `Serializable` transaction.
  - It retries serialization/uniqueness conflicts up to 12 attempts.
- `packages/db/src/__tests__/l3-score-publish-atomic.integration.test.ts:39-123`
  - An L3 integration test already proves concurrent publish with gains/audit creates one published row, one prize transaction, and one wallet credit.

### Existing payment/finance gates
- `apps/api/src/use-cases/payment/payment.use-case.ts:255-260`
  - Prize credits are explicitly forbidden before publication via `assertPrizeCreditAllowed()`.
- `apps/api/src/use-cases/payment/finance.use-case.ts:539-567`
  - Finance payout command also blocks when `scoresPublished=false`.

### Existing web surfaces
- `apps/web/src/app/admin/parties/[partyId]/scores/page.tsx:16-26`
  - Admin scores page already exists at `/admin/parties/[partyId]/scores`.
- `apps/web/src/components/admin/AdminScoresPanel.tsx:48-133`
  - Admin UI already queries provisional and published projections, performs corrections, publishes, and invalidates admin/player caches.
- `apps/web/src/components/admin/AdminScoresPanel.tsx:202-314`
  - Current admin table only shows `playerId`, `score`, `rank`, aggregate status, correction form, and publish action.
  - No detailed evidence, no correction history, no conflict state display, no gain preview, no mismatch metrics.
- `apps/web/src/components/party/PlayerWaitingPanel.tsx:16-85`
  - Player waiting view explicitly avoids requesting provisional data and only polls published results.
- `apps/web/src/components/party/PlayerResultsPanel.tsx:20-83`
  - Player results panel shows waiting state until `publishedAt` + `finalScores` exist.
- `apps/web/src/components/observer/ObserverResults.tsx:33-78`
  - Observer surface is written around published/not-published states only.
- `apps/web/src/services/rpcServices.ts:180-205`
  - Web scoring client only wraps provisional list, correct, publish, and published results calls.

### Existing tests around scoring flow
- `apps/api/src/use-cases/scoring/__tests__/scoring.use-case.test.ts:117-321`
  - L1/L2 tests already cover provisional admin list, correction reason/version conflict, no-leak published query, publish rejection for unverified scores, and idempotent second publication.
- `apps/api/src/use-cases/scoring/__tests__/scoring.l5-flow.test.ts:68-150`
  - Existing flow test proves admin correct/publish, then player sees official results only after publication.

### Legacy references read
- `docs/00-audit/head-forensic-audit.md:446-449`
  - Legacy architecture explicitly identified scoring publication and payments/wallet as separate domains with premature diffusion risk.
- `docs/00-audit/head-forensic-audit.md:468-483`
  - Legacy event set included `ProvisionalScoreReady` and `ResultsPublished`; command center and scoring/publication remained distinct concerns.
- `17c0c8ef6850f0dcce05df1572ea55d0941bf2a2:apps/api/src/results/results.ts:72-117`
  - Legacy result finalization computed ranking and winner splits in one module.
- `17c0c8ef6850f0dcce05df1572ea55d0941bf2a2:apps/api/src/results/results.ts:200-260`
  - Legacy finalize flow coupled session finalization, score aggregation, and prize distribution in one transaction-heavy path.
- `17c0c8ef6850f0dcce05df1572ea55d0941bf2a2:apps/api/src/routes/admin/results.ts:50-97`
  - Legacy admin finalize endpoint immediately scheduled credits distribution after finalization, confirming the coupling this lot must avoid/restructure.

### What clearly exists vs missing for this lot
#### Already present
- dedicated scoring use-case and RPC transport
- admin-only provisional listing
- player/observer no-leak published projection
- audited correction with optimistic version check
- serializable repository publish + serializable repository publish-with-gains implementation
- L3/L4/L5 test coverage seeds around scoring publication

#### Missing or not yet wired in current application path
- runtime evidence validation before publication (`missing hash`, `unknown version`, `mismatch`, retention refs)
- use-case wiring from scoring publication to `publishRoundScoresWithGainsAndAudit(...)`
- published projection / admin review payloads for evidence detail, correction history, conflict metadata, gains visibility, and audit-facing publish versions
- deterministic ranking/tie-break sourced from rulebooks instead of score-desc + participationId fallback
- metrics for mismatch/review/publication delay
- stale-view invalidation semantics beyond React Query cache invalidation
- explicit finance/player result concordance checks against the published ledger payload

