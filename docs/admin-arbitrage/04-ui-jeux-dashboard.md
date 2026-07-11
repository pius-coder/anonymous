# Contrat UI - Jeux, dashboard admin et arbitrage

## Principe UI

L'UI ne doit pas masquer la complexite metier. Elle doit la rendre lisible, actionnable et sure.

Le premier ecran admin d'une session live n'est pas une page marketing ni un tableau statique. C'est un cockpit dense :

- phase ;
- round courant ;
- sante serveur ;
- controle admin ;
- joueurs ;
- incidents ;
- resultats ;
- journal ;
- actions autorisees ;
- raisons de blocage.

## Layout dashboard principal

```text
SESSION K7P4-X2 | ROUND 6/10 | EN REVISION | Version 184 | Serveur stable
Controle : Admin A - Arbitre principal
Connecte : Admin B - Revision        [TRANSFERER] [PAUSE URGENCE]

Navigation        Match en direct                      Centre arbitrage
Session           Jeu : Zones qui retrecissent          2 incidents ouverts
Joueurs           Phase 4/6                             #184 Latence anormale
Groupes           41 joueurs actifs                     #185 Action rejetee
Direct            30 places restantes                   [OUVRIR REVISION]
Incidents
Revisions
Resultats
Journal
Reglement

Feuille de match : SIGNAL | INPUT | ELIMINATION | ALERT | DECISION
```

## Header live

Doit afficher :

- code session ;
- nom session ;
- statut session ;
- phase live ;
- round courant ;
- statut resultat ;
- sessionVersion ;
- rulesVersion ;
- admin control lease ;
- sante room/DB/Redis/queue/event log ;
- nombre incidents ouverts ;
- action primaire disponible ou raison de blocage.

## Actions

Chaque action sensible a :

- bouton clair ;
- etat disabled si preconditions non remplies ;
- raison de blocage visible ;
- confirmation ;
- `reason` obligatoire ;
- impact explique ;
- resultat action toast + refresh ;
- audit.

Interdictions copy :

- "Forcer live"
- "Forcer round"
- "Modifier score" sans workflow
- "Reveler roles" sans avertissement critique

Copies recommandees :

- "Autoriser le demarrage"
- "Demarrer le prochain round"
- "Mettre en pause"
- "Reprendre apres verification"
- "Ouvrir une revision"
- "Confirmer le resultat provisoire"
- "Publier la version officielle"

## Vue Admin A

Admin A voit :

- commandes de phase ;
- statut lease ;
- decisions en attente ;
- resultats provisoires ;
- publication ;
- transferts de controle ;
- alertes critiques.

Admin A ne doit pas etre surcharge par tous les logs bruts. Il doit voir les decisions et blocages.

## Vue Admin B

Admin B voit :

- incidents ;
- preuves ;
- players monitor ;
- latence/anomalies ;
- chat/support ;
- dossiers de revision ;
- recommandations ;
- approbations critiques.

Admin B ne lance pas normalement les transitions de phase sans prise de controle officielle.

## Vue Support

Support voit :

- joueur ;
- connexion ;
- paiement visible sans secrets ;
- registration ;
- tickets ;
- messages techniques autorises.

Support ne voit pas :

- controles gameplay ;
- secrets provider ;
- roles caches ;
- actions de resultat.

## Player monitor

Colonnes minimales :

```text
displayName
registrationStatus
paymentStatus
readyStatus
roomStatus
connectionStatus
lastSeenAt
reconnectUntil
currentRoundStatus
submittedAction
submissionAt
latencyMedianMs
jitterMs
antiCheatFlags
teamId
duelId
qualificationStatus
appealStatus
supportTicketStatus
```

## Round timeline

Chaque round affiche :

- numero ;
- mini-jeu ;
- famille ;
- profil d'arbitrage ;
- rulesVersion ;
- participants prevus ;
- participants reels ;
- phase ;
- deadline ;
- resultStatus ;
- incidents ;
- evidence summary ;
- action suivante.

## Panels par famille

### Solo Panel

UI joueur :

- consigne courte ;
- timer serveur ;
- etat soumis/non soumis ;
- feedback minimal ;
- resultat provisoire/officiel separe.

UI admin :

- score/temps/progression ;
- assets loaded ;
- input rate ;
- anomalies ;
- tie-break ;
- option rejeu individuel uniquement si autorisee.

### Duel Panel

UI joueur :

- adversaire ;
- statut pret ;
- choix scelle si secret ;
- timeout ;
- resultat manche.

UI admin :

- duel cards ;
- choix recus non reveles ;
- interruption ;
- forfait technique ;
- sudden death ;
- decision par duel.

### Alliance Panel

UI joueur :

- partenaire ;
- objectif commun ;
- canal autorise ;
- choix/actions scelles si requis.

UI admin :

- canaux actifs ;
- distribution infos privees oui/non ;
- submissions ;
- ressources uniques ;
- pas d'arbitrage de trahison normale.

### Equipe Panel

UI joueur :

- equipe ;
- role eventuel ;
- progression collective ;
- vote/quorum si applicable.

UI admin :

- teamResult ;
- individualContribution ;
- votes ;
- leader ;
- repartition ;
- contraintes.

### Survie Panel

UI joueur :

- zone/carte lisible ;
- danger previsible selon regle ;
- statut survivant/elimine ;
- spectateur apres elimination.

UI admin :

- vagues ;
- survivants ;
- eliminations confirmees ;
- latence inhabituelle ;
- snapshots ;
- incident collectif.

### Role cache Panel

UI joueur :

- role prive seulement si concerne ;
- consignes publiques/privees separees ;
- vote secret ;
- resultat post-revelation selon policy.

UI admin :

- roles distribues oui/non ;
- actions secretes nombre ;
- votes ouverts/fermes ;
- anomalies ;
- secrets masques par defaut.

## Ecran revision

```text
INCIDENT #185 - JOUEUR #42

Decision initiale :
Elimination pour absence de case.

Regle :
5.2 / Occupation / Premier input officiel.

Elements :
- demande de deplacement recue
- action recue avant cloture
- action appliquee apres cloture
- retard serveur confirme : 184 ms
- aucun defaut connexion joueur

Resultat recalcule :
Le joueur devait occuper la case 14.

Recommandation Admin B :
CORRECT - reintegrer le joueur.

[REFUSER] [DEMANDER COMPLEMENT] [PROPOSER CORRECTION]
```

## Etats joueur

Avant live :

- "Paiement confirme"
- "Je suis pret"
- "En attente du demarrage"
- "Reste connecte"

Pendant pause :

- "Pause technique"
- "La session reprend apres verification"
- "Ne ferme pas la page"

Avant arbitrage :

- "Resultat provisoire"
- "Qualification en attente de confirmation"

Apres confirmation :

- "Resultat officiel"
- "Decision confirmee a HH:mm"

Apres correction :

- "Resultat corrige"
- "Une erreur technique a ete confirmee"

## Accessibilite et appareils

Chaque jeu doit declarer :

- orientation ;
- audio obligatoire ou alternative ;
- taille minimale hitbox ;
- support daltonisme ;
- contraintes FPS ;
- mode tactile ;
- test pre-round si permission requise.

Un joueur ne doit pas entrer dans un round si son appareil ne satisfait pas une contrainte bloquante connue.
