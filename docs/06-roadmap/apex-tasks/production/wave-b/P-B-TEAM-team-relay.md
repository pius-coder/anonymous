# P-B-TEAM - Team Relay

## Mission autonome

Livrer `team-relay` pour equipes de 3 a 4 joueurs choisies mutuellement, avec ordre de relais et membre
autorise imposes par le serveur.

## Prerequis et lectures

- P-SEQ-01 rulebook/equipe approuve, P-SEQ-05 merge.
- Lire legacy team-relay, participation/equipe, scoring/gains, reconnect et audience.
- Context7 : Colyseus et renderer web utilise.

## Ownership

Runtime/config/resolver equipe, formation/acceptation, plugin, UI equipe/readonly, telemetrie et tests.

## Interdit

Contracts/DB/registry, equipes rouge/verte par parite, membre quelconque sur n'importe quelle etape,
progression client, equipe incomplete acceptee hors regle ou fuite de commande coequipier.

## Livrables production

- invitation/acceptation mutuelle et verrouillage d'equipe 3-4;
- sequence d'etapes, membre actif, handoff, timeout, absence et substitution decidee;
- validation serveur action/ordre/membre/nonce/deadline et checkpoint collectif;
- score collectif, tie-break, gains individuels et evidence versionnee;
- UI roster/etape/membre actif avec clavier/tactile et annonces accessibles;
- observer public sans strategie/inputs prives et metriques bottleneck/abandon.

## Criteres d'acceptation

- aucun joueur ne rejoint une equipe sans consentement requis;
- mauvais membre, etape sautee, duplicate ou late input est refuse sans progression;
- reconnect d'un membre conserve equipe/ordre et ne bloque pas indefiniment;
- equipe incomplete/no-show suit la regle signee;
- publication/gains concordent pour tous les membres.

## Tests et sortie

L1 formation/relais/ties, L3 concurrence/checkpoint/evidence, L4 2 equipes/reconnect/no-leak, L5 admin+
6-8 joueurs+observer sur desktop/mobile. Gates lot et commit atomique.
