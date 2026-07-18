# Step 01: Analyze

**Task:** P-A-ADMIN - Command center et arbitrage production
**Started:** 2026-07-17T09:32:58Z
**Mode:** economy (direct tools, no subagents)

---

## Context Discovery

### Task fiche & docs

| Source | Path | Notes |
|--------|------|-------|
| Fiche lot | `docs/06-roadmap/apex-tasks/production/wave-a/P-A-ADMIN-command-center.md` | Ownership, interdits, AC, tests L1/L3/L4/L5 |
| Sprint | `docs/06-roadmap/sprints/12-admin-command-center.md` | Contrats cibles (lease, ExecuteAdminCommand) vs reality |
| UX | `docs/02-ux/admin-command-center.md` | Zones + états UI obligatoires |
| US | `docs/02-ux/user-stories-ui.md` ADM-08/09 | Lease, multi-admin, stale snapshot |
| Worktree | `docs/05-workflows/agent-worktree-convention.md` | `apex/<task-id>` + dossier worktree obligatoire |

### Acceptance criteria (from fiche)

1. Aucune horloge/job ne lance une partie active
2. Deux admins concurrents n'écrasent pas silencieusement une commande
3. Chaque action refusée explique precondition/permission sans fuite
4. Joueur/observer ne peuvent appeler une commande admin
5. Pages ownership (`/admin`, `/admin/parties/**`, `/admin/minigames`) sans données hardcodées

### Interdits (ownership)

- Contracts / DB schema
- Montage central Connect (`apps/api/src/rpc/routes.ts` ownership SEQ)
- Contrôle direct client joueur
- Démarrage auto par timer
- Mutation finance
- Score publié sans commande distincte (hors lot Scoring)
- Données hardcodées sur pages ownership

---

## WHAT EXISTS

### 1. Domain transitions (game-engine)

- `packages/game-engine/src/transitions/party.ts` — machine d'état complète Draft→…→Completed/Cancelled/Suspended; `cancel`, `pause`, `resume`, `confirmStart`, etc.
- `packages/game-engine/src/transitions/round.ts` + tests L1 existants
- `packages/game-engine/src/auth/policies.ts` — `roleHasPermission` / matrice permissions domaine
- Tests: `party-transitions.test.ts`, `round-transitions.test.ts`, `preparation-domain.test.ts`

### 2. Persistence (read-only for this lot)

- `Party`: `entryFeeAmount`, `entryFeeCurrency`, `configVersion`, `feeVersion`, `maxPlayers`, `roundProgram`, `scheduledAt` (`schema.prisma` ~220-249)
- `AuditLog` + `audit.repository.createAuditLog` / `listAuditLogs`
- **Aucun modèle lease** admin dans le schema
- Worker `apps/worker/src/jobs/roundDeadline.ts` ferme les rounds ACTIVE dus → VERIFICATION; **ne démarre jamais** une partie (comment explicite L15)

### 3. Use-cases API (REST admin)

| Area | File | Surface |
|------|------|---------|
| Party | `apps/api/src/use-cases/party/party.use-case.ts` | createDraft, getAdmin, updateConfig, validate, publish, schedule — **pas de cancel/listAdmin/fee/configVersion dans DTO admin** |
| Prep | `apps/api/src/use-cases/preparation/preparation.use-case.ts` | open, announce, confirmStart (force absents + reason), getState, presence/ready |
| Round | `apps/api/src/use-cases/round/round.use-case.ts` | configure, briefing, activate, pause, resume, close |
| Scoring | `apps/api/src/use-cases/scoring/scoring.use-case.ts` | `expectedVersion` optimiste (pattern à réutiliser) — ownership Scoring pour publish |

Routes REST admin:

- `apps/api/src/routes/admin/party.ts` — POST create, GET :id, PUT config, validate, publish, schedule, participations; `requireRole("ADMIN","SUPER_ADMIN")` + `auditLog`
- `apps/api/src/routes/admin/preparation.ts` — open / announcement / confirm-start / GET state
- `apps/api/src/routes/admin/round.ts` — configure / briefing / start / pause / resume / close
- `apps/api/src/routes/admin/payment.ts` — **hors ownership** (Finance)

RBAC: `apps/api/src/middleware/rbac.ts` — check rôle simple (401/403 génériques).
Audit: `apps/api/src/middleware/audit.ts` — post-handler `auditRepository.createAuditLog` (pas de motif/résultat/version dans le payload actuel).

### 4. Contracts AdminService

`packages/contracts/proto/admin/v1/admin.proto`:

```
GetGameState, GetReadonlySnapshot, ListParties, GetSystemReadiness
```

**Aucune** RPC commande, lease, ExecuteAdminCommand (documentés sprint 12 mais absents du proto figé).

Client web: `apps/web/src/services/rpcServices.ts` `AdminService` (gameState/listParties/readonly).
**Serveur Connect:** `apps/api/src/rpc/routes.ts` **n'enregistre pas** AdminService (pas de handler `admin-service.ts`). Montage central interdit à ce lot → composition AdminService nécessite coordination SEQ ou export public à brancher par owner du montage.

### 5. UI admin (shells vs wired)

| Route / composant | État |
|-------------------|------|
| `/admin` | **Hardcodé** (`activeParties`, métriques fictives) |
| `/admin/parties` | **Hardcodé** tableau parties |
| `/admin/parties/new` + `PartySetupView` | Formulaire **statique** (defaults Qualificatif Douala, pas d'API) |
| `/admin/parties/[id]/setup` | Idem shell |
| `/admin/parties/[id]/control` | `AdminPreparationPanel` **branché API** (`preparationClient`) |
| `/admin/parties/[id]/monitor` | **Hardcodé** supervision |
| `/admin/parties/[id]/audit` | Events **hardcodés** (incl. `control.lease.acquire` fictif) |
| `/admin/minigames` | Catalogue **hardcodé** `uiMiniGames` |
| `AdminRoundControls` | Appels `RoundService` réels; defaults minigame/audit hardcodés |
| `AdminScoresPanel` | Scoring réel — **hors mutation ownership** (consommer readonly OK) |
| payments/wallets/compliance/users | **Hors ownership** P-A-ADMIN |

### 6. Patterns réutilisables

- Optimistic concurrency scoring: `expectedVersion` + erreur conflit (`scoring.use-case.ts`)
- Admin prep panel: React Query, stale 12s, error local, confirm with reason (`AdminPreparationPanel.tsx`)
- Sensitive action UI: `SensitiveActionPanel.tsx`
- REST admin + audit middleware pattern
- Domain transitions pure + use-case orchestration

### 7. Gaps (constat, pas solution)

| Gap | Evidence |
|-----|----------|
| AdminService RPC non monté | `routes.ts` sans Admin; grep `AdminService` vide côté api |
| Pas de lease multi-admin | Aucun modèle/repo lease; UI simule "Détenu" |
| Pas de cancel/fin partie admin use-case | domain `cancel`/`completeGame` existent; pas d'export use-case/route |
| Pas de list parties admin REST | list public Session; Admin ListParties proto non implémenté |
| fee/configVersion non exposés admin DTO | schema a les champs; party.use-case ne mappe pas entryFee/configVersion |
| Concurrence commande | round/party commands sans expectedVersion/lease |
| UI hardcodée ownership | page.tsx parties, dashboard, setup, monitor, minigames, audit |
| Checkout principal sale | `git status` dirty docs → `pnpm worktree:create` refuse |

### 8. Environment blockers

- **pwd:** `/home/afreeserv/anonymous` branch `v0.1`
- **Worktree:** absent pour `p-a-admin`; create **bloqué** (working tree unclean)
- **Flags non reconnus par skill APEX:** `-pr`, `-x`, `-t` (ignorés; `-e` economy, `-a` auto, `-s` save, `-b` branch appliqués)
- **Branch mode skill:** resterait sur `v0.1`; convention projet exige `apex/p-a-admin` en worktree

### 9. Out of ownership (ne pas toucher)

- `apps/api/src/rpc/routes.ts` montage central
- packages/contracts proto regenerate
- packages/db migrations/schema
- admin payment/wallet/scores mutation/compliance/incidents pages
- game-server control joueur

---

## Keywords used

admin, lease, command center, party, round, preparation, RBAC, audit, AdminService, hardcodé

## Files of highest relevance (top)

1. `docs/06-roadmap/apex-tasks/production/wave-a/P-A-ADMIN-command-center.md`
2. `packages/contracts/proto/admin/v1/admin.proto`
3. `apps/api/src/routes/admin/{party,preparation,round}.ts`
4. `apps/api/src/use-cases/{party,preparation,round}/*`
5. `packages/game-engine/src/transitions/party.ts`
6. `apps/web/src/app/admin/**` + `components/admin/**`
7. `apps/web/src/services/rpcServices.ts` + `preparationClient.ts`
8. `apps/api/src/middleware/{rbac,audit}.ts`
9. `apps/worker/src/jobs/roundDeadline.ts`
10. `packages/db/prisma/schema.prisma` (Party configVersion/feeVersion)

---

## Analyze complete

Pas de décisions d'implémentation ici — voir step-02 plan.
