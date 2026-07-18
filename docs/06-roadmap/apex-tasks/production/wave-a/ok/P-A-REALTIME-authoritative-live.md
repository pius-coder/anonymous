# P-A-REALTIME - Live autoritaire, persistence et reconnexion

## Mission autonome

Livrer une room autoritaire multi-instance qui admet uniquement les acteurs eligibles, persiste les
commandes valides, reprend apres deconnexion/crash et filtre chaque projection sur le wire.

## Prerequis et lectures

- P-SEQ-00/02/03 merges.
- Lire realtime, reconnect, security, contracts Realtime, room courante et audit live legacy.
- Context7 : Colyseus auth/lifecycle/reconnect/testing/presence et Redis.

## Ownership

`apps/game-server/**`, use-cases RealtimeAccess, `apps/worker/src/jobs/roundDeadline*`, projection live
web commune et tests transport. Le runner worker central appartient a P-SEQ-04. Pas de regle d'un
mini-jeu specifique.

## Interdit

Contracts/DB, montage central, fallback offline en production, trust de position/timer/score client,
erreur persistence avalee, snapshot unique pour toutes audiences.

## Livrables production

- admission token court/usage controle, verification role/paiement/party/round;
- `GAME_WS_URL` unique, Origin/quotas/taille/frequence et configuration fail-fast;
- presence Redis configuree `noeviction`, room ownership et comportement multi-instance;
- commande validatee avant persistence, nonce/idempotence/deadline/sequence;
- reconnexion et redemarrage depuis DB/checkpoint, duree decidee et erreurs actionnables;
- readiness, SIGTERM/drain/dispose et metriques joins/drops/reconnect/late/duplicate;
- projections joueur/admin/observer/support distinctes et redaction wire/log.

## Criteres d'acceptation

- vrai client Colyseus authentifie rejoint, agit, deconnecte et reprend sans double effet;
- participant non paye, token revoque, origin interdit et commande tardive sont refuses;
- panne DB/Redis ne devient jamais succes silencieux;
- no-leak est prouve sur messages et patches bruts;
- plusieurs instances conservent admission/capacite/room ownership coherents.

## Tests et sortie

L3 PostgreSQL/Redis reels, L4 `@colyseus/testing` serveur/client, L5 navigateur live sans fallback,
reconnect/crash/no-leak/quotas. Gates lot, profil de charge initial et commit atomique.
