# Step 01: Analyze

**Task:** SEQ-01 - Figer contrats et transports: baseline Protobuf/Buf/ConnectRPC, matrice 11 services/50 methodes, exceptions REST, generation deterministe, golden fixtures
**Started:** 2026-07-16T12:34:58Z

---

## Context Discovery

_Findings will be appended here as exploration progresses..._

## Codebase Context (SEQ-01 Analyze)

### Related Files Found
| File | Contains |
|------|----------|
| `packages/contracts/proto/**/*.proto` | 13 protos, 11 services, 50 RPCs |
| `packages/contracts/buf.yaml` | lint STANDARD, breaking FILE |
| `packages/contracts/buf.gen.yaml` | protoc-gen-es → src/gen |
| `packages/contracts/src/index.ts` | Public API re-exports (no exports map) |
| `packages/contracts/src/__tests__/*` | golden, conventions, audience |
| `packages/contracts/fixtures/**` | 7 golden JSON domains |
| `docs/06-roadmap/apex-tasks/sequential/SEQ-01-contracts-transport-freeze.md` | Task spec |
| `docs/03-architecture/protobuf-contract-strategy.md` | Connect vs Colyseus, REST exception policy |
| `docs/00-audit/v0.1-gap-analysis.md` | 11/50, REST exceptions not inventoried |
| `apps/api/src/rpc/routes.ts` | 3/11 Connect services registered |
| `apps/api/src/routes/**` | REST dual-stack for sprints 04–10 |

### Patterns Observed
- Protobuf-ES v2 via `protoc-gen-es` only (no protoc-gen-connect-es)
- Connect ES v2 consumes GenService descriptors from generated `*_pb.ts`
- Live: Colyseus WS messages (JoinLive, ReconnectLive, room:move) not Connect RPCs
- REST dominant transport with partial Connect (Identity, Round, RealtimeAccess)
- Enums use `*_UNSPECIFIED = 0`; no `reserved` fields yet
- ARCHITECTURE.md still claims generation deferred (stale)

### Verified service matrix (current code)
Identity 8, Session 4, Participation 3, Preparation 5, RealtimeAccess 4, Round 10, MiniGame 2, Scoring 4, Admin 3, Notification 3, Payment 4 = **50 methods / 11 services**

### Gaps vs SEQ-01 deliverables
1. No transport×audience freeze matrix document
2. No dated REST exceptions registry
3. Missing error codes: SCORE_NOT_VERIFIED, PUBLICATION_FORBIDDEN, AUDIT_REASON_REQUIRED, WAIVER_FORBIDDEN, RECONNECT_EXPIRED, DELIVERY_FAILED, PROVIDER_UNAVAILABLE
4. Minigame: missing MiniGameCommand/PublicState/PrivateState/ServerEvent/ScoreEvidence messages (sprint 14)
5. Notification: sprint 17 names (CreateNotificationJob, AcknowledgeNotification, NotificationDeliveryUpdated) not fully mirrored
6. Compliance: sprint 18 RPCs have zero protos
7. No buf lint/breaking scripts; no package exports map
8. Audience tests weak (string scan only); missing identity/payment/minigame fixtures
9. No reserved field examples

### Prerequisites SEQ-00
- `test:integration` / `test:e2e` exist at root
- L3/L4 smokes under `tests/integration/`
- L5 live-smoke Playwright present
- L0 = docs/contracts/generation (no single script)

### Context7 library IDs
- Buf: `/bufbuild/buf`, `/websites/buf_build`
- ConnectRPC: `/connectrpc/connect-es`
- Colyseus: `/websites/colyseus_io`, `/colyseus/docs`

## Inferred Acceptance Criteria
- [ ] AC1: Matrix doc for 11 services/50 methods with Connect|WS|REST+retirement, audience
- [ ] AC2: REST exceptions register dated with removal conditions
- [ ] AC3: Auth reset, snapshots, scoring, notifications, compliance, minigame contracts complete per validated sprint ACs
- [ ] AC4: Stable ErrorCode, UNSPECIFIED=0, reserved rules, audience no-leak tests
- [ ] AC5: Deterministic buf generate + public package API (exports)
- [ ] AC6: buf lint/generate/breaking + golden + L0 + contracts test + typecheck + lint + build + git diff --check
- [ ] AC7: No new API endpoints or runtime mounting
