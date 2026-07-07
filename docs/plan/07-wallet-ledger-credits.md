# Feature 07 - Plan Scrum - Wallet, ledger et credits

## Objectif sprint

Gerer les credits internes non retirables en V1 avec ledger obligatoire, solde coherent et paiement wallet.

## Dependances

- Feature 02 auth.
- Feature 05 inscription.
- Feature 06 paiement.

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

- Aucune mutation sans ledger.
- Balance jamais negative.
- Wallet utilisable pour inscription.
- Retrait argent reel bloque.

