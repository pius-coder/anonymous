# P-A-PLAYER - Acquisition, capacite et parcours joueur reel

## Mission autonome

Livrer le parcours public/joueur depuis le catalogue jusqu'a l'admission payee, avec capacite atomique,
etats complets et aucune source `ui-data`/`player-data` sur le flux inclus.

## Prerequis et lectures

- P-SEQ-00/02/03 merges.
- Lire acquisition, participation, UX joueur, etats UI, audit production et concurrence.
- Context7 : Next.js, ConnectRPC, TanStack Query et Prisma transactions.

## Ownership

Use-cases Session/Participation, routes/composants `/`, `/parties`, participation, compte/tickets utiles,
adaptateurs de domaine et tests. Pas de paiement provider.

## Interdit

Contracts/DB, montage central, logique paiement, lobby/live et modules hardcodes. Ne pas reserver une
place par `count` puis `create` hors primitive atomique du repository.

## Livrables production

- catalogue/detail publies depuis la DB, pagination/cache/invalidation et fuseau explicite;
- reservation derniere place atomique, idempotente et expirante selon la regle produit;
- etats eligible/full/closed/already-registered/payment-required/cancelled;
- prix/devise/version de partie affiches depuis la source serveur autoritaire;
- parcours compte/tickets lie aux donnees reelles, loading/empty/error/stale/offline accessibles;
- analytics consentis et audit des commandes critiques.

## Criteres d'acceptation

- deux joueurs concurrents sur la derniere place produisent une seule admission;
- refresh/double-submit ne double pas participation ni reservation;
- un utilisateur non paye ne peut franchir les guards lobby/live;
- aucune page incluse n'importe les donnees hardcodees;
- mobile/clavier et annonces d'erreur respectent l'UX documentee.

## Tests et sortie

L3 concurrence/capacite, L4 RBAC/idempotence/pagination, L5 catalogue->reservation->checkout handoff et
annulation. Gates lot et commit atomique sans montage central.
