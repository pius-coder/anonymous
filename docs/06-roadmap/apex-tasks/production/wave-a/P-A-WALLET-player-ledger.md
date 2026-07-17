# P-A-WALLET - Wallet et historique joueur

## Mission autonome

Livrer au joueur un solde autoritaire, un historique comprehensible et le paiement wallet d'une
participation, sans pouvoir modifier un ledger ni voir les donnees d'un autre compte.

## Prerequis et lectures

- P-A-FAPSHI collecte verte; P-SEQ-03 merge.
- Lire wallet/ledger, parcours joueur, payment contracts, gains/publication, privacy et RBAC.
- Context7 : ConnectRPC, Next.js et Prisma transactions via repositories figes.

## Ownership

Use-cases wallet scopes joueur, routes/composants `/me/wallet` et paiement wallet, adaptateurs domaine
et tests. Les operations privilegiees, payouts et reconciliation appartiennent a P-A-FINANCE.

## Interdit

Contracts/DB, montage central, ecriture directe de solde, donnee `finance-data`, gain provisoire,
transaction d'un autre joueur ou conversion implicite d'un paiement Fapshi ambigu.

## Livrables production

- balance derivee du ledger, historique pagine et libelles/statuts/version de devise;
- credit Fapshi confirme et paiement wallet participation atomique/idempotent;
- reservation/insufficient funds/double-submit/expiration et compensation selon regle signee;
- gains visibles et disponibles seulement apres publication;
- detail transaction joueur redige, export autorise et etats loading/empty/error/stale;
- metriques mismatch balance/ledger et audit des commandes.

## Criteres d'acceptation

- deux paiements wallet concurrents ne depensent pas deux fois le meme solde;
- refresh/retry ne double ni debit, ni credit, ni admission;
- joueur A ne lit ni n'agit sur wallet B;
- solde affiche concorde avec le ledger et la reconciliation finance;
- aucun gain provisoire ou statut provider non confirme n'est disponible.

## Tests et sortie

L1 politiques/erreurs, L3 transaction/concurrence/ledger, L4 RBAC/idempotence, L5 Fapshi->wallet->
participation et historique joueur. Gates lot et commit atomique.
