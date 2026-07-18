# P-B-SURVIVAL - Danger Sweep

## Mission autonome

Livrer `danger-sweep` comme survie collective temps reel avec simulation spatiale, collision,
elimination et timer entierement autoritaires.

## Prerequis et lectures

- P-SEQ-01 rulebook/lag policy approuve, P-SEQ-05 merge.
- Lire spatial engine courant, resolver legacy non fiable, realtime, charge et accessibilite.
- Context7 : Colyseus simulation/patch rate et moteur de rendu utilise.

## Ownership

Runtime/config/resolver survie, simulation/adaptation spatiale, UI joueur/readonly, assets, telemetrie de
tick et tests de charge du jeu.

## Interdit

Contracts/DB/registry, coordonnees/collision/elimination client comme verite, mouvement au-dela des
limites serveur, respawn improvise, reconnect donnant une nouvelle vie ou tick non borne.

## Livrables production

- arene/version, rayon trajectoire/vitesse, mouvement/collision et elimination serveur;
- inputs directionnels limites, simulation fixe/deterministe et politique de latence;
- checkpoint spatial et reconnect actif/elimine conforme au rulebook;
- score duree/survie/tie-break/evidence sans calcul client;
- renderer tactile/clavier, alternatives reduced motion et signaux non seulement couleur;
- metriques tick, patch size, late input, collision, CPU/memoire et capacite par room.

## Criteres d'acceptation

- payload `x/y`, teleport, vitesse excessive et input tardif ne modifient pas la verite serveur;
- meme seed/inputs/ticks reproduit eliminations et score;
- reconnect ne ressuscite pas un elimine et ne duplique pas la presence;
- charge cible conserve tick/latence dans le budget signe;
- observer recoit seulement la projection publique au rythme borne.

## Tests et sortie

L1 simulation/fuzz/collision, L3 checkpoint/evidence, L4 clients malveillants/reconnect, L5 tactile+
clavier/publication, charge/soak specifique. Profil et seuils signes, gates lot, commit atomique.
