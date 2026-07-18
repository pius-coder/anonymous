# Execute log — SEQ-01

## Changes applied

### Proto
- errors.proto: ErrorCode 20–29 (reconnect, scoring, compliance, notification, minigame)
- minigame: runtime companion messages (command/public/private/event/evidence)
- notification: job fields, delivery updated, AcknowledgeNotification RPC
- scoring: audience fields + ScoreWaitingReviewView
- compliance/v1: ComplianceService 6 RPCs (sprint 18)
- cleaned unused imports admin/identity/session

### Tooling / API
- buf.yaml: STANDARD with project-intent excepts (PACKAGE_DIRECTORY_MATCH, RPC_* naming CQRS)
- package scripts: lint:proto, breaking, exports map
- index.ts: ComplianceV1 + audience + matrix exports
- audience.ts, matrix.ts + tests
- fixtures: identity, notification, minigame, compliance, payment + scoring no-leak
- docs: service-transport-matrix.md, rest-exceptions.md, generated-diff-notes.md
- ARCHITECTURE.md, protobuf-change.md workflow update
- eslint ignore for src/gen

### Not done (forbidden by SEQ-01)
- No API endpoint / RPC registration / use-case / schema
