# SEQ-00 - Installer le socle d'integration et CI

## Instruction a la session Codex

Execute cette fiche de bout en bout avec APEX. Tu es l'unique proprietaire du tooling partage. Ne
commence aucune feature metier. Le resultat doit permettre aux autres worktrees de prouver leurs tests
d'integration de maniere reproductible.

## Prerequis

- Branche de base : `v0.1` au commit audite ou branche d'integration creee depuis celui-ci.
- Aucune autre tache active ne doit modifier les fichiers possedes ci-dessous.
- Lire `AGENTS.md`, `docs/README.md`, `docs/00-audit/v0.1-gap-analysis.md`,
  `docs/05-workflows/apex-workflow.md`, `docs/05-workflows/apex-parallel-worktrees.md` et
  `docs/05-workflows/test-strategy.md`.
- Context7 obligatoire : Turborepo, Playwright, Vitest, Next.js, Docker Compose et Git worktree selon
  les changements reels.

## Ownership exclusif

`package.json`, `pnpm-lock.yaml`, `turbo.json`, `.github/workflows/**`, `docker-compose.yml`,
`.env.example`, configurations Vitest/Playwright et nouveaux scripts d'orchestration de tests.

## Interdit

Code metier dans `apps/**/src` et `packages/**/src`, proto, schema Prisma, migrations et UI.

## Livrables

1. Scripts racine `test:unit`, `test:integration`, `test:e2e`, `test:all` et taches Turbo avec outputs/env.
2. PostgreSQL et Redis jetables, identifies par `WORKTREE_ID`, avec teardown meme apres echec.
3. Ports uniques API/game-server/web et variables coherentes par worktree.
4. Playwright `webServer[]` qui demarre les services necessaires.
5. Harness L3 PostgreSQL, L4 Connect/Hono, L4 Colyseus et smoke L5 navigateur.
6. CI frozen install -> generation -> DB vide -> unit -> integration -> E2E -> typecheck/lint/build.
7. Documentation des commandes, timeouts, artefacts et diagnostic des echecs.

## Criteres d'acceptation

- Une commande depuis un clone/worktree propre execute chaque niveau sans service lance manuellement.
- Deux worktrees peuvent lancer les suites sans partager DB, Redis ou ports.
- Le smoke live echoue si Colyseus ne demarre pas; aucun fallback local ne le rend vert.
- Les logs ne contiennent ni cookie, token, mot de passe ni URL avec secret.

## Validation minimale

`pnpm docs:check`, `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm typecheck`,
`pnpm lint`, `pnpm build`, puis `git diff --check`. Rapporter commandes, durees, frontieres reelles et
risques. Ne pas declarer termine si les scripts integration/E2E ne sont que des alias des tests unitaires.
