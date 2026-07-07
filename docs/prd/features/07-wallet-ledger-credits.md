# Feature 07 - Wallet interne, ledger et credits

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Gerer les credits internes non retirables en V1, tracer tous les mouvements financiers et payer de futures sessions via wallet.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Garantir un historique financier auditables, des soldes coherents et une reutilisation interne des gains sans retrait argent reel non valide juridiquement. |
| Target users | joueurs, support, finance |
| Business value | Tres elevee: retention, reutilisation des gains et confiance financiere. |
| Technical complexity | Tres elevee: toute mutation de solde doit etre transactionnelle, idempotente, auditable et reconstructible depuis le ledger. |
| Risk level | Tres eleve: erreurs de solde, fraude, litiges, qualification juridique wallet/retraits. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Wallet balance comme cache controle.
- LedgerEntry comme source d historique financier.
- Paiement inscription par wallet.
- Credit de gains internes.
- Ajustement admin avec reason/audit.
- Retrait argent reel bloque en V1.

## Parcours et workflows

1. Credit prize: resultats finalises -> distribution idempotente -> LedgerEntry CREDIT + wallet.balance update.
2. Pay registration: read balance -> verify >= amount -> LedgerEntry DEBIT + inscription PAID dans transaction.
3. Admin adjustment: role finance/admin + reason -> before/after -> audit.
4. Recompute: verifier wallet.balance = somme credits - debits posted.

## Logiques metier et invariants

- Aucun solde ne change sans LedgerEntry.
- balanceXaf n est qu un cache, pas l historique.
- Mouvements financiers transactionnels.
- Wallet V1 = credit interne utilisable pour payer d autres sessions.
- Retraits argent reel exclus ou bloques tant que non valides juridiquement.
- Ajustements admin avec reason, before, after et AuditLog.
- Solde jamais negatif.

## Donnees principales

- `Wallet`
- `LedgerEntry`
- `WalletHold`
- `WalletTransaction`
- `AdminAdjustment`
- `AuditLog`
- `idempotencyKey`

## API et contrats

- `GET /v1/wallet/me`
- `GET /v1/wallet/me/ledger`
- `POST /v1/registrations/:id/pay-with-wallet`
- `POST /v1/admin/wallets/:userId/adjust`

Erreurs et cas limites a normaliser :

- `409_INSUFFICIENT_FUNDS`
- `409_WALLET_FROZEN`
- `409_LEDGER_DUPLICATE`
- `403_WITHDRAWALS_DISABLED`
- `403_FINANCE_ROLE_REQUIRED`

## Evenements et jobs

- `wallet.credited`
- `wallet.debited`
- `wallet.hold-created`
- `wallet.hold-released`
- `wallet.adjusted`

## Securite, conformite et audit

- Interactive transaction + Serializable/OCC pour debit.
- Idempotency key obligatoire pour credits/debits.
- Pas de mutation directe de balance sans ledger.
- Audit admin obligatoire.
- Retraits argent reel desactives en V1.

## Criteres d acceptation

- Aucune mutation balance sans LedgerEntry.
- Double debit concurrent impossible.
- Debit wallet et inscription PAID atomiques.
- Balance recomputee depuis ledger egale cache.
- Adjustment admin sans reason refuse.
- Withdrawal endpoint absent ou retourne WITHDRAWALS_DISABLED.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `wallet_credit_count`
- `wallet_debit_count`
- `ledger_mismatch_count`
- `negative_balance_attempt_count`
- `admin_adjustment_count`
- `duplicate_ledger_prevented_count`

## Dependances fonctionnelles

- Feature 06 paiement
- Feature 05 inscription
- Feature 12 resultats/distribution
- Feature 13 finance/admin
- Feature 15 conformite

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- BRAINSTORMING.md WalletTransactionType et ledger obligatoire
- PRD_PHASE_1.md retrait bloque sans avis legal
- deep-research-report.md wallet interne non retirable
- Prisma interactive transactions
- PostgreSQL isolation

References officielles techniques :

- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt
- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt
- PostgreSQL transaction isolation and retry expectations: https://www.postgresql.org/docs/current/transaction-iso.html
- OWASP Authorization / API Security / Business Logic / Logging guidance: https://cheatsheetseries.owasp.org/

## Questions ouvertes

- Qualification juridique exacte du credit interne.
- Nom public du wallet.
- Politique refund/credit si session annulee.
- Retraits argent reel post-V1: conditions legales.
