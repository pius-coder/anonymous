# P-SEQ-03 - Modele de donnees production et migrations sures

## Mission autonome

Fournir le modele transactionnel et les repositories necessaires aux features commerciales, aux six
jeux, a l'audit et a l'exploitation, avec migration forward/rollback documentee et seed interdit en prod.

## Prerequis et lectures

- `P-SEQ-02` merge.
- Lire schema/repositories courants, audit production, contraintes finance, retention et test strategy.
- Lire les modeles Fapshi legacy comme preuve forensique, sans les copier automatiquement.
- Context7 : Prisma et PostgreSQL transactions/locking/indexes.

## Ownership exclusif

`packages/db/prisma/schema.prisma`, migrations, repositories publics, harness PostgreSQL et seed.

## Interdit

Use-cases, transports, UI, worker ou runtime. Aucun statut financier libre. Aucun seed production avec
mot de passe/token connu ou affichage de credential.

## Livrables production

- Party fee/currency/version; lien atomique participation-paiement-admission;
- IDs Fapshi `transId`/`externalId`, inbox webhook idempotente, checkout, expiration, settlement,
  collection/payout/compensation et ledger compensatoire; collection et payout utilisent deux services
  et credentials distincts;
- classification et chiffrement au repos des roles, votes, sequences, checkpoints et preuves, avec
  gestion de cles, acces support, rotation et purge;
- contrainte de capacite/concurrence et claims transactionnels notification/job;
- manifests/configs/runtime versions, checkpoints, assignations equipe/binome/role et preuves de score;
- incidents, compliance, audit resultat/statut, consentement versionne et politiques de retention;
- migrations DB vide + upgrade depuis baseline, expand/contract, index/constraint et rollback documente;
- seed test idempotent/concurrent et garde-fou bloquant en environnement production.

## Criteres d'acceptation

- deux admissions pour la derniere place n'en valident qu'une;
- webhook/reconciliation/retry ne doublent ni paiement, ni gain, ni notification;
- une publication de score, ses gains et son audit sont atomiques ou compensables;
- une room redemarree peut reconstruire le jeu sans exposer les secrets;
- restore/migration peuvent verifier les contraintes sur PostgreSQL reel.

Toute evolution decouverte apres freeze revient dans un nouveau passage P-SEQ-03, produit une migration
additive/expand-contract et force la revalidation des lots descendants; aucune branche metier ne change
directement le schema.

## Tests et sortie

L3 PostgreSQL : migrations, rollback/upgrade, concurrence, idempotence, claims, retention et double seed
parallele. Gates DB/racine completes. Commit atomique avec note de migration et aucun montage applicatif.
