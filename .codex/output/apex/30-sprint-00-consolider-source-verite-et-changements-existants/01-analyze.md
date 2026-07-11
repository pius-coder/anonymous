# Step 01: Analyze

**Task:** Consolider, valider, versionner et fusionner tous les changements existants avant le cycle des dix sprints du dashboard d'administration et d'arbitrage
**Started:** 2026-07-11T12:12:53Z

---

## Context Discovery

### Etat du worktree

- Branche `feat/debug-session-catalogue`, au meme commit `2cbe4ce` que `main` et `origin/main`; aucun commit propre a la branche.
- Le worktree contient 47 chemins suivis modifies et 78 fichiers non suivis. Le lot couvre catalogue, auth, paiement, inscription, admin, lobby/live, migration, tests, audits et documentation APEX.
- Les fichiers indexes et non indexes se chevauchent; le commit final doit prendre l'etat complet du worktree, pas seulement l'index courant.
- Les quatre audits supprimes a la racine sont recopies bit a bit sous `docs/`; les index documentaires referencent sept nouveaux fichiers `docs/admin-arbitrage/`.

### Source de verite

- `docs/admin-arbitrage/README.md:3` declare la source de verite specialisee et l'ordre de reprise apres compaction.
- `docs/admin-arbitrage/01-reglement-arbitrage.md:24` fixe les cinq niveaux de reglement, les six familles, les profils P1-P9, le snapshot de session et les resultats versionnes.
- `docs/admin-arbitrage/02-user-stories-dashboard.md:3` decrit les EPIC A-K et les criteres d'acceptation du cockpit.
- `docs/admin-arbitrage/03-edge-cases.md:3` fixe les decisions par defaut et les gravites INFO/MINOR/MAJOR/CRITICAL.
- `docs/admin-arbitrage/04-ui-jeux-dashboard.md:3` fixe les vues Admin A/Admin B/Support, les actions avec raison et les six panels famille.
- `docs/admin-arbitrage/05-diagrammes.md:3` contient les 15 diagrammes demandes.
- `docs/admin-arbitrage/06-plan-apex-implementation.md:23` definit dix sprints fonctionnels a executer apres ce sprint de consolidation.

### Existant DB et API

- `packages/db/prisma/schema.prisma:404` contient deja GameSession, live state, rounds, minigames, resultats, audit, incidents et approbations.
- Les modeles cibles `MiniGameRulesVersion`, `SessionRulesSnapshot`, `SessionControlLease`, `ReviewDossier`, `ArbitrationDecision` et `ResultVersion` n'existent pas encore.
- `packages/db/prisma/migrations/20260710110000_extend_active_registration_unique/migration.sql:1` etend l'index unique partiel aux statuts CHECKED_IN et IN_ROOM.
- `apps/api/src/routes/admin/live.ts:25` expose start-round, pause et resume; seul start-round est actuellement publie et consomme par la room.
- `apps/api/src/admin/operations.ts:568` persiste les approbations sans executer encore leur payload.

### Existant game-server

- `apps/game-server/src/rooms/GameSessionRoom.ts:159` porte la room autoritaire et les limites de messages.
- `apps/game-server/src/rooms/GameSessionRoom.ts:294` enchaine automatiquement briefing, round, resolution, resultats puis round suivant.
- `apps/game-server/src/live/liveCommands.ts:3` ne definit que `start-round`.
- Les limites factuelles sont documentees: matchmaking multi-session non garanti, pause/reprise DB seulement, restauration crash partielle, six rounds fixes, statut DB de reconnexion finale incomplet.

### Existant web

- Le lot courant aligne les contrats catalogue, auth, paiement et visibilite, ajoute le health-check API et corrige l'hydratation du CTA d'inscription.
- `apps/web/src/components/admin/AdminActionForms.tsx:109` conserve un `roundNum: 1` en dur, traite par les sprints live/cockpit.
- `apps/web/e2e/feature-01-catalogue-public.spec.ts:58` lit encore l'ancien contrat `data[]` et peut ignorer le test detail.
- `apps/web/src/app/(arena)/payments/[id]/status/page.tsx:34` affiche 24 heures alors que l'API reserve 15 minutes.
- `apps/web/src/app/(arena)/me/sessions/page.tsx:48` et la page profil ont un risque de skeleton permanent pour un visiteur non connecte.
- `apps/web/src/components/auth/LoginForm.tsx:73` pointe vers une route reset-password absente.

### Tests et outillage

- Monorepo pnpm 9.15.4, Node constate 22.22.2, Turbo 2.10.4, TypeScript 5.9.3, Next 16.2.10, React 19.2.4, Prisma 6.19.3, Hono 4.12.28, Colyseus 0.17.10.
- Les scripts racine reels sont `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` et `pnpm format:check`.
- `pnpm test` n'execute ni Playwright ni `scripts/test-api.sh`.
- Aucun workflow CI ni test de migration depuis une base vide n'est present.
- Les scans de secrets sur les nouveaux audits/APEX n'ont trouve que des noms de variables et des references documentaires, aucun secret literal.

## Inferred Acceptance Criteria

- [ ] AC1: Tous les changements presents, y compris fichiers non suivis et deplacements d'audits, sont integres dans un commit coherent sur la branche courante.
- [ ] AC2: Les regressions directement liees au lot courant sont corrigees ou explicitement reportees au sprint proprietaire sans masquer un test.
- [ ] AC3: La migration d'index partiel est validee depuis une base PostgreSQL vide si l'environnement le permet.
- [ ] AC4: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` et les tests E2E applicables passent.
- [ ] AC5: La branche est poussee, une PR est ouverte, verifiee, fusionnee, puis le depot revient sur `main` synchronise.
- [ ] AC6: Le cycle des dix sprints repart d'un `main` propre et de la source de verite persistante.

## Context Summary

- Six explorations paralleles ont couvert documentation, Git, DB/API, game-server, web et tests/infra.
- Le lot est transversal mais techniquement relie par la stabilisation catalogue/inscription/paiement/live et la creation de la source de verite arbitrage.
- Les dix sprints cibles restent non implementes et seront traites un par un apres fusion de cette base.
