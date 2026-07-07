# Feature 07 - Plan Scrum - Wallet, ledger et credits

## Objectif sprint

Gerer les credits internes non retirables en V1 avec ledger obligatoire, solde coherent et paiement wallet.

## Dependances

- Feature 02 auth.
- Feature 05 inscription.
- Feature 06 paiement.

## Gate documentaire obligatoire

Avant implementation :

1. Lire via Context7 Prisma pour transactions interactives et isolation.
2. Lire la documentation PostgreSQL sur `Serializable` et retries.
3. Lire via Context7 Hono pour routes securisees et validation.
4. Lire OWASP Business Logic/Authorization pour features qui distribuent de la valeur.
5. Documenter le pattern exact `read balance -> verify -> ledger -> update wallet` avant de coder.

## User stories

### Story 7.1 - Schema wallet/ledger

Etapes :

1. Finaliser `Wallet`.
2. Finaliser `LedgerEntry`.
3. Ajouter `direction`, `type`, `amountXaf`, `balanceAfterXaf`, `referenceType`, `referenceId`, `idempotencyKey`.
4. Ajouter contrainte unique `idempotencyKey`.
5. Interdire solde negatif par logique transactionnelle.

Tests :

- Ledger unique.
- Balance recomputable.

### Story 7.2 - Lecture wallet

Etapes :

1. Creer `GET /v1/wallet/me`.
2. Creer `GET /v1/wallet/me/ledger`.
3. Filtrer par utilisateur connecte.
4. Paginer ledger.

Tests :

- Joueur lit son wallet.
- Autre wallet inaccessible.
- Pagination.

### Story 7.3 - Paiement inscription par wallet

Etapes :

1. Creer `POST /v1/registrations/:id/pay-with-wallet`.
2. Verifier ownership.
3. Verifier solde.
4. Transaction : debit wallet + ledger + registration PAID.
5. Idempotency key obligatoire.

Tests :

- Debit OK.
- Fonds insuffisants refuse.
- Double submit ne double pas debit.
- Registration PAID atomique.

### Story 7.4 - Ajustement admin

Etapes :

1. Creer `POST /v1/admin/wallets/:userId/adjust`.
2. Exiger role finance/super admin.
3. Exiger reason.
4. Ecrire ledger + audit.
5. Bloquer retrait argent reel en V1.

Tests :

- Reason obligatoire.
- Role insuffisant refuse.
- Withdrawal disabled.

## Definition of Done

- Criteres de tests a valider :
  - Tests unitaires calcul balance depuis ledger.
  - Tests integration lecture wallet/ledger.
  - Tests transaction debit wallet + registration PAID.
  - Tests concurrence double debit.
  - Tests idempotence `idempotencyKey`.
  - Tests securite : autre wallet inaccessible.
  - Test retrait argent reel bloque.
- Aucune mutation sans ledger.
- Balance jamais negative.
- Wallet utilisable pour inscription.
- Retrait argent reel bloque.
