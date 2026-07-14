# Deletion Manifest

Ce manifeste etait une proposition lors de l'audit initial. La suppression immediate de tout sauf le socle technique a ensuite ete confirmee explicitement par l'utilisateur et appliquee sur la branche `v0.1`.

## Suppressions appliquees

| Fichiers | Fonction actuelle | Raison | Dependances | Remplacement futur | Risque |
|---|---|---|---|---|---|
| `apps/web/src/app/(arena)/**`, `apps/web/src/app/admin/**`, `apps/web/src/components/**`, `apps/web/src/services/**`, `apps/web/src/actions/**`, `apps/web/src/hooks/**`, `apps/web/src/lib/**`, `apps/web/src/schemas/**` | Parcours client/admin, UI, services et helpers legacy | Routes et etats admin/joueur melanges; `/live` polyvalent | Next App Router, Server Actions, services API | Nouvelle UI par parcours depuis `02-ux` et `04-layers` | Fort: toute experience legacy retiree |
| `apps/api/src/routes/**`, `apps/api/src/live/**`, `apps/api/src/lobby/**`, `apps/api/src/results/**`, `apps/api/src/payments/**`, `apps/api/src/players/**`, `apps/api/src/admin/**`, `apps/api/src/notifications/**`, `apps/api/src/security/**`, `apps/api/src/rounds/**`, `apps/api/src/queues/**` | API metier Hono legacy | DTO JSON et use cases non alignes sur Protobuf/lifecycle cible | Hono, Prisma, BullMQ | API reconstruite par contrats Protobuf | Fort: API legacy retiree |
| `apps/game-server/src/live/**`, `apps/game-server/src/rooms/**` | Room Colyseus et orchestration live | Orchestration trop large, timer auto vers manche active, state non versionne | Colyseus, Redis, game-engine | Runtime temps reel minimal par events/snapshots Protobuf | Fort |
| `apps/worker/src/*` hors nouveau `index.ts` | Jobs legacy | Jobs lies aux modeles supprimes | BullMQ, Prisma | Jobs reconstruits apres use cases | Moyen |
| `apps/whatsapp-gateway/src/*` legacy | Gateway provider | Integration non prioritaire dans socle | Provider externe | Adapter futur selon couche notifications | Faible |
| `packages/game-engine/src/runtimes/**`, `packages/game-engine/src/admission.ts` | Runtimes mini-jeux et admission | Mini-jeux partiels et contrats implicites | API/game-server | Framework mini-jeux par contrats | Fort |
| `packages/shared/src/{constants,errors,events,payments,release,types}/**` | Types et constantes legacy | Couche shared devenue fourre-tout | Apps et packages | Shared minimal + futurs contrats | Moyen |
| `packages/db/prisma/migrations/**`, schema metier Prisma, seed legacy | Modele de donnees metier | Reconstruction du modele produit requise | Prisma/PostgreSQL | Schema minimal puis migrations v0.1 futures | Fort |
| `docs/ALL_DOCS_CONSOLIDATED.md`, `docs/plan/**`, `docs/prd/**`, `docs/admin-arbitrage/**`, audits/guides legacy | Documentation historique | Source fragmentee ou contradictoire | Agents, plan legacy | `docs/README.md`, `00-audit` a `06-roadmap` | Moyen: historique retire de la branche |
| `.codex/output/apex/*` et `.claude/output/apex/*` legacy | Journaux agents precedents | Bruit de travaux successifs hors socle | Aucun runtime | Journal APEX courant `42-clean-legacy...` | Faible |

## Socle conserve

- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`.
- Configurations TypeScript, ESLint, Vitest, Next, Playwright, Docker Compose.
- Workspaces `apps/*` et `packages/*` avec entrypoints neutres.
- Prisma comme outil, avec schema minimal sans modeles legacy.
- Documentation v0.1 reconstruite.
