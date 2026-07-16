# Validate — A-SCORING

## Base
- Worktree: `/home/afreeserv/worktrees/anonymous/a-scoring`
- Branch: `apex/a-scoring`
- Base commit: `43a424b`
- Output commit: `2195fb6`

## Checks
| Check | Result |
|---|---|
| typecheck api/db/web | pass |
| lint api/db/web | pass |
| game-engine tests (L1) | 138 pass |
| api tests (L4/L5 + units) | 72 pass |
| db tests (L3 concurrent) | 38 pass |
| web tests | 15 pass |
| git diff --check | pass (no staged whitespace errors on commit) |
| central router mount | deferred SEQ-03 (ownership) |

## AC matrix
See `docs/06-roadmap/apex-tasks/wave-a/A-SCORING-ac-matrix.md`

## Context7
- ConnectRPC: `/connectrpc/connect-es`
- TanStack Query: `@tanstack/react-query` (existing Providers + useQuery/useMutation patterns)
- Prisma: transactions + Serializable isolation for publishRoundScores
