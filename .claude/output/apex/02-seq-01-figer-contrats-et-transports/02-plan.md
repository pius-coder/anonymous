# Plan SEQ-01 — Figer contrats et transports

## Strategy (auto)

Freeze contracts package only. No API mounting, no use-cases, no schema.

### A. Proto completion (additive, sprint-validated only)
1. `common/v1/errors.proto` — add documented ErrorCodes
2. `minigame/v1/manifest.proto` — MiniGameCommand, Public/Private state, ServerEvent, ScoreEvidence
3. `notification/v1/notification.proto` — job/delivery/ack messages + AcknowledgeNotification RPC
4. `scoring/v1/scoring.proto` — audience views (provisional admin-only vs published player/observer)
5. `compliance/v1/compliance.proto` — NEW: sprint 18 RPCs (12th service)
6. `realtime/v1/events.proto` — document WS envelope messages (already mostly present)

### B. Tooling & public API
7. package.json scripts: lint:proto, breaking, generate; exports map
8. src/index.ts export ComplianceV1 + matrix helpers
9. ARCHITECTURE.md update (generation real)
10. src/audience.ts projection field deny-lists + tests
11. Golden fixtures for identity reset, notification, minigame, compliance, payment
12. conventions tests for reserved / service count freeze

### C. Documentation deliverables (ownership)
13. `packages/contracts/docs/service-transport-matrix.md` — full matrix
14. `packages/contracts/docs/rest-exceptions.md` — dated REST exceptions
15. Update `protobuf-change.md` generate step (optional light touch under ownership)

### D. Validation
buf lint, generate, breaking against HEAD, vitest contracts, typecheck, lint, build, git diff --check
