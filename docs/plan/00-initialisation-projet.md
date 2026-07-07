# Sprint 0 - Initialisation projet

## Objectif sprint

Creer le socle technique permettant de developper les 15 features sans improvisation : monorepo, services, base de donnees, environnements, conventions, CI et strategie de test.

## Gate documentaire obligatoire

Avant de creer ou installer quoi que ce soit :

1. Lire via Context7 les docs actuelles de Next.js, Hono, Prisma, Colyseus, BullMQ, Redis et Docker Compose.
2. Pour chaque outil, noter le library ID Context7, la version visee, la commande d installation, les peer dependencies et les contraintes TypeScript.
3. Verifier les exemples officiels de setup serveur/API avant de scaffold.
4. Pour Colyseus, verifier la version actuelle et les imports serveur recommandes avant de choisir `defineServer`, `defineRoom`, `Room`, `Client`, `Schema`, `type` ou un transport.
5. Si une doc est indisponible ou contradictoire avec la version installee, bloquer la story et resoudre la version avant de coder.

## Backlog sprint

### Story 0.1 - Initialiser le monorepo

Etapes :

1. Creer la structure monorepo.
2. Ajouter `apps/web` pour Next.js.
3. Ajouter `apps/api` pour Hono.
4. Ajouter `apps/game-server` pour Colyseus.
5. Ajouter `apps/worker` pour BullMQ.
6. Ajouter `apps/whatsapp-gateway` comme service optionnel ou placeholder.
7. Ajouter `packages/db` pour Prisma/PostgreSQL.
8. Ajouter `packages/game-engine` pour les resolvers.
9. Ajouter `packages/shared` pour types, constantes, erreurs et schemas partages.
10. Configurer TypeScript strict, lint, format et conventions de nommage.

Tests :

- Build vide de chaque package.
- Typecheck global.
- Lint global.

### Story 0.2 - Initialiser l infrastructure locale

Etapes :

1. Creer `docker-compose.yml`.
2. Ajouter PostgreSQL.
3. Ajouter Redis.
4. Ajouter variables `.env.example`.
5. Separer secrets Fapshi sandbox/live.
6. Ajouter scripts `dev`, `test`, `lint`, `typecheck`, `db:migrate`, `db:seed`.
7. Documenter comment lancer localement.

Tests :

- `docker compose up` demarre PostgreSQL et Redis.
- API peut ouvrir une connexion DB.
- Worker peut ouvrir une connexion Redis.

### Story 0.3 - Initialiser Prisma

Etapes :

1. Creer `schema.prisma`.
2. Ajouter enums globaux : `UserRole`, `GameSessionStatus`, `SessionRegistrationStatus`, `PaymentStatus`, `LedgerDirection`, `LedgerType`, `RoundStatus`.
3. Ajouter modeles minimum : `User`, `PlayerProfile`, `GameSession`, `SessionRegistration`, `PaymentTransaction`, `Wallet`, `LedgerEntry`, `RoundInstance`, `RoundResult`, `GameResult`, `PrizeDistribution`, `AuditLog`.
4. Ajouter indexes uniques et contraintes critiques.
5. Ajouter premiere migration.
6. Ajouter seed de developpement avec sessions publiques/privees.

Tests :

- Migration from scratch.
- Seed executable deux fois sans casser.
- Contraintes uniques verifiees.

### Story 0.4 - Initialiser les patterns transverses

Etapes :

1. Creer format d erreur API standard.
2. Creer middleware `requestId`.
3. Creer middleware secure headers/body limit.
4. Creer helper d audit `writeAuditLog`.
5. Creer helper transaction DB.
6. Creer constantes d events/outbox.
7. Creer structure de tests unitaires/integration/E2E.

Tests :

- Une route healthcheck API.
- Une route test audit en environnement test.
- Un test transaction rollback.

## Definition of Done Sprint 0

- Criteres de tests a valider :
  - Typecheck global.
  - Lint global.
  - Tests unitaires du package shared/db initial.
  - Test integration DB : migration + seed + connexion.
  - Test integration Redis : connexion worker.
  - Test CI locale : toutes les commandes de validation executables.
- Tous les services demarrent localement.
- DB et Redis fonctionnent.
- Prisma migre et seed.
- CI minimale execute typecheck, lint et tests.
- Le projet est pret pour Feature 01.
