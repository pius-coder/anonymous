# Plan

1. Extend Prisma schema and migration for `AntiCheatEvent`, `RiskSignal`, `RateLimitBucket`, `ComplianceGate`, and `ModerationAction`.
2. Export new Prisma models/enums through `@session-jeu/db`.
3. Add an API security service for compliance gates, risk signals, anti-cheat signals, session risk summaries, disputes, and moderation actions.
4. Add route modules for:
   - `GET /v1/security/session/:id/risk`
   - `POST /internal/anticheat/signal`
   - `GET /v1/admin/compliance/gates`
   - `POST /v1/support/disputes`
   - `POST /v1/admin/moderation/actions`
5. Wire compliance gates into session publication and mini-game risk validation.
6. Add rate limiting to payment/wallet mutation routes and risk logging to invalid payment webhook signatures.
7. Add anti-cheat persistence to the game-server action store for duplicate, late, and high-rate inputs.
8. Add focused tests around DB exports, service behavior, API/RBAC routes, rate limiting, admin publication compliance, mini-game risk, and game-server anti-cheat.
9. Run Prisma and project validation commands until green.
