# P-SEQ-00 - Baseline production et politique no-mock

## Mission autonome

Transformer le socle de recette v0.1 en baseline de developpement production : configuration validee
au demarrage, CI reproductible, tests concurrents isoles et interdiction mecanique des fallbacks locaux
sur les parcours inclus.

## Prerequis et lectures

- Base : commit d'integration WAVE-A `cd96de8` ou descendant propre.
- Lire l'audit production, SEQ-00/04, strategie de tests, topologie runtime et conventions worktree.
- Context7 : Turbo, Playwright, Next.js et outils de validation d'environnement reellement retenus.

## Ownership exclusif

`package.json`, `pnpm-lock.yaml`, `turbo.json`, `.github/workflows/**`, `.env.example`, scripts racine,
configurations Vitest/Playwright et validateur central de configuration. Aucun contrat ni schema metier.

## Interdit

Ne pas implementer Fapshi, un mini-jeu ou une feature metier. Ne pas masquer un secret absent avec une
valeur locale. Ne pas serialiser les tests comme contournement de la course du seed.

## Livrables production

- contrat d'environnement par service, separation local/test/staging/production et validation fail-fast;
- detection CI des URLs localhost, IDs `*-local-*`, providers fake et imports de modules hardcodes dans
  les builds staging/production;
- isolation de seed/test rendant Playwright parallelisable sans violation d'unicite;
- runners L3/L4/L5 qui demarrent PostgreSQL, Redis, API, game-server, worker, gateway et web selon le gate;
- artefacts de diagnostic rediges sans credentials, teardown garanti et matrice des niveaux executee;
- gate dependances/lockfile initial et budget de vulnerabilites bloqueuses.

## Criteres d'acceptation

- une configuration production incomplete fait echouer le processus avant d'ecouter un port;
- aucun binaire production ne peut emettre `localhost`, `fapshi-local`, provider fake ou seed credential;
- deux workers Playwright peuvent preparer leurs donnees sans collision;
- CI prouve au moins un job worker avec PostgreSQL+Redis reels et un transport Colyseus authentifie;
- les tests unitaires peuvent garder des doubles, clairement etiquetes L1.

## Tests et sortie

Tests du validateur d'environnement, test negatif de build production, rerun E2E parallele, integration
root et `pnpm audit --prod`. Executer docs, typecheck, lint, tests et build. Commit atomique, rapport des
variables requises sans valeurs secretes et worktree propre.
