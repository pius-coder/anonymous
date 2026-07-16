# A-PAYMENT - Paiement, wallet et finance

## Mission autonome

Apres SEQ-00/01/02, cabler les parcours paiement/wallet/finance aux use-cases et au PaymentService fige.
Le serveur reste source de verite pour montants, statuts, idempotence et ledger.

## Ownership

Use-cases et transport Payment, routes API paiement/finance du domaine, composants/routes web payment,
wallet et finance, tests correspondants.

## Interdit

Contrats, schema/migrations/seed, worker/reconciliation runner, tooling racine, routeur RPC central,
`apps/web/src/services/rpcServices.ts`, participation/lobby/scoring. Consommer les repositories publics
livres par SEQ-02 et creer un adaptateur Payment propre si la facade existante ne suffit pas.

## Demarrage obligatoire

Lire AGENTS, gap analysis, sprint 07, docs paiement/securite, contrats Payment, provider actuel et legacy.
Context7 : ConnectRPC, TanStack Query, Prisma transactions et SDK provider reel si utilise.

## AC

- Initiate/wallet pay utilisent cle d'idempotence et montant serveur.
- Webhook duplique ne double ni wallet ni ledger.
- Finance est read-only sauf commande de reconciliation autorisee et auditee.
- UI gere pending/success/failed/timeout/retry sans inventer le statut.
- Gains restent invisibles/non credites avant publication explicite.

## Tests et sortie

L3 transaction/concurrence/idempotence, L4 transport + RBAC/signature, L5 paiement et vues finance.
Executer validations completes du lot. Commit atomique et rapport; aucun montage central ni runner worker.
