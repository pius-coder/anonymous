# Tests

## Added Or Updated
- DB export tests for new Feature 15 models.
- API service tests for compliance gates, anti-cheat/risk creation, and risk redaction.
- API route tests for:
  - security session risk RBAC,
  - support disputes,
  - admin compliance gates,
  - admin moderation actions,
  - internal anti-cheat auth and ingestion,
  - rate limiting,
  - session publication compliance,
  - mini-game risk compliance.
- Game-server tests for:
  - late input anti-cheat event creation,
  - duplicate nonce double-submit event creation,
  - high-rate input auto-click event and risk signal creation.

## Coverage Intent
The tests cover the visible API contracts, RBAC boundaries, sensitive data redaction, idempotence/concurrency-adjacent anti-cheat cases, and compliance blocks required by the Feature 15 PRD/plan.
