# Step 01: Analyze

**Task:** batch sprints 04-09 - auth acquisition participation finance preparation realtime
**Started:** 2026-07-15T09:11:25Z

---

## Context Discovery

### Scope

The user explicitly requested one batch for sprint files 04 through 09, overriding the earlier
one-sprint-per-Apex operating rule for this section. Economy mode is active: no subagents, local hostile
review only.

### Local Documents Read

- `docs/06-roadmap/sprints/04-identity-auth-rbac.md`
- `docs/06-roadmap/sprints/05-acquisition-publique-planification.md`
- `docs/06-roadmap/sprints/06-participation-admission-joueur.md`
- `docs/06-roadmap/sprints/07-paiements-wallet-ledger.md`
- `docs/06-roadmap/sprints/08-preparation-lobby-annonces.md`
- `docs/06-roadmap/sprints/09-realtime-core-reconnexion.md`
- `docs/06-roadmap/use-case-coverage.md`
- `docs/00-audit/head-forensic-audit.md`
- `docs/03-architecture/security-model.md`
- `docs/01-product/actors-and-permissions.md`

### Context7 Docs

- `/honojs/hono`: Hono routing/middleware/validation/testing references.
- `/colyseus/docs`: Colyseus room auth, join and reconnection references.
- Prior sprint context still applies: `/prisma/prisma`, `/connectrpc/connect-es`,
  `/protocolbuffers/protocolbuffers.github.io`.

### Existing Implementation

- Sprint 04 auth/RBAC was already mostly present: opaque cookie session, hashed session token, session
  version revocation, role assignments, `requireAuth`, `requireRole`, audit on auth/admin commands.
- Sprint 05-06 acquisition and participation routes/use-cases existed, including public party list/detail,
  admin draft/config/publish/schedule, registration, cancellation and admin participation list.
- Sprint 07 finance existed, but wallet payment was not atomic across transaction, balance update and
  ledger entry.
- Sprint 08 preparation existed, but `confirmStart` locked preparation with absent participants without
  requiring a reason.
- Sprint 09 realtime core existed, but live access tokens were stored in DB under `accessToken` in raw form.

### Confirmed Gaps

- Public draft parties could still be registered directly by code.
- Wallet payment could create a successful transaction before detecting insufficient balance.
- Provider webhook settlement was split across multiple repository calls.
- Preparation lock with absents did not require explicit reason.
- Live token persistence did not satisfy hash-at-rest requirement.
