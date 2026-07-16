# Repository Inventory

## Analyse v0.1 courante (2026-07-16)

Documents produits par analyse du depot actif sur `v0.1` :

| Document | Contenu |
|---|---|
| [v0.1-current-state.md](v0.1-current-state.md) | Resume executif, validations, ecarts, roadmap |
| [v0.1-implementation-matrix.md](v0.1-implementation-matrix.md) | Matrice par workspace et domaine produit |
| [v0.1-routes-and-flows.md](v0.1-routes-and-flows.md) | Routes web, API, RPC, Colyseus et flux |
| [v0.1-gap-analysis.md](v0.1-gap-analysis.md) | Ecart complet docs/sprints vs code par couche |

Constats rapides :

- Monorepo : 5 apps, 4 packages, pnpm 9 + Turbo 2
- Validations : typecheck, lint, tests, build, docs et E2E Playwright OK (2026-07-16)
- 40 pages Next.js, 21 modeles Prisma, 13 protos, 3 services ConnectRPC implementes
- UI en avance sur branchement backend (mock data sauf auth et live partiel)

Les sections ci-dessous documentent l'inventaire initial de creation de branche et l'audit HEAD.

## Git initial

- Repertoire: `/home/afreeserv/anonymous`.
- Branche avant creation: `feature/rules-lifecycle-v1`.
- Branche cible creee: `v0.1`.
- `v0.1` n'existait pas localement avant creation.
- Le worktree contenait de nombreuses modifications suivies et non suivies. La branche `v0.1` embarque cet etat par decision utilisateur explicite.

## Workspaces et runtimes

- `apps/web`: Next.js 16.2.10, React 19.2.4, Colyseus SDK 0.17.43, Pixi.js 8.19.0.
- `apps/api`: Hono 4.12.28, BullMQ 5.79.3, ioredis 5.10.1.
- `apps/game-server`: Colyseus 0.17.10, `@colyseus/schema` 4.0.27.
- `apps/worker`: jobs BullMQ.
- `apps/whatsapp-gateway`: gateway WhatsApp.
- `packages/db`: Prisma 6.19.3 et schema PostgreSQL.
- `packages/game-engine`: runtimes server-side de mini-jeux.
- `packages/shared`: erreurs, constantes, evenements et readiness.

## Commandes executees

- `pwd`
- `git branch --show-current`
- `git status --short`
- `git ls-tree -r --name-only HEAD`
- `git ls-tree -r -l HEAD`
- `git grep` cible sur routes, rooms, Prisma, realtime, workers, imports et docs
- `git show-ref --verify --quiet refs/heads/v0.1`
- `rg --files`
- `cat package.json`
- `find docs/plan -maxdepth 2 -type f`
- `find docs/prd/features -maxdepth 1 -type f`
- `pnpm list --depth 0`
- `pnpm --filter @session-jeu/web list --depth 0`
- `pnpm --filter @session-jeu/api list --depth 0`
- `pnpm --filter @session-jeu/game-server list --depth 0`
- `pnpm --filter @session-jeu/db list --depth 0`
- `pnpm --filter @session-jeu/game-engine list --depth 0`
- `npx ctx7@latest library "Protocol Buffers" ...`
- `npx ctx7@latest docs /protocolbuffers/protocolbuffers.github.io ...`
- `npx ctx7@latest library "Connect" ...`
- `npx ctx7@latest docs /connectrpc/connect-es ...`
- `npx ctx7@latest library "Next.js" ...`
- `npx ctx7@latest docs /vercel/next.js ...`
- `npx ctx7@latest library "Hono" ...`
- `npx ctx7@latest docs /websites/hono_dev ...`
- `npx ctx7@latest library "Colyseus" ...`
- `npx ctx7@latest docs /colyseus/docs ...`
- `npx ctx7@latest library "Prisma" ...`
- `npx ctx7@latest docs /prisma/web ...`
- `npx ctx7@latest library "BullMQ" ...`
- `npx ctx7@latest docs /taskforcesh/bullmq ...`

## Documentation locale lue

- `docs/plan/09-session-live-temps-reel.md`
- `docs/prd/features/09-session-live-temps-reel.md`
- `docs/BRAINSTORMING.md`
- `docs/PRD_PHASE_1.md`
- `docs/PRD_PHASE_2.md`
- `docs/cahier_des_charges_technique_plateforme_sessions_jeu.md`
- Extraits techniques de `docs/deep-research-report.md`, `docs/catalogue-mini-jeux.md`, `docs/refonte-console-live-admin.md` via recherche ciblee.

## Context7

- `/protocolbuffers/protocolbuffers.github.io`: Protobuf, evolution de schema, champs reserves, enums et valeurs par defaut.
- `/connectrpc/connect-es`: clients TypeScript navigateur, transport Connect, gRPC-Web et limites de streaming HTTP/1.1.
- `/vercel/next.js`: App Router, `app/layout.tsx`, routes fichier.
- `/websites/hono_dev`: routeurs Hono chaines, validation, middleware type.
- `/colyseus/docs`: lifecycle Room, Schema state, messages client, reconnexion.
- `/prisma/web`: schema relationnel, migrations, transactions Prisma.
- `/taskforcesh/bullmq`: jobs, retry, backoff, idempotence.

## Audit HEAD complet

- Index complet des 928 fichiers HEAD: `docs/00-audit/head-file-index.md`.
- Analyse forensique du legacy: `docs/00-audit/head-forensic-audit.md`.

Constats HEAD majeurs:

- Le legacy etait ambitieux, pas anecdotique: auth, paiement, wallet, live, mini-jeux, resultats, admin, audit, notifications et anti-cheat.
- Le probleme principal etait le melange des concepts et responsabilites, pas l'absence totale de fonctionnalites.
- Les anciennes docs contiennent des decisions valables, notamment `docs/admin-arbitrage/05-diagrammes.md`.
- Le catalogue a trois niveaux a distinguer: 120 titres produit, 36 definitions API, 6 jeux recette, 3 runtimes dedies.

## Nettoyage applique apres audit

- Suppression du code metier legacy dans `apps/api`, `apps/web`, `apps/game-server`, `apps/worker`, `apps/whatsapp-gateway`, `packages/game-engine`, `packages/shared` et `packages/db`.
- Suppression des migrations Prisma metier et remplacement par un schema Prisma technique minimal.
- Suppression des documents legacy fragmentes au profit de `docs/README.md` et des dossiers `00-audit` a `06-roadmap`.
- Suppression des anciens journaux APEX/Claude hors workflow courant.
- Conservation des manifests, lockfile, configs, workspaces, scripts, dependances installees et tests de fondation.
