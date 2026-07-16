# AC → test matrix — SEQ-03 WAVE-A

| AC | Criterion | Proof |
|----|-----------|-------|
| AC1 | Mount Session/Participation/Preparation/Payment/Scoring | `apps/api/src/rpc/routes.ts` + `routes.composition.test.ts` |
| AC2 | Remeasure 12/57 + gaps | `docs/00-audit/v0.1-rpc-mount-matrix.md` |
| AC3 | typecheck/lint/build | `pnpm typecheck`, `pnpm lint`, `pnpm --filter @session-jeu/api build` |
| AC4 | Domain unit + L4 | `pnpm --filter @session-jeu/api test` |
| AC5 | Integration empty DB + smokes | `pnpm test:integration` |
| AC6 | L5 multi-service room live | `pnpm test:e2e` / `live-smoke.spec.ts` |
| AC7 | A-WORKERS ownership PASS | PR #25 file list review (worker/gateway/lockfile only) |
| AC8 | AC→test matrix | this file + mount matrix doc |
| AC9 | PR opened | `gh pr create` from `integration/v0.1-completion` |
| AC10 | No contracts/schema ownership breach | `git diff` review |
