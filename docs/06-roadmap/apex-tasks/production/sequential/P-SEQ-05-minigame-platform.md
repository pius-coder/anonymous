# P-SEQ-05 - Plateforme runtime mini-jeux production

## Mission autonome

Construire la plateforme commune qui permet aux six jeux d'etre des plugins domaine versionnes, sans
logique de gameplay dans `GameRoom` et sans commande/payload arbitraire.

## Prerequis et lectures

- `P-SEQ-04` merge; contracts/DB production figes.
- Lire les six rulebooks, workflow mini-jeu, scoring, realtime, audience et assets.
- Context7 : Colyseus testing/reconnect et bibliotheques de validation effectivement retenues.

## Ownership exclusif

Registry/API publique du game engine, adapter commun game-server, MiniGameService, loader manifest,
rendering shell commun, telemetrie runtime et tests de plateforme. Aucun jeu specifique.

## Interdit

Switch central contenant les regles des six jeux, clock/random globaux non injectes, etat secret dans
la schema publique, persistence d'input avant validation ou score accepte du client.

## Livrables production

- interface runtime pure avec clock/random/seed/version injectes et replay deterministe;
- registry de manifests actifs/versionnes et validation de config au `configureRound`;
- cycle init/command/tick/checkpoint/restore/finalize et projections par audience;
- limits taille/frequence/nonce/ordre/deadline avant persistence;
- generation de preuve hashable et score provisoire, jamais publication directe;
- shell web joueur/readonly accessible et budgets assets;
- MiniGameService monte, diagnostics et metriques par runtime/version.

## Criteres d'acceptation

- une cle inconnue/desactivee ou config invalide est refusee avant la manche;
- crash/reconnect restaure depuis checkpoint sans rejouer deux fois un input;
- un client observer ou joueur malveillant ne recoit aucun payload prive;
- deux executions meme seed/commandes/version produisent le meme resultat;
- un runtime d'exemple minimal passe L1/L3/L4 mais n'est pas expose en production.
- la matrice atteint 12/12 services montes avec MiniGameService; aucun autre montage central ne change.

## Tests et sortie

Tests contractuels de plugin, determinisme, fuzz commandes, PostgreSQL checkpoint, vrai serveur/client
Colyseus, reconnect et no-leak wire. Gates packages/apps/racine et commit atomique de plateforme.
