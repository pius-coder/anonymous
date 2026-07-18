# P-A-FINANCE - Admission payee, reconciliation et operations financieres

## Mission autonome

Relier la verite Fapshi au siege, au wallet et au ledger, puis livrer reconciliation, expiration,
compensation/remboursement et payout selon des commandes finance separees, idempotentes et auditees.

## Prerequis et lectures

- P-A-FAPSHI vert; P-SEQ-03 merge.
- Lire politiques finance, paiement/admission, scoring/gains, audit et regles metier approuvees.
- Documentation Fapshi officielle payout/expire/status, recherche transactions et solde service;
  Context7 Prisma/BullMQ.

## Ownership

Use-cases finance/admission, `apps/worker/src/jobs/paymentReconciliation*`, `/finance/**`,
`/admin/payments`, `/admin/wallets`, ledger et tests. La collecte consomme P-A-FAPSHI. Le payout utilise
un service Fapshi distinct, active separement, avec son propre `apiuser`/`apikey`, secret, rotation,
solde et rapprochement.

## Interdit

Contracts/DB, ADMIN autorise a `MANAGE_PAYMENTS`, solde modifie sans ledger, payout automatique depuis
un score provisoire, remboursement par suppression et statut provider invente.

## Livrables production

- transition atomique paiement confirme -> participation PAID/admissible;
- reconciliation periodique avec pagination, retry, DLQ et alerte mismatch;
- decision signee : compensation via payout, procedure manuelle ou hors scope; Fapshi n'expose pas
  d'endpoint refund natif;
- commandes expire/compensation/payout avec maker-checker, MFA/step-up, beneficiaire verifie,
  idempotence, limites de velocite et holds fraude;
- gains seulement apres publication et ledger double-entree/compensation selon modele retenu;
- UI finance transactions/detail/mismatches/actions/reasons sans mock;
- rapprochement journalier transactions/frais/revenue/solde service/ledger/participations/decaissements;
- exports et audit resultat/statut obligatoire.

## Criteres d'acceptation

- aucun impaye n'entre, aucun double webhook/retry ne double le credit;
- montant/devise/party/participation/provider sont reconciliables de bout en bout;
- ADMIN et SUPPORT sont refuses; FINANCE seule execute les commandes autorisees;
- crash entre provider et DB est recuperable sans nouvelle operation financiere non voulue;
- compensation/payout reussis, refuses et ambigus ont un etat actionnable;
- collecte et payout restent deux frontieres de credentials et de privileges impossibles a confondre.

## Tests et sortie

L3 transactions/concurrence/ledger, L4 RBAC/provider status, L5 joueur+finance, sandbox Fapshi pour les
operations activees. Gates lot, rapport comptable de test et commit atomique.
