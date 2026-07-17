# P-A-PREPARATION - Lobby social et readiness

## Mission autonome

Livrer le lobby joueur/admin avant match : presence, ready, annonces, scene sociale 2D, groupes,
invitations et communication moderee, sans demarrage automatique de la partie.

## Prerequis et lectures

- P-SEQ-00/02/03 merges.
- Lire preparation, annonces, UX lobby/room sociale, roles, notifications, realtime et moderation.
- Context7 : Colyseus et renderer/chat provider reellement retenus.

## Ownership

Use-cases Preparation joueur, projection lobby, routes/composants lobby et room sociale, modules worker
`roundDeadline*` exclus, moderation sociale et tests. L'admin consomme ces exports via P-A-ADMIN.

## Interdit

Contracts/DB, montage central, paiement/admission, gameplay mini-jeu, lancement par timer, controle direct
du client joueur, chat non modere ou donnees hardcodees.

## Livrables production

- join/leave/presence/ready/absent raisonnes et reprise multi-device;
- annonces avant-match separees de la selection/lancement du mini-jeu;
- scene sociale 2D autoritaire pour mouvement utile, groupes/invitations et limites d'abus;
- communication integree seulement avec signalement, blocage, moderation, retention et acces support;
- guard paiement/eligibilite/capacite avant admission;
- UI tactile/clavier/reduced motion, loading/error/reconnect et annonces accessibles;
- notification intents publics, sans posseder templates ni delivery.

## Criteres d'acceptation

- joueur non paye ou revoque ne rejoint pas le lobby;
- refresh/reconnect conserve presence/ready/groupe sans doublon;
- timer/rappel n'active jamais la partie;
- groupe, invitation, message et signalement respectent RBAC/rate limits/moderation;
- admin voit les absents et confirme explicitement avant lancement.

## Tests et sortie

L1 transitions/moderation, L3 presence/groupe/concurrence, L4 transport multi-client, L5 admin+joueurs
mobile/clavier avec reconnect et signalement. Gates lot et commit atomique sans montage central.
