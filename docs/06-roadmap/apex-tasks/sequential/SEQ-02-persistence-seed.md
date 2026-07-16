# SEQ-02 - Baseline persistence, seed et integration PostgreSQL

## Instruction a la session Codex

Execute cette fiche avec APEX apres SEQ-01. Tu es l'unique proprietaire Prisma. Stabilise la persistence
avant les worktrees metier; n'implemente aucun parcours UI ou transport.

## Prerequis et lectures

- Baselines SEQ-00 et SEQ-01 mergees et vertes.
- Lire `AGENTS.md`, gap analysis, sprints 03/13/17/18, `database-change.md`, couches persistence et
  contrats figes.
- Context7 obligatoire : Prisma et Vitest; PostgreSQL pour contraintes/concurrence si necessaire.

## Ownership exclusif

`packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/**`, `packages/db/prisma/seed.ts`,
repositories publics et tests L3 de `packages/db`.

## Interdit

Proto/codegen, packages racine/Turbo/CI, use-cases API, game-server, worker et web.

## Livrables

1. Seed deterministe avec roles admin/support/finance, deux joueurs, partie publiee, participations,
   wallet et donnees minimales pour auth/lobby/live/scoring.
2. Operations ScoreReview et DeliveryLog sans dupliquer Announcement.
3. Modeles compliance/incidents uniquement si les use cases documentes fixent champs/retention.
4. Migrations compatibles DB vide et schema v0.1 courant, sans edition d'une migration appliquee.
5. Tests repositories/transactions/contraintes/idempotence/claim concurrent sur PostgreSQL reel.

## Criteres d'acceptation et tests

- Migration DB vide, seed deux fois avec comportement defini, puis smoke repositories.
- Aucune entite Prisma n'est exposee comme contrat reseau.
- Les tests actuels mockes restent nommes L1/L2 ou sont remplaces par L3 reel.
- Executer docs, generation Prisma, L3, tests DB, typecheck, lint, build et `git diff --check`.
