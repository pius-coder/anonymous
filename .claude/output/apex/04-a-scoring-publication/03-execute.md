# Execute — A-SCORING

## Implemented

### Application
- `apps/api/src/use-cases/scoring/scoring.use-case.ts`
  - `listProvisionalScores` (admin)
  - `correctProvisionalScore` (reason, actor, version/conflict, audit)
  - `publishResults` (idempotent, ranks, party/round transition)
  - `getPublishedResults` (player/observer/admin; waiting without provisional leak)

### Transport
- `apps/api/src/rpc/scoring-service.ts` — ScoringService handlers + RBAC
- **Not registered** in `routes.ts` (SEQ-03 mount)

### Persistence consumption
- Extended `score.repository.ts`: `publishRoundScores`, rank on publish, optimistic `expectedUpdatedAt`

### UI
- Admin: `AdminScoresPanel`, scores page
- Player: `PlayerWaitingPanel`, `PlayerResultsPanel`, waiting/results pages
- `SensitiveActionPanel` optional `onConfirm`

### Tests
- L1: game-engine score-transitions (existing)
- L3: concurrent correction/publication in db integration
- L4: scoring-service RBAC/no-leak
- L5: scoring.l5-flow.test.ts
- Unit: scoring.use-case.test.ts

### Docs
- `docs/06-roadmap/apex-tasks/wave-a/A-SCORING-ac-matrix.md`
