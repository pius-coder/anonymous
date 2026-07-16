# A-SCORING - Verification, correction et publication

## Mission autonome

Apres SEQ-00/01/02, implementer la couche application scoring, son transport et les UI admin/joueur.
La publication est une commande admin explicite; aucun score provisoire ne fuit avant celle-ci.

## Ownership

Nouveaux use-cases scoring, implementation ScoringService, composants/routes admin scores, joueur waiting
et results, tests scoring. Consommer les repositories ScoreReview/Provisional/Published de SEQ-02.

## Interdit

Contrats, Prisma/migrations/seed, game-server/minigame, workers, tooling racine, routeur central et
`apps/web/src/services/rpcServices.ts`.

## Demarrage obligatoire

Lire AGENTS, gap analysis, sprint 13, workflows scoring/publication, UML, contrats Scoring et audit legacy
admin arbitrage. Context7 : ConnectRPC, TanStack Query et Prisma transactions.

## AC

- Admin liste les scores provisoires; joueur/observer ne les recoivent jamais.
- Correction exige raison, acteur, version/conflit et audit.
- Publication est idempotente, transitionne explicitement et fige une projection publiee.
- Deux admins concurrents obtiennent un resultat deterministe sans ecrasement silencieux.
- Results joueur devient visible uniquement apres publication; waiting reste explicite avant.

## Tests et sortie

L1 transitions, L3 correction/publication concurrentes, L4 Scoring/RBAC/no-leak, L5 admin publie puis
joueur voit resultats. Validations completes, commit atomique, matrice AC -> test; montage via SEQ-03.
