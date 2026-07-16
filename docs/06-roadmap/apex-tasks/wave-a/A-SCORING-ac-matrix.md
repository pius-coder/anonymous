# A-SCORING — Matrice AC → tests

Commit de base worktree : voir `git rev-parse HEAD` au démarrage de la branche `apex/a-scoring`.
Montage du routeur central (`apps/api/src/rpc/routes.ts`) : **SEQ-03** uniquement.

| AC | Description | Preuve |
|---|---|---|
| AC1 | Admin liste les scores provisoires ; joueur/observer ne les reçoivent jamais | L4 `apps/api/src/rpc/__tests__/scoring-service.test.ts` (RBAC admin + player `getPublishedResults` sans provisional) ; use-case `listProvisionalScores` audience admin |
| AC2 | Correction exige raison, acteur, version/conflit et audit | L1 domain transitions ; unit `correctProvisionalScore` (AUDIT_REASON_REQUIRED, VERSION_CONFLICT, audit) ; L3 concurrent correction |
| AC3 | Publication idempotente, transitionne explicitement, fige projection | unit `publishResults` ; L3 `publishRoundScores` concurrent ; audit `RESULTS_PUBLISH` |
| AC4 | Deux admins concurrents → résultat déterministe sans écrasement silencieux | L3 version conflict + concurrent publish |
| AC5 | Results joueur visible uniquement après publication ; waiting explicite avant | L5 `scoring.l5-flow.test.ts` ; UI `PlayerWaitingPanel` / `PlayerResultsPanel` |

## Fichiers ownership A-SCORING

| Zone | Chemins |
|---|---|
| Use-cases | `apps/api/src/use-cases/scoring/` |
| Transport | `apps/api/src/rpc/scoring-service.ts` (non monté — SEQ-03) |
| UI admin | `apps/web/src/components/admin/AdminScoresPanel.tsx`, scores page |
| UI joueur | `PlayerWaitingPanel`, `PlayerResultsPanel`, waiting/results pages |
| Repo consommé | `packages/db/src/repositories/score.repository.ts` (helpers concurrency) |

## Interdits respectés

- Contrats / Prisma schema / migrations / seed : non modifiés
- game-server, workers, tooling racine : non touchés
- `apps/web/src/services/rpcServices.ts` : non modifié (consommé tel quel)
- Routeur central `routes.ts` : non modifié
