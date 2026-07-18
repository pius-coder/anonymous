# P-A-ADMIN - Command center et arbitrage production

## Mission autonome

Remplacer les shells admin par un command center reel couvrant creation/configuration de partie,
preparation, annonce, lancement manuel, supervision, pause/reprise, arbitrage et fin.

## Prerequis et lectures

- P-SEQ-00/02/03 merges.
- Lire admin arbitration legacy, workflow partie/round, UX admin, RBAC, audit et contrats Admin.
- Context7 : Next.js, ConnectRPC et gestion d'etat retenue.

## Ownership

Use-cases Admin, UI `/admin`, `/admin/parties/**` et `/admin/minigames`, timeline/audit de commande et
tests. Les routes admin paiements/wallets, scores, compliance/audit/incidents restent aux lots Finance,
Scoring et Support. Consommer Preparation/Payment/Realtime/Scoring par leurs API publiques.

## Interdit

Contracts/DB, montage central, controle direct du client joueur, demarrage automatique par timer,
mutation finance, score publie sans commande distincte ou donnees hardcodees.

## Livrables production

- creation/edition/publish/cancel avec fee, capacite et planning; la selection des six manifests est
  composee et prouvee par P-SEQ-06;
- lobby presence/ready/absent, annonces separees et confirmation explicite;
- lease/version optimiste des commandes sensibles et conflits multi-admin visibles;
- lancement/pause/reprise/abandon/round suivant/fin selon machine d'etat;
- supervision globale/individuelle readonly, motifs et audit resultat/statut;
- loading/empty/error/stale/reconnect et mode degradable sans inventer l'etat.

## Criteres d'acceptation

- aucune horloge/job ne lance une partie active;
- deux admins concurrents n'ecrasent pas silencieusement une commande;
- chaque action refusee explique precondition/permission sans fuite;
- joueur/observer ne peuvent appeler une commande admin;
- les pages incluses n'emploient aucune donnee hardcodee.

## Tests et sortie

L1 machine/RBAC, L3 version/lease/audit, L4 AdminService, L5 deux admins + joueurs. Gates lot, commit
atomique et runbook d'arbitrage.
