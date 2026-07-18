# Validate — SEQ-01

| Check | Result |
|-------|--------|
| buf lint | PASS |
| buf generate | PASS |
| buf breaking (vs HEAD) | PASS |
| contracts vitest (79) | PASS |
| typecheck monorepo | PASS |
| lint monorepo | PASS |
| build monorepo | PASS |
| docs:check | PASS |
| git diff --check | PASS |
| New endpoints | None (ownership respected) |

## AC
- [x] Matrix transport/audience documented (12 services / 57 methods freeze; historical 11/50 noted)
- [x] REST exceptions dated with retirement conditions
- [x] Auth reset, snapshots, scoring, notifications, compliance, minigame contracts
- [x] Stable errors, UNSPECIFIED=0, audience no-leak helpers/tests
- [x] Deterministic generation + public exports API
