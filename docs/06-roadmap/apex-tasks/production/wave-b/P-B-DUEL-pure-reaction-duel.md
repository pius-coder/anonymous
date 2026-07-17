# P-B-DUEL - Pure Reaction Duel

## Mission autonome

Livrer `pure-reaction-duel` comme duel equitable, avec signal imprevisible et horodatage autoritaire;
aucune mesure competitive ne vient de `clickedAtMs` client.

## Prerequis et lectures

- P-SEQ-01 rulebook/fairness approuve, P-SEQ-05 merge.
- Lire runtime legacy pour ses erreurs, politique latence, contracts, scoring et accessibilite.
- Context7 : Colyseus clock/messages/testing et APIs navigateur de visibilite si utilisees.

## Ownership

Runtime/config/resolver duel, matchmaking de round, plugin, UI joueur/readonly, telemetrie fairness et
tests. Consommer les primitives serveur d'horodatage.

## Interdit

Contracts/DB/registry, timestamp ou reaction client comme verite, signal previsible, compensation RTT
non documentee, background tab ignore, signal exclusivement visuel/sonore.

## Livrables production

- appairage deterministe/juste, signal server-side aleatoire et commit/reveal si retenu;
- faux depart, clic valide, simultaneite, timeout, abandon/no-show et egalite;
- timestamp reception serveur monotone, mesure RTT/latence et politique fairness versionnee;
- checkpoint/reconnect qui ne redonne pas un signal ni avantage indu;
- score/evidence avec deltas serveur et indicateurs d'anomalie;
- UI clavier/tactile, signal multimodal et etats focus/onglet masque.

## Criteres d'acceptation

- falsifier `clickedAtMs`, rafaler ou predire le signal ne change pas le resultat legitime;
- deux joueurs voient le meme duel logique malgre latences controlees;
- faux depart/simultaneite/reconnect suivent exactement le rulebook;
- observer ne recoit aucun signal avant les joueurs ni donnee de latence privee;
- metriques detectent distributions anormales sans exposer PII.

## Tests et sortie

L1 fake clock/distributions/ties, L3 pairing/evidence, L4 deux clients avec latence/faux depart/reconnect,
L5 desktop+mobile et publication. Charge/fairness signee, gates lot et commit atomique.
