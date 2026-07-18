# Sprint 07 - Paiements wallet et ledger

## Objectif

Reconstruire le paiement d'acces et les mouvements wallet avec trace uniforme. Hors scope: distribution de
gains avant publication de resultats validee.

## User Stories Produit

| ID | Role | User story | Valeur produit | Priorite |
|---|---|---|---|---|
| US-07-01 | Joueur | En tant que joueur, je veux payer ma participation et verifier son statut, afin de savoir si je peux continuer. | Paiement clair et actionnable. | Must |
| US-07-02 | Finance | En tant que finance, je veux consulter le ledger et reconciler les paiements, afin de tracer chaque mouvement. | Finance auditable. | Must |
| US-07-03 | Admin | En tant qu'admin, je veux voir les blocages paiement sans modifier le ledger, afin de comprendre l'admission. | Admin informe mais non finance. | Should |
| US-07-04 | Worker/Systeme | En tant que systeme, je veux traiter webhooks et reconciliations sans doublon, afin de garder le ledger coherent. | Idempotence finance. | Must |

## Scenarios D'Acceptation Atomiques

| ID | Story | Surface | Given | When | Then | UML liee | Contrat/Test |
|---|---|---|---|---|---|---|---|
| AC-07-01 | US-07-01 | Paiement participation | Participation creee, montant valide | Le joueur clique `Payer maintenant` | Transaction provider `PENDING` creee | [data flow](../../03-architecture/uml/data-flow.md) | `InitiatePayment` |
| AC-07-02 | US-07-01 | Paiement participation | Solde suffisant | Le joueur clique `Payer avec wallet` | Transaction `WALLET` + debit ledger | [data flow](../../03-architecture/uml/data-flow.md) | `PayWithWallet` ledger |
| AC-07-03 | US-07-01 | Paiement participation | Solde insuffisant | Le joueur clique `Payer avec wallet` | Refus `INSUFFICIENT_FUNDS`, aucun debit | [permissions](../../03-architecture/uml/permissions.md) | Test rollback |
| AC-07-04 | US-07-01 | Statut paiement | Transaction existante | Le joueur clique `Verifier le paiement` | Statut public sans payload provider brut | [data flow](../../03-architecture/uml/data-flow.md) | `GetPaymentStatus` |
| AC-07-05 | US-07-02 | Ledger | Role finance | La finance clique `Voir le ledger` | Liste mouvements avec idempotency key | [permissions](../../03-architecture/uml/permissions.md) | `ListWalletLedger` RBAC |
| AC-07-06 | US-07-04 | Webhook provider | Webhook deja traite | Le systeme recoit `payment_confirmed` | Aucun double credit/debit | [data flow](../../03-architecture/uml/data-flow.md) | Test webhook replay |
| AC-07-07 | US-07-04 | Reconciliation | Statut provider divergent | Le systeme declenche `Reconciler le paiement` | Transaction corrigee/auditee | [data flow](../../03-architecture/uml/data-flow.md) | Test reconciliation |
| AC-07-08 | US-07-03 | Admin participant | Participant impaye | L'admin clique `Voir blocage paiement` | Blocage lisible, aucun bouton ledger | [permissions](../../03-architecture/uml/permissions.md) | No finance action |

## Sources Docs Obligatoires

- Produit: [use cases](../../01-product/use-cases.md), [actors](../../01-product/actors-and-permissions.md)
- UX: [screen states](../../02-ux/screen-state-matrix.md), [loading/error/reconnect](../../02-ux/loading-error-reconnection.md)
- Architecture/UML: [target architecture](../../03-architecture/target-architecture.md), [data flow](../../03-architecture/uml/data-flow.md), [permissions](../../03-architecture/uml/permissions.md)
- Couches: [persistence](../../04-layers/persistence.md), [application use cases](../../04-layers/application-use-cases.md), [observability](../../04-layers/observability.md)
- Workflow: [pipeline agentique](../../05-workflows/agentic-feature-pipeline.md), [database change](../../05-workflows/database-change.md)
- Tests: [strategie de test](../../05-workflows/test-strategy.md)

## Preuves Legacy

- Fapshi existait avec initiate/webhook/reconcile.
- Wallet et ledger existaient.
- Les audits ont identifie le risque de paiements wallet non visibles comme transactions.

## UML Concernee

- Lire [data flow](../../03-architecture/uml/data-flow.md) et [permissions](../../03-architecture/uml/permissions.md).
- Modifier si les flux finance touchent participation ou resultats.

## Pipeline Par Couche

- Web: etats paiement lisibles, aucune logique ledger.
- API/ConnectRPC: ports provider, wallet commands, reads finance.
- Game-server: aucun paiement ni wallet.
- Domaine: invariants transaction/ledger/idempotence.
- DB: `PaymentTransaction`, `Wallet`, `LedgerEntry`, indexes idempotence.
- Worker: webhook/reconciliation/retry.
- Notifications: recu/statut si provider decide.
- Observabilite: audit finance, correlation provider, redaction secrets.

## Contrats Protobuf Et ConnectRPC

`InitiatePayment`, `GetPaymentStatus`, `PayWithWallet`, `ListWalletLedger`, `ReconcilePayment`,
`PaymentStatusChanged`, erreurs `PAYMENT_ALREADY_DONE`, `INSUFFICIENT_FUNDS`, `PROVIDER_REJECTED`.

## Data

Tout paiement d'acces est une transaction. Tout debit/credit wallet produit un ledger avec cle
idempotence.

## UI States

Payment pending, confirmed, failed, retryable, wallet insufficient, reconciliation pending.

## Permissions

Finance lit et agit sur reconciliation. Joueur lit ses paiements. Admin ne modifie pas le ledger.

## Erreurs Observabilite

Webhook replay, amount mismatch, provider timeout, wallet frozen, logs sans secret provider.

## Tests Attendus

- Webhook replay.
- Montant verifie.
- Ledger balance alignee.
- Wallet frozen.
- Paiement deja fait.
- Reconciliation idempotente.

## Definition Of Done

- Toute entree payee est reliee a une transaction et, si wallet, a un ledger.
- Aucun score, round ou resultat ne depend directement du provider paiement.

## Interdictions Specifiques

- Ne pas coupler finance et gameplay.
- Ne pas publier de gains avant modele de resultats confirme.
