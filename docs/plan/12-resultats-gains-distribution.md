# Feature 12 - Plan Scrum - Resultats, gains et distribution

## Objectif sprint

Finaliser une session, publier les resultats officiels et crediter les wallets de maniere idempotente.

## Dependances

- Feature 07 wallet/ledger.
- Feature 10 game-engine.

## User stories

### Story 12.1 - Schema resultats

Etapes :

1. Finaliser `GameResult`.
2. Finaliser `PrizeDistribution`.
3. Ajouter `CommissionRecord`.
4. Ajouter `DisputeWindow`.
5. Ajouter idempotency keys.

Tests :

- Distribution unique.
- Result immutable apres finalisation.

### Story 12.2 - Finalisation session

Etapes :

1. Creer `POST /v1/admin/sessions/:id/finalize`.
2. Verifier session terminable.
3. Charger resultats de rounds.
4. Calculer winners.
5. Calculer prize pool, commission, reliquat.
6. Passer session `FINISHED`.
7. Publier event distribution.

Tests :

- Finalize OK.
- Double finalize refuse/idempotent.
- Tie policy requise si egalite non resolue.

### Story 12.3 - Distribution credits

Etapes :

1. Creer worker `credits.distribute`.
2. Crediter chaque gagnant via wallet ledger.
3. Utiliser idempotency key par session/winner.
4. Reprendre apres crash.
5. Publier resultats.

Tests :

- Double job ne double pas credit.
- Crash au milieu reprend.
- Ledger complet.

### Story 12.4 - Consultation resultats

Etapes :

1. Creer `GET /v1/sessions/:id/results`.
2. Creer `GET /v1/admin/sessions/:id/results`.
3. Masquer donnees financieres non publiques.
4. Ajouter correction request.

Tests :

- Joueur voit recap autorise.
- Admin voit detail.
- Correction exige role + reason.

## Definition of Done

- Resultats officiels figes.
- Distribution idempotente.
- Wallet credite via ledger.
- Aucun cash-out V1.

