# Step 02: Plan

**Task:** sprint 00 - gel operationnel
**Started:** 2026-07-15T08:27:06Z

---

## Planning Progress

_Implementation plan will be written here..._

## Implementation Plan: sprint 00 - gel operationnel

### Overview

Stabiliser le cadrage documentaire sans ajouter de feature produit. Les changements doivent rendre le sprint
01 executable sans ambiguite de vocabulaire et documenter les exceptions transitoires detectees dans le
worktree sale.

### File Changes

#### `docs/01-product/session-lifecycle.md`
- Ajouter le vocabulaire canonique `SCREAMING_SNAKE_CASE`.
- Ajouter une table de mapping entre etats canoniques et libelles UML.
- Couvre AC-00-01, AC-00-06 et le gate lifecycle.

#### `docs/03-architecture/uml/state-machines.md`
- Remplacer la machine principale par les etats canoniques.
- Garder les alias UML seulement comme libelles visuels.
- Couvre les interdictions `SCHEDULED -> ACTIVE_ROUND` et publication sans verification.

#### `docs/06-roadmap/sprints/01-modele-produit-domaine.md`
- Corriger le scenario deadline pour utiliser `ACTIVE_ROUND -> ROUND_RESOLVING`.

#### `docs/06-roadmap/sprints/02-tooling-contrats-protobuf-connectrpc.md`
- Borner la portee de figement des contrats.
- Marquer les contrats de domaines futurs comme `draft` jusqu'au sprint proprietaire.
- Documenter les exceptions Hono transitoires.

#### `docs/06-roadmap/sprints/03-persistence-minimale-migrations.md`
- Clarifier que le sprint 03 pose le socle durable et non les comportements complets paiement/realtime/scoring/notifications.

#### `docs/06-roadmap/sprints/04-identity-auth-rbac.md`
- Clarifier la frontiere entre cookie opaque HTTP et token live court.

#### `docs/06-roadmap/sprints/05-acquisition-publique-planification.md`
- Ajouter un gate compliance minimal avant sprint 18.

#### `docs/06-roadmap/sprints/08-preparation-lobby-annonces.md`
- Remplacer notification delivery par notification intent avant sprint 17.

#### `docs/06-roadmap/sprints/09-realtime-core-reconnexion.md`
- Documenter l'exception Hono JSON pour `CreateLiveAccess`.
- Clarifier le stockage hashe du token live si persiste.

#### `docs/03-architecture/protobuf-contract-strategy.md`
- Ajouter la reference Context7 `/connectrpc/connect-es`.
- Documenter l'exception Hono transitoire.

#### `docs/06-roadmap/risks-and-open-decisions.md`
- Ajouter les risques de figement trop tot et de token live/state view trop large.
- Corriger la decision Colyseus/WebSocket vers sprint 09.

### Testing Strategy

- `pnpm docs:check`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- Relances forcees Turbo pour typecheck, lint, test et build afin d'eviter un faux vert cache.

### Acceptance Criteria Mapping

- AC-00-01/AC-00-06: lifecycle canonique et transitions interdites documentees.
- AC-00-02: publication sans verification reste interdite dans state machine.
- AC-00-03/AC-00-04/AC-00-05: frontiere participation, observer readonly, support readonly conservee sans feature produit.

---
## Step Complete
**Status:** ✓ Complete
**Files planned:** 11
**Tests planned:** 5 commands
**Next:** step-03-execute.md
**Timestamp:** 2026-07-15T09:36:00Z
