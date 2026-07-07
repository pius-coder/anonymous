# Catalogue de mini-jeux — 120 jeux de production

Ce document couvre les 6 familles de rounds définies pour la session de jeu : **Solo**, **Duel 1v1**, **Alliance forcée (binôme)**, **Équipe libre**, **Survie collective**, **Rôle caché**. Chaque famille contient 20 jeux entièrement pensés : concept, déroulement, paramètres de configuration, condition de résolution/victoire, et note technique d'implémentation (état de room, timers, anti-triche).

Convention commune à tous les jeux :
- Tous les timers sont **calculés côté serveur** (le client ne fait qu'afficher), pour éviter la triche par manipulation du temps local.
- `winnersCount` (nombre de gagnants par round) est un paramètre externe au jeu lui-même — chaque fiche indique juste comment le jeu produit un **classement** ou un **statut qualifié/éliminé**, que la couche session applique ensuite selon `winnersCount`.
- "Room" fait référence à une room Colyseus dédiée à l'instance du mini-jeu.

---

## 1. Rounds Solo (test QI / réflexe)

Chaque joueur affronte uniquement le chrono et sa propre performance. Pas d'interaction sociale, classement par score et/ou temps.

### 1.1 Séquence mémoire
**Concept** : Simon-like — une suite de couleurs/formes s'affiche, le joueur la reproduit dans l'ordre.
**Déroulement** : Le serveur génère une séquence aléatoire (longueur initiale 3). Elle est diffusée en lecture seule (délai fixe par élément, ex: 600ms). Le joueur reproduit via clics. Si correct, une manche supplémentaire s'ajoute (+1 élément) ; sinon élimination immédiate.
**Paramètres** : longueur initiale, incrément par manche, vitesse d'affichage, nombre max de manches.
**Résolution** : classement par nombre de manches réussies ; en cas d'égalité, temps de réaction moyen sur les bonnes réponses.
**Note technique** : séquence générée et stockée server-side (seed non transmise) ; seule la validation manche par manche est envoyée au client pour empêcher la lecture du code source.

### 1.2 Calcul rapide
**Concept** : série de calculs simples affichés un par un.
**Déroulement** : Room envoie une opération (ex: `47 + 18`), le joueur saisit la réponse avant expiration du délai (ex: 5s). Bonne réponse = point + question suivante immédiate ; mauvaise ou timeout = pas de point mais round continue jusqu'à la fin du temps global.
**Paramètres** : durée totale du round, plage de difficulté des opérations, délai par question.
**Résolution** : classement par nombre de bonnes réponses ; tie-break par temps de réponse cumulé.
**Note technique** : questions générées server-side à la volée, jamais préchargées côté client en liste complète (évite l'inspection du DOM/state pour anticiper).

### 1.3 L'intrus
**Concept** : grille d'images quasi identiques, une seule différente à repérer.
**Déroulement** : génération d'une grille (ex: 6x6) avec un motif de base répété et une case modifiée (couleur/rotation/détail). Le joueur clique la case intruse. Bonne réponse = grille suivante plus difficile (différence plus subtile) ; erreur = pénalité de temps (ex: +2s ajoutées au chrono).
**Paramètres** : taille de grille, nombre de niveaux, subtilité de la différence par niveau, pénalité d'erreur.
**Résolution** : classement par niveau atteint dans le temps imparti, puis temps total si égalité.
**Note technique** : grilles précalculées côté serveur sous forme de coordonnées + attribut modifié, rendues côté client en CSS/canvas.

### 1.4 Réaction pure
**Concept** : cliquer dès qu'un signal apparaît, sans anticiper.
**Déroulement** : après un délai aléatoire (2-6s), un signal visuel/sonore apparaît. Le joueur clique. Clic avant le signal = faute (élimination ou pénalité selon config). Le temps de réaction est mesuré au ms près.
**Paramètres** : nombre de manches, plage du délai aléatoire, pénalité de faux départ (élimination stricte ou +500ms de pénalité).
**Résolution** : classement par temps de réaction moyen sur les manches valides.
**Note technique** : le déclenchement du signal est timestampé côté serveur ; le clic client envoie son propre timestamp, la latence réseau moyenne du joueur est soustraite (mesurée en amont via ping) pour équité.

### 1.5 Tri rapide
**Concept** : trier des objets qui apparaissent dans la bonne catégorie avant qu'ils n'atteignent le bas de l'écran.
**Déroulement** : des objets tombent un par un (ex: fruits vs légumes), le joueur doit les glisser/cliquer vers la bonne zone avant qu'ils sortent de l'écran. Vitesse de chute augmente progressivement.
**Paramètres** : vitesse initiale, accélération, nombre de catégories, durée totale.
**Résolution** : classement par score net (bons tris − erreurs − objets manqués).
**Note technique** : logique de spawn et de scoring gérée côté serveur à intervalle fixe, le client ne fait que rendre et transmettre l'action.

### 1.6 Mémoire de grille
**Concept** : mémoriser un motif affiché sur une grille puis le reproduire après disparition.
**Déroulement** : une grille (ex: 4x4) affiche N cases allumées pendant 2s, puis s'éteint. Le joueur doit recliquer exactement les mêmes cases. Bonne reproduction = complexité +1 case à la manche suivante.
**Paramètres** : taille de grille, temps d'affichage, incrément de complexité, nombre max de manches.
**Résolution** : classement par nombre de manches réussies, tie-break par précision moyenne (cases correctes/total).
**Note technique** : pattern généré et vérifié server-side, aucune info sur le pattern n'est renvoyée avant validation complète du joueur (anti triche par relecture du state).

### 1.7 Rotation mentale
**Concept** : reconnaître si une forme pivotée est identique ou en miroir d'une forme de référence.
**Déroulement** : une forme de référence est affichée, puis une variante pivotée apparaît (0-360°). Le joueur répond "identique" ou "miroir" le plus vite possible. Série de N essais.
**Paramètres** : nombre d'essais, complexité des formes, temps limite par essai.
**Résolution** : classement par score (bonnes réponses) puis temps moyen.
**Note technique** : formes générées procéduralement (polygones aléatoires) pour éviter la mémorisation par répétition d'un joueur à l'autre.

### 1.8 Compte à rebours inversé
**Concept** : arrêter un chronomètre visuel le plus près possible d'une cible sans la dépasser.
**Déroulement** : une barre de progression avance vers une cible cachée (ex: 7.00s). Le joueur clique "stop". S'il dépasse la cible, échec immédiat de la manche ; sinon score = proximité à la cible.
**Paramètres** : plage de la cible, nombre de manches, vitesse de la barre.
**Résolution** : classement par score cumulé de proximité sur toutes les manches valides.
**Note technique** : la cible n'est jamais transmise au client avant le clic ; seul l'écart est renvoyé après coup.

### 1.9 Labyrinthe éclair
**Concept** : traverser un labyrinthe généré aléatoirement le plus vite possible.
**Déroulement** : labyrinthe affiché en entier (pas de brouillard de guerre), le joueur navigue au clavier/tactile jusqu'à la sortie. Chrono déclenché au premier mouvement.
**Paramètres** : taille du labyrinthe, complexité (nombre d'embranchements), limite de temps.
**Résolution** : classement par temps de complétion ; DNF (non complété) classé après tous les finishers.
**Note technique** : génération procédurale par algorithme de type "recursive backtracking", seed unique par joueur pour éviter le partage de solution en direct.

### 1.10 Précision de tir
**Concept** : cliquer des cibles qui apparaissent brièvement à des positions aléatoires.
**Déroulement** : des cibles apparaissent une par une (ou en vagues) pendant un temps très court (ex: 800ms) puis disparaissent. Clic sur cible = point, clic manqué = rien, cible ratée = rien.
**Paramètres** : nombre de cibles, temps d'apparition, taille des cibles, densité des vagues.
**Résolution** : classement par nombre de cibles touchées, tie-break par précision (touches/clics totaux).
**Note technique** : positions et timing générés server-side par vague, validation du clic avec tolérance de hitbox et prise en compte de la latence réseau.

### 1.11 Mots mêlés chronométrés
**Concept** : retrouver des mots cachés dans une grille de lettres avant la fin du temps.
**Déroulement** : grille de lettres affichée avec une liste de mots à trouver. Le joueur sélectionne les lettres en glissant. Mot trouvé = retiré de la liste + point.
**Paramètres** : taille de grille, nombre de mots, durée totale, difficulté du vocabulaire.
**Résolution** : classement par nombre de mots trouvés, tie-break par temps du dernier mot trouvé.
**Note technique** : grille et positions des mots générées server-side, validation de sélection par comparaison de coordonnées plutôt que du texte affiché (anti-inspection DOM).

### 1.12 Puzzle glissant
**Concept** : reconstituer une image en faisant glisser des tuiles sur une grille avec une case vide (taquin).
**Déroulement** : puzzle mélangé de façon garantie résolvable, le joueur déplace les tuiles jusqu'à reconstitution complète.
**Paramètres** : taille de grille (3x3, 4x4...), niveau de mélange, limite de temps.
**Résolution** : classement par temps de résolution ; DNF classé par nombre de tuiles correctement placées à la fin du temps.
**Note technique** : algorithme de mélange garantissant la solvabilité (permutation paire), état de grille validé server-side à chaque coup.

### 1.13 Suite logique
**Concept** : deviner l'élément suivant d'une suite (numérique, visuelle ou symbolique).
**Déroulement** : une suite est affichée avec un élément manquant (ex: 2, 4, 8, 16, ?). Le joueur choisit parmi 4 propositions. Série de N suites, difficulté croissante.
**Paramètres** : nombre de suites, types autorisés (arithmétique, géométrique, visuelle), temps par suite.
**Résolution** : classement par bonnes réponses, tie-break par temps moyen.
**Note technique** : banque de suites catégorisées en base, sélection aléatoire sans répétition par session pour éviter l'effet d'apprentissage entre rounds.

### 1.14 Répétition audio
**Concept** : reproduire un rythme ou une mélodie courte après l'avoir entendue.
**Déroulement** : un motif sonore (ex: 4-6 notes/beats) est joué une fois, le joueur reproduit en cliquant sur des pads dans le bon ordre et avec un timing approximatif.
**Paramètres** : longueur du motif, tolérance de timing, nombre de manches.
**Résolution** : classement par précision cumulée (ordre + timing), tie-break par nombre de manches réussies.
**Note technique** : lecture audio synchronisée via Web Audio API, validation du timing par comparaison des timestamps client corrigés de la latence.

### 1.15 Comptage rapide
**Concept** : estimer/compter un nombre d'objets affichés très brièvement.
**Déroulement** : un nuage d'objets (points, formes) apparaît pendant un temps très court (ex: 500ms) puis disparaît. Le joueur saisit le nombre exact ou une estimation selon le mode.
**Paramètres** : temps d'affichage, plage du nombre d'objets, mode (exact ou tolérance ±X).
**Résolution** : classement par proximité cumulée à la vraie valeur sur toutes les manches.
**Note technique** : le nombre réel n'est jamais exposé côté client avant la réponse (généré et vérifié server-side).

### 1.16 Anagramme éclair
**Concept** : reconstituer un mot à partir de lettres mélangées.
**Déroulement** : lettres d'un mot affichées dans le désordre, le joueur les réarrange (glisser ou saisie) pour former le mot correct avant expiration du temps.
**Paramètres** : longueur des mots, nombre de mots par round, temps par mot.
**Résolution** : classement par mots résolus, tie-break par temps cumulé.
**Note technique** : dictionnaire de mots validés en base avec niveau de difficulté ; vérification server-side de la réponse (pas de validation client qui exposerait le mot).

### 1.17 Suivi de curseur
**Concept** : suivre une cible mobile avec le curseur/doigt le plus précisément possible.
**Déroulement** : une cible se déplace selon une trajectoire (aléatoire ou sinusoïdale) pendant X secondes. Le score est basé sur la distance moyenne entre le curseur du joueur et la cible.
**Paramètres** : durée, vitesse et complexité de la trajectoire.
**Résolution** : classement par distance moyenne cumulée (plus petite = meilleur).
**Note technique** : position de la cible calculée server-side à chaque tick et diffusée ; position du curseur envoyée par le client à intervalle régulier (ex: 10 fois/sec) pour calcul de distance.

### 1.18 Estimation visuelle
**Concept** : estimer une quantité, une distance ou une proportion sans pouvoir compter précisément.
**Déroulement** : affichage d'une image (ex: un récipient rempli à X%, une distance entre deux points) pendant un temps limité. Le joueur donne une estimation chiffrée. Score basé sur l'écart à la valeur réelle.
**Paramètres** : type d'estimation, nombre de manches, temps d'affichage.
**Résolution** : classement par écart cumulé à la réalité (plus petit = meilleur).
**Note technique** : valeurs réelles générées aléatoirement server-side et jamais exposées avant la réponse du joueur.

### 1.19 Stabilité de main
**Concept** : garder le curseur à l'intérieur d'une zone qui se déplace et/ou rétrécit, sans en sortir.
**Déroulement** : une zone tolérante affichée à l'écran se déplace lentement ; le joueur doit y maintenir son curseur. Chaque sortie de zone déclenche une pénalité ou un chrono de "hors zone" cumulé.
**Paramètres** : taille de la zone, vitesse/complexité du déplacement, durée totale, seuil de tolérance en temps hors-zone.
**Résolution** : classement par temps cumulé passé dans la zone (plus grand = meilleur).
**Note technique** : position de la zone calculée server-side, position du curseur reçue à intervalle régulier, calcul d'intersection fait côté serveur pour éviter la triche par modification du rendu client.

### 1.20 Mémoire de symboles
**Concept** : mémoriser un ensemble de symboles affichés puis identifier celui qui n'y était pas.
**Déroulement** : une série de symboles (ex: 8) est affichée pendant un temps court, puis une nouvelle grille de symboles (dont un intrus non présent initialement) apparaît. Le joueur doit cliquer l'intrus.
**Paramètres** : nombre de symboles, temps de mémorisation, nombre de manches, similarité visuelle des intrus.
**Résolution** : classement par bonnes réponses cumulées, tie-break par temps de réponse moyen.
**Note technique** : liste des symboles affichés stockée server-side par manche pour validation, jamais réexposée au client avant réponse.

---

## 2. Rounds Duel 1v1

Deux joueurs s'affrontent directement, un seul passe. Room à 2 joueurs, résolution binaire (gagnant/perdant), parfois avec égalité gérée par rejouabilité (« sudden death »).

### 2.1 Chifoumi à mise
**Concept** : pierre-papier-ciseaux enrichi d'un système de jetons de mise.
**Déroulement** : chaque joueur reçoit 3 jetons (attaque/défense/feinte). À chaque manche, les deux posent un choix en simultané (caché jusqu'à résolution). Attaque bat feinte, feinte bat défense, défense bat attaque. Premier à 2 victoires de manche gagne le duel.
**Paramètres** : nombre de jetons, nombre de victoires nécessaires, temps de décision par manche.
**Résolution** : premier à atteindre le nombre de victoires requis remporte le duel ; égalité de manche = manche neutre, rejouée.
**Note technique** : les deux choix sont stockés côté serveur et ne sont révélés qu'une fois les deux reçus (pattern "commit-reveal" simplifié), évite qu'un joueur voie le choix de l'autre avant de jouer.

### 2.2 Course au signal
**Concept** : cliquer le plus vite possible après un signal aléatoire, sans anticiper.
**Déroulement** : les deux joueurs attendent un signal déclenché après un délai aléatoire (2-6s). Premier à cliquer après le signal gagne. Clic avant le signal = faux départ = défaite immédiate.
**Paramètres** : plage du délai aléatoire, nombre de manches (best of N), gestion du faux départ.
**Résolution** : gagnant du duel = premier à remporter la majorité des manches.
**Note technique** : signal timestampé server-side, correction de latence individuelle par joueur (mesurée via ping moyen) avant comparaison des temps de réaction.

### 2.3 Bras de fer digital
**Concept** : faire avancer une jauge vers son camp par clics/appuis répétés.
**Déroulement** : une jauge centrale se déplace selon la fréquence de clic de chaque joueur (moyenne mobile sur une fenêtre courte). Le premier à pousser la jauge dans la zone de l'adversaire gagne.
**Paramètres** : sensibilité de la jauge, durée max du duel (limite anti-blocage), zones de victoire.
**Résolution** : victoire dès que la jauge atteint la zone adverse ; si limite de temps atteinte, victoire au joueur ayant la position la plus avancée.
**Note technique** : calcul de la jauge fait exclusivement côté serveur à partir des inputs bruts (timestamps de clics), pour empêcher un client de simuler une fréquence de clic supérieure à la réalité.

### 2.4 Duel de tir
**Concept** : toucher un maximum de cibles communes avant l'adversaire.
**Déroulement** : les deux joueurs voient les mêmes cibles apparaître simultanément à des positions différentes (miroir ou identiques selon mode). Chaque touche = point. Premier à un score cible gagne, ou meilleur score au temps écoulé.
**Paramètres** : nombre de cibles, vitesse d'apparition, score cible ou durée fixe.
**Résolution** : le joueur avec le plus de touches valides remporte le duel.
**Note technique** : génération des cibles server-side identique pour les deux joueurs (même seed) pour garantir l'équité des conditions.

### 2.5 Le bluff des cartes
**Concept** : deviner si l'adversaire annonce une vraie ou une fausse valeur de carte.
**Déroulement** : chaque joueur tire une carte (valeur cachée à l'autre) et annonce une valeur (vraie ou fausse à son choix). L'adversaire doit deviner "vrai" ou "bluff". Bonne devinette = point pour le devineur ; bluff réussi = point pour le bluffeur.
**Paramètres** : nombre de manches, valeurs possibles des cartes, temps de décision.
**Résolution** : le joueur avec le plus de points après N manches gagne.
**Note technique** : la carte réelle est stockée côté serveur et n'est révélée qu'après la décision de l'adversaire, empêchant toute vérification anticipée côté client.

### 2.6 Match de rythme
**Concept** : reproduire un motif rythmique plus vite et plus précisément que l'adversaire.
**Déroulement** : un motif (suite de touches/temps) est affiché aux deux joueurs simultanément. Chacun le reproduit dès qu'il est prêt. Le score combine précision du timing et rapidité d'exécution.
**Paramètres** : longueur du motif, tolérance de timing, nombre de motifs (best of N).
**Résolution** : le joueur avec le meilleur score cumulé (précision + rapidité) gagne le duel.
**Note technique** : motif généré server-side et diffusé identique aux deux joueurs ; validation du timing par comparaison des timestamps corrigés de la latence individuelle.

### 2.7 Poussée de jauge
**Concept** : variante du bras de fer où chaque clic a un poids aléatoire (risque/récompense).
**Déroulement** : chaque clic pousse la jauge d'une valeur variable (ex: 1 à 3), affichée seulement après le clic. Les deux jouent en simultané jusqu'à ce que la jauge atteigne un camp.
**Paramètres** : plage de valeur par clic, vitesse de décroissance naturelle de la jauge (optionnelle), durée max.
**Résolution** : victoire dès que la jauge atteint la zone adverse.
**Note technique** : valeur de chaque clic tirée aléatoirement server-side au moment du clic (non prévisible côté client) pour éviter toute prédiction.

### 2.8 Le voleur de points
**Concept** : un pot de points partagé, chaque joueur peut piocher ou laisser grossir.
**Déroulement** : un pot commun visible grossit automatiquement. À tour de rôle (ou en simultané avec fenêtre courte), chaque joueur peut "voler" une partie du pot. Le duel se termine après N tours ou un montant cible atteint.
**Paramètres** : vitesse de croissance du pot, nombre de tours, part maximale volable par tour.
**Résolution** : le joueur avec le plus de points volés au total remporte le duel.
**Note technique** : état du pot et des vols géré comme état de room synchronisé, résolu au tick serveur pour éviter les conflits de vol simultané.

### 2.9 Duel de mémoire
**Concept** : jeu de paires (memory) en tête-à-tête, à tour de rôle.
**Déroulement** : une grille de cartes retournées est affichée aux deux joueurs. À tour de rôle, chacun retourne 2 cartes ; paire trouvée = point + rejoue, sinon tour passe à l'adversaire.
**Paramètres** : taille de la grille, temps de décision par tour.
**Résolution** : le joueur avec le plus de paires à la fin de la grille gagne.
**Note technique** : disposition des cartes générée et stockée server-side, cartes révélées un par un uniquement au tour du joueur concerné.

### 2.10 Roulette de risque
**Concept** : chaque joueur choisit un niveau de risque avec probabilité de succès inversement proportionnelle au gain.
**Déroulement** : à chaque manche, le joueur choisit entre plusieurs paliers (ex: 90% de chance de gagner 1pt, 50% pour 3pts, 20% pour 10pts). Le serveur tire au sort selon la probabilité choisie.
**Paramètres** : nombre de paliers et probabilités associées, nombre de manches.
**Résolution** : le joueur avec le plus de points cumulés après N manches gagne le duel.
**Note technique** : tirage aléatoire effectué server-side avec RNG vérifiable (seed loguée) pour garantir l'absence de manipulation.

### 2.11 Le duel du menteur
**Concept** : chaque joueur annonce un nombre, et son adversaire doit deviner si l'annonce dépasse un seuil réel caché.
**Déroulement** : chaque joueur reçoit un nombre réel caché. Il annonce un nombre à l'adversaire (peut mentir). L'adversaire choisit "plus haut" ou "plus bas" pour tenter de deviner la relation entre les deux nombres réels.
**Paramètres** : plage des nombres, nombre de manches, temps de décision.
**Résolution** : point à qui devine correctement la relation ; le meilleur score sur N manches gagne.
**Note technique** : les nombres réels sont stockés et comparés côté serveur, jamais transmis en clair avant résolution de la manche.

### 2.12 Tir à la corde de précision
**Concept** : variante du bras de fer où la précision du timing de clic compte plus que la fréquence.
**Déroulement** : un signal métronomique est diffusé ; chaque clic dans la fenêtre de précision autour du signal pousse fortement la jauge, un clic hors fenêtre la pousse faiblement voire la fait reculer.
**Paramètres** : tempo du métronome, largeur de la fenêtre de précision, force de poussée/pénalité.
**Résolution** : victoire dès que la jauge atteint la zone adverse.
**Note technique** : fenêtre de précision calculée par rapport à l'horloge serveur, comparaison des timestamps de clic corrigés de latence.

### 2.13 Dernier chiffre
**Concept** : jeu de type Nim — les joueurs retirent alternativement des jetons d'un tas commun, celui qui prend le dernier perd (ou gagne, selon variante).
**Déroulement** : un tas de jetons (ex: 21) est affiché. À tour de rôle, chaque joueur retire 1, 2 ou 3 jetons. Le joueur forcé de retirer le dernier jeton perd (variante "misère").
**Paramètres** : taille du tas de départ, nombre max de jetons retirables par tour, variante (misère ou normale).
**Résolution** : le joueur qui respecte la condition de fin (prendre ou éviter le dernier jeton) gagne.
**Note technique** : état du tas synchronisé en room, tour strictement alterné avec validation server-side du nombre retiré.

### 2.14 Le mimeur
**Concept** : reproduire un motif Simon-like en duel direct, celui qui échoue en premier perd.
**Déroulement** : un motif s'allonge à chaque manche (comme Séquence mémoire en solo), mais ici les deux joueurs voient et reproduisent le même motif en parallèle. Le premier à se tromper perd le duel.
**Paramètres** : longueur initiale, incrément par manche, vitesse d'affichage.
**Résolution** : le dernier joueur encore correct après l'erreur de l'autre gagne.
**Note technique** : motif identique généré server-side (même seed) et diffusé simultanément aux deux joueurs pour garantir l'équité.

### 2.15 Duel d'enchères
**Concept** : enchère silencieuse sur un lot de points avec un budget limité.
**Déroulement** : chaque joueur reçoit un budget de points fictifs. Sur plusieurs lots successifs, chacun mise en secret une partie de son budget. Le plus gros miseur remporte le lot, les points misés (par les deux) sont déduits du budget quel que soit le résultat.
**Paramètres** : budget de départ, nombre de lots, valeur de chaque lot.
**Résolution** : le joueur avec le plus de valeur de lots remportés à la fin gagne le duel.
**Note technique** : mises stockées côté serveur et révélées uniquement après réception des deux enchères (commit-reveal).

### 2.16 Pierre-papier-ciseaux évolutif
**Concept** : RPS étendu à 5 choix (pierre, papier, ciseaux, lézard, spock) pour réduire les parties nulles.
**Déroulement** : les deux joueurs choisissent en simultané parmi 5 options avec une matrice de victoire étendue. Best of N manches.
**Paramètres** : nombre de manches à gagner, temps de décision.
**Résolution** : premier à atteindre le nombre de victoires requis gagne.
**Note technique** : matrice de résolution codée en dur côté serveur, choix révélés uniquement après réception des deux (commit-reveal).

### 2.17 Le duel des zones
**Concept** : contrôler des zones qui apparaissent sur un plateau partagé en s'y positionnant/cliquant en premier.
**Déroulement** : des zones apparaissent aléatoirement sur un plateau commun ; chaque joueur clique pour revendiquer une zone. Chaque zone revendiquée rapporte un point. Le duel dure un temps fixe.
**Paramètres** : fréquence d'apparition des zones, durée totale, taille des zones.
**Résolution** : le joueur avec le plus de zones revendiquées à la fin du temps gagne.
**Note technique** : apparition des zones générée server-side avec timestamp, résolution du "premier clic" tranchée par ordre d'arrivée des messages serveur (pas par affichage client).

### 2.18 Quiz éclair face à face
**Concept** : buzzer de quiz — le premier à buzzer a le droit de répondre.
**Déroulement** : une question à choix multiple s'affiche aux deux joueurs. Le premier à appuyer sur le buzzer obtient le droit de répondre sous X secondes. Bonne réponse = point ; mauvaise réponse ou timeout = le droit passe à l'autre joueur.
**Paramètres** : nombre de questions, temps de réponse après buzz, banque de questions.
**Résolution** : le joueur avec le plus de bonnes réponses après N questions gagne.
**Note technique** : ordre de buzz déterminé par timestamp serveur de réception du message, pas par l'affichage local du bouton.

### 2.19 Le compte juste
**Concept** : se rapprocher d'un nombre cible sans le dépasser, à partir de tirages aléatoires successifs (façon blackjack simplifié).
**Déroulement** : chaque joueur tire des valeurs aléatoires une à une et décide de s'arrêter ou de continuer. Dépasser la cible élimine le joueur de la manche. Le plus proche de la cible sans dépasser gagne la manche.
**Paramètres** : valeur cible, plage des tirages, nombre de manches.
**Résolution** : le joueur avec le plus de manches gagnées remporte le duel.
**Note technique** : tirages générés server-side à la demande (pas de liste prégénérée visible), RNG loguée pour audit.

### 2.20 Duel de patience
**Concept** : concours d'immobilité/de non-action — le premier qui agit (bouge, clique, relâche) perd.
**Déroulement** : les deux joueurs doivent maintenir un état (ex: garder un bouton enfoncé, ou au contraire ne rien cliquer) le plus longtemps possible face à des distracteurs affichés à l'écran. Premier à céder perd.
**Paramètres** : nature des distracteurs, durée max avant match nul, fréquence des distracteurs.
**Résolution** : le dernier joueur à ne pas avoir cédé gagne ; si les deux tiennent jusqu'à la durée max, égalité tranchée par un round supplémentaire.
**Note technique** : état "maintenu" vérifié par ping continu du client au serveur ; une coupure de connexion ou un relâchement est détecté et timestampé côté serveur.

---

## 3. Rounds Alliance forcée (binôme)

Le jeu impose un binôme (tirage aléatoire), les deux doivent collaborer pour réussir l'épreuve, mais une seule place de "gagnant" existe à l'arrivée — ce qui force un dilemme coopération/trahison sans logique de négociation complexe à coder.

### 3.1 Le coffre à deux clés
**Concept** : chacun a une moitié de code à communiquer pour ouvrir un coffre commun, mais un seul peut valider.
**Déroulement** : chat limité à 30s s'ouvre, A et B ont chacun une moitié du code. Une fois le chat fermé (ou le code reconstitué), un bouton "Ouvrir" unique apparaît pour les deux ; premier à saisir le bon code gagne.
**Paramètres** : durée du chat, complexité du code, temps de saisie après fermeture du chat.
**Résolution** : premier à valider le bon code gagne ; si personne ne valide dans le temps imparti, les deux sont éliminés.
**Note technique** : les deux moitiés de code générées server-side et jamais combinées automatiquement ; validation de la saisie comparée au code complet stocké en room state.

### 3.2 Synchronisation
**Concept** : les deux doivent cliquer à un instant précis à quelques centaines de ms près, mais un seul empoche le point.
**Déroulement** : compte à rebours visible affiché aux deux (ex: cliquer à 5.00s). Chacun clique sans concertation possible (pas de chat). Si l'écart entre les deux clics est sous le seuil, l'épreuve réussit ; le point va au dernier des deux à avoir cliqué (ou tirage aléatoire selon config).
**Paramètres** : cible de temps, seuil de tolérance, règle d'attribution du point (dernier cliqueur ou aléatoire).
**Résolution** : si échec (écart trop grand), aucun des deux ne marque ; si réussite, un seul reçoit le point selon la règle configurée.
**Note technique** : timestamps des deux clics comparés côté serveur avec correction de latence individuelle pour une mesure d'écart fiable.

### 3.3 Pot commun
**Concept** : cagnotte partagée qui grossit dans le temps, un seul bouton "empocher" existe.
**Déroulement** : une cagnotte visible par les deux grossit automatiquement (+1pt/s). Pendant 20s, un bouton "Empocher" est disponible pour les deux ; le premier qui clique rafle tout, l'autre repart à zéro. Si personne ne clique, la cagnotte est perdue pour les deux.
**Paramètres** : durée de la fenêtre, vitesse de croissance de la cagnotte.
**Résolution** : premier clic valide sur "Empocher" remporte la cagnotte actuelle ; aucun clic avant expiration = zéro pour les deux.
**Note technique** : croissance de la cagnotte calculée server-side par tick, résolution du "premier clic" par ordre d'arrivée des messages serveur.

### 3.4 Le pont fragile
**Concept** : les deux doivent traverser un chemin de cases fragiles en se coordonnant, mais un seul obtient la récompense à l'arrivée.
**Déroulement** : un chemin de cases est affiché, certaines s'effondrent après un passage. Les deux joueurs doivent se coordonner (verbalement ou par timing) sur l'ordre de passage pour que l'un au moins atteigne l'autre bout. Une seule place de vainqueur à l'arrivée.
**Paramètres** : longueur du pont, probabilité d'effondrement par case, temps limite de traversée.
**Résolution** : premier joueur à atteindre l'autre bout sans tomber gagne ; si les deux tombent, élimination des deux.
**Note technique** : état de chaque case (intacte/effondrée) géré en room state partagé, mise à jour synchronisée après chaque passage.

### 3.5 Le partage inégal
**Concept** : jeu de l'ultimatum — un joueur propose une répartition d'un gain, l'autre accepte ou refuse.
**Déroulement** : un joueur (tiré au sort) propose une répartition d'un pot de points entre lui et son partenaire. L'autre accepte (répartition appliquée) ou refuse (les deux perdent tout pour cette manche).
**Paramètres** : taille du pot, nombre de manches, temps de décision.
**Résolution** : répartition appliquée si acceptée ; zéro pour les deux si refusée. Score cumulé sur les manches.
**Note technique** : rôle de proposant/répondant alterné à chaque manche, décision stockée et appliquée server-side.

### 3.6 Le fil tendu
**Concept** : maintenir une tension équilibrée à deux via des inputs opposés, sans faire rompre le fil.
**Déroulement** : une jauge de tension doit rester dans une plage cible ; chaque joueur pousse la jauge dans une direction opposée par appuis répétés. Si la jauge sort de la plage, le fil "rompt" et les deux échouent. Après un temps de maintien réussi, un seul peut valider pour capter la récompense (mais valider stoppe l'effort de l'autre).
**Paramètres** : plage cible, sensibilité des appuis, durée de maintien requise avant validation possible.
**Résolution** : le premier à valider après la durée de maintien requise remporte le point ; rupture du fil avant cela élimine les deux.
**Note technique** : calcul de jauge fait exclusivement côté serveur à partir des inputs bruts des deux joueurs.

### 3.7 Le mensonge partagé
**Concept** : les deux doivent s'accorder sur un nombre à annoncer, mais chacun est aussi récompensé individuellement s'il s'en écarte au bon moment.
**Déroulement** : les deux discutent brièvement (chat limité) pour choisir un nombre commun à soumettre. Au moment de la validation, chacun soumet en secret son propre nombre. S'ils sont identiques, les deux gagnent un petit gain garanti ; si l'un des deux s'écarte discrètement vers un nombre plus avantageux pour lui selon une règle cachée, il peut gagner plus, au risque que les deux perdent tout si l'écart est détecté comme "trop grand".
**Paramètres** : durée du chat, seuil de tolérance d'écart, barème de gains.
**Résolution** : nombres identiques = gain partagé garanti ; écart dans la tolérance = gain individuel supérieur pour celui qui s'écarte ; écart hors tolérance = zéro pour les deux.
**Note technique** : soumissions stockées séparément côté serveur et comparées uniquement après réception des deux (commit-reveal).

### 3.8 La clé unique
**Concept** : un seul des deux reçoit une clé d'accès, doit décider s'il la partage ou l'utilise seul.
**Déroulement** : la room tire au sort lequel des deux détient la "clé" (code d'accès à une porte commune). Le détenteur peut la garder secrète (passer seul) ou la communiquer à son partenaire via le chat limité (les deux peuvent alors tenter de passer, mais un seul créneau de passage existe).
**Paramètres** : durée du chat, temps de la fenêtre de passage.
**Résolution** : si la clé n'est pas partagée, le détenteur passe automatiquement ; si partagée, premier des deux à valider le passage l'emporte.
**Note technique** : attribution de la clé et son état (partagée ou non) suivis en room state, jamais visibles à l'autre joueur avant action explicite du détenteur.

### 3.9 Le compte à repartir
**Concept** : un chronomètre commun décompte un pot, chacun peut "voler" le pot à tout moment avant la fin.
**Déroulement** : un pot visible décompte lentement vers zéro (perte progressive) pendant que les deux joueurs peuvent, à tout moment, cliquer "Prendre" pour récupérer le pot restant à cet instant. Premier à cliquer l'emporte.
**Paramètres** : valeur de départ du pot, vitesse de décompte, durée max.
**Résolution** : premier clic valide sur "Prendre" remporte le montant restant à cet instant ; si personne ne clique avant que le pot atteigne zéro, aucun gain.
**Note technique** : valeur du pot recalculée à chaque tick serveur, le clic "Prendre" est horodaté et comparé server-side pour départager les clics quasi simultanés.

### 3.10 Le miroir
**Concept** : reproduire exactement le mouvement du partenaire pour ouvrir une porte commune, récompense inégale à la clé.
**Déroulement** : un des deux joueurs (le "meneur", tiré au sort) effectue une série de mouvements/clics ; l'autre (le "suiveur") doit les reproduire en léger différé. Une bonne synchronisation ouvre la porte, mais seul le suiveur qui valide en premier le passage final obtient le point plein (le meneur obtient un gain réduit fixe).
**Paramètres** : longueur de la séquence, tolérance de reproduction, gains respectifs meneur/suiveur.
**Résolution** : porte ouverte si la reproduction est suffisamment fidèle ; le suiveur reçoit le gain plein, le meneur un gain fixe réduit (incitation à bien guider malgré l'écart de récompense).
**Note technique** : séquence du meneur capturée et stockée server-side en temps réel, comparée à la séquence du suiveur avec tolérance de timing et de position.

### 3.11 La corde à deux
**Concept** : tirer ensemble une corde virtuelle pour déplacer un objet commun vers un but, un seul reçoit le trophée à l'arrivée.
**Déroulement** : les deux joueurs doivent alterner ou synchroniser des appuis pour faire avancer un objet vers une ligne d'arrivée. Une fois la ligne atteinte, un bouton "Récupérer le trophée" apparaît, valide pour un seul clic.
**Paramètres** : distance à parcourir, effort requis par appui, fenêtre de récupération du trophée.
**Résolution** : premier à cliquer "Récupérer" une fois la ligne atteinte gagne ; si aucun ne clique dans la fenêtre, le trophée est perdu pour les deux.
**Note technique** : position de l'objet calculée server-side à partir des inputs cumulés des deux joueurs.

### 3.12 Le puzzle inversé
**Concept** : chacun détient la moitié des pièces d'un puzzle, doivent combiner l'information mais un seul peut soumettre la solution.
**Déroulement** : chat limité pour que chacun décrive ses pièces à l'autre ; un seul des deux a accès au plateau de soumission final. S'il ne partage pas correctement les infos avec son partenaire (qui pourrait avoir une pièce clé), la soumission peut échouer.
**Paramètres** : nombre de pièces, durée du chat, complexité du puzzle.
**Résolution** : le détenteur du plateau de soumission gagne s'il résout correctement (avec ou sans l'aide de l'autre) ; échec de soumission élimine les deux.
**Note technique** : répartition des pièces et solution correcte stockées server-side, validation de la soumission côté serveur uniquement.

### 3.13 Le vote à deux
**Concept** : chacun vote secrètement pour désigner le gagnant du round entre les deux.
**Déroulement** : après une brève phase de discussion (chat limité), chacun vote en secret "moi" ou "mon partenaire". Si les deux votent pour l'autre, l'un des deux est tiré au sort pour gagner (bonus). Si les deux votent pour eux-mêmes, aucun ne gagne. Si un vote pour l'autre et l'autre pour lui-même, celui qui a voté pour l'autre gagne.
**Paramètres** : durée du chat, barème de gains selon les combinaisons.
**Résolution** : appliquée selon la matrice de vote ci-dessus.
**Note technique** : votes stockés séparément côté serveur et révélés uniquement après réception des deux (commit-reveal).

### 3.14 La lumière partagée
**Concept** : maintenir un bouton enfoncé ensemble pour garder une lumière allumée, le premier à lâcher volontairement capte un bonus.
**Déroulement** : les deux doivent maintenir un bouton enfoncé simultanément pour que la "lumière" (jauge commune) reste active. Après une durée minimale de maintien collectif, l'un des deux peut choisir de lâcher volontairement pour capter un bonus individuel — mais cela coupe la lumière et fait échouer l'autre s'il n'a pas atteint son propre seuil de validation.
**Paramètres** : durée minimale de maintien, taille du bonus de lâcher volontaire, seuil de validation individuel.
**Résolution** : si les deux maintiennent jusqu'au seuil de validation individuel de chacun, les deux gagnent un gain de base ; si l'un lâche avant que l'autre ait atteint son seuil, celui qui lâche gagne le bonus et l'autre échoue.
**Note technique** : état de maintien de chaque joueur suivi en continu server-side via ping, avec horodatage précis du relâchement.

### 3.15 Le message caché
**Concept** : relayer un message chiffré entre les deux pour déverrouiller l'accès, un seul peut valider en premier.
**Déroulement** : chacun reçoit une partie d'un message chiffré (ex: une clé de décalage et un texte codé). Chat limité pour combiner l'information et décoder le message complet. Une fois décodé, un bouton de validation unique est disponible pour les deux.
**Paramètres** : durée du chat, complexité du chiffrement, temps de la fenêtre de validation.
**Résolution** : premier à soumettre le message décodé correctement gagne ; les deux perdent si personne ne soumet dans le temps imparti.
**Note technique** : message et clé générés et stockés server-side séparément, validation de la soumission comparée au message déchiffré réel côté serveur.

### 3.16 Le compte parallèle
**Concept** : chacun accumule des points séparément mais doit atteindre un seuil combiné pour débloquer la manche, seul le meilleur score individuel garde ses points.
**Déroulement** : les deux jouent un mini-défi de clic/rapidité en parallèle (comme un solo), leurs scores s'additionnent pour vérifier si le seuil combiné est atteint. Si le seuil est atteint, la manche est validée, mais seul celui qui a le meilleur score individuel garde ses points (l'autre repart à zéro malgré sa contribution).
**Paramètres** : seuil combiné requis, durée du mini-défi.
**Résolution** : si seuil non atteint, les deux échouent ; si atteint, le meilleur score individuel empoche les points, l'autre rien.
**Note technique** : scores individuels et somme calculés server-side en temps réel, comparaison finale au terme du temps imparti.

### 3.17 Le saut de confiance
**Concept** : l'un doit "sauter" en se fiant à un timing donné par l'autre pour être "rattrapé", mais le rattrapeur choisit ensuite qui marque le point.
**Déroulement** : le "sauteur" doit cliquer "sauter" à un instant qu'il juge bon en fonction d'indices affichés au "rattrapeur" (qui voit une jauge cachée au sauteur). Le rattrapeur peut cliquer "rattraper" pour valider le saut au bon moment. Si le timing est bon, l'épreuve réussit, et le rattrapeur choisit alors librement lequel des deux reçoit le point.
**Paramètres** : fenêtre de timing valide, information visible pour chaque rôle.
**Résolution** : épreuve échouée si le timing est raté (les deux perdent) ; si réussie, le rattrapeur désigne le gagnant du point entre les deux.
**Note technique** : rôles et informations asymétriques gérés en room state (chaque client ne reçoit que les données de son rôle), décision finale du rattrapeur appliquée server-side.

### 3.18 Le silence forcé
**Concept** : rester immobile/silencieux ensemble pendant un temps donné, avec possibilité de trahir en rompant le silence au bon moment pour un gain.
**Déroulement** : les deux doivent ne fournir aucun input pendant X secondes pour valider l'épreuve collectivement. À tout moment, l'un des deux peut choisir de "rompre" volontairement (un clic) pour capter un gain individuel immédiat, mais cela annule la validation collective pour l'autre.
**Paramètres** : durée du silence requis, taille du gain de rupture volontaire.
**Résolution** : si les deux restent immobiles jusqu'au bout, gain collectif de base pour les deux ; si l'un rompt avant, il capte le gain de rupture et l'autre échoue.
**Note technique** : détection d'input (même minime) suivie en continu côté serveur avec horodatage précis.

### 3.19 Le pacte à durée
**Concept** : les deux s'accordent verbalement sur une répartition future, puis chacun choisit en secret de l'honorer ou non (dilemme du prisonnier classique).
**Déroulement** : phase de chat limité pour négocier une répartition d'un gain commun (ex: 50/50). Ensuite, chacun soumet en secret son choix réel : "coopérer" (respecter le pacte) ou "trahir" (prendre plus pour soi). Les deux soumissions sont comparées : coopération mutuelle = gain moyen partagé ; trahison mutuelle = gain faible partagé ; un coopère/un trahit = le traître gagne gros, le coopérant rien.
**Paramètres** : durée du chat, barème de gains de la matrice.
**Résolution** : appliquée selon la matrice de choix ci-dessus.
**Note technique** : choix stockés séparément et révélés uniquement après réception des deux (commit-reveal), matrice de résolution codée en dur côté serveur.

### 3.20 Le relais à un seul jeton
**Concept** : un seul jeton de passage existe pour un checkpoint, les deux doivent décider ensemble qui l'utilise.
**Déroulement** : chat limité pour discuter de qui doit passer le checkpoint (celui qui passe avance dans le classement général, l'autre reste bloqué à ce round). Après la discussion, chacun peut quand même tenter de forcer le passage en cliquant en premier sur le jeton, indépendamment de ce qui a été décidé à l'oral.
**Paramètres** : durée du chat, fenêtre d'utilisation du jeton après la discussion.
**Résolution** : premier à cliquer effectivement le jeton l'utilise et passe, peu importe l'accord verbal ; si aucun ne clique, les deux restent bloqués.
**Note technique** : jeton représenté comme ressource unique en room state, verrouillé au premier clic reçu côté serveur.

---

## 4. Rounds Équipe libre (3-4 joueurs, choix mutuel)

Les joueurs s'allient volontairement avant l'épreuve (pas d'obligation), ceux qui s'allient bénéficient d'un avantage sur l'épreuve collective. La stratégie sociale émerge naturellement.

### 4.1 Relais de mini-défis
**Concept** : chaque membre de l'équipe enchaîne un mini-défi solo, le temps total de l'équipe compte.
**Déroulement** : les membres jouent l'un après l'autre un mini-défi tiré de la banque solo (mémoire, réaction, etc.). Le chrono de l'équipe est la somme des temps individuels. Les équipes les plus rapides passent.
**Paramètres** : nombre de membres requis, mini-défis piochés, seuil de qualification (temps ou rang).
**Résolution** : classement des équipes par temps total cumulé ; qualification selon `winnersCount` appliqué au niveau équipe.
**Note technique** : room d'équipe orchestrant le passage séquentiel des membres, chrono cumulé calculé server-side entre le début du premier et la fin du dernier membre.

### 4.2 Construction collective
**Concept** : reproduire un motif/une forme ensemble avec un temps de discussion très court.
**Déroulement** : un motif cible (ex: disposition de blocs) est affiché brièvement à toute l'équipe. Chacun place ensuite une partie des blocs sur un plateau commun, sans revoir le motif. L'équipe entière réussit ou échoue selon la fidélité du résultat.
**Paramètres** : complexité du motif, temps d'affichage, temps de construction, seuil de fidélité pour validation.
**Résolution** : équipe validée si le plateau final atteint le seuil de fidélité ; sinon échec collectif.
**Note technique** : motif cible stocké server-side, comparaison pixel/case par case avec le plateau final pour calcul du score de fidélité.

### 4.3 Vote unanime
**Concept** : l'équipe doit se mettre d'accord sur une réponse commune dans un temps limité.
**Déroulement** : une question à choix multiple est posée à toute l'équipe. Chat limité pour discuter, puis vote simultané. Unanimité requise pour valider la manche ; sinon personne ne marque.
**Paramètres** : durée du chat, durée du vote, nombre de manches.
**Résolution** : manche validée uniquement si 100% des votes concordent ; score cumulé sur plusieurs manches.
**Note technique** : votes collectés en room state et comparés uniquement après réception de tous les votes (ou expiration du temps).

### 4.4 Le pont collectif
**Concept** : construire un pont ensemble pour que toute l'équipe puisse traverser.
**Déroulement** : chaque membre contrôle un segment du pont (ex: doit maintenir une jauge de stabilité sur sa portion). Le pont n'est traversable que si tous les segments sont stables simultanément ; l'équipe traverse ensemble ou échoue ensemble.
**Paramètres** : nombre de segments, difficulté de stabilisation par segment, durée de traversée requise.
**Résolution** : équipe qualifiée seulement si tous les membres franchissent le pont dans le temps imparti.
**Note technique** : état de stabilité de chaque segment suivi indépendamment côté serveur, condition de traversée vérifiée globalement à chaque tick.

### 4.5 La chaîne humaine
**Concept** : suite d'actions dépendantes où chaque membre doit réussir sa partie pour débloquer la suivante.
**Déroulement** : le défi est divisé en étapes séquentielles, chacune assignée à un membre différent. Un membre ne peut agir que lorsque l'étape précédente est validée par son coéquipier.
**Paramètres** : nombre d'étapes, difficulté par étape, temps limite global.
**Résolution** : équipe qualifiée si toutes les étapes sont validées dans le temps imparti.
**Note technique** : machine à états séquentielle en room, chaque étape ne devient "active" côté serveur qu'après validation de la précédente.

### 4.6 Le trésor partagé
**Concept** : rechercher collectivement des objets cachés, à répartir ensuite entre les membres.
**Déroulement** : des indices/objets sont dispersés dans une zone de jeu commune (grille ou plan). Les membres cherchent en parallèle. Une fois le temps écoulé ou tous les objets trouvés, le groupe doit décider (vote ou discussion) comment répartir les gains associés.
**Paramètres** : nombre d'objets, taille de la zone, durée de recherche, durée de négociation de répartition.
**Résolution** : équipe qualifiée si un seuil minimal d'objets est trouvé ; répartition individuelle des gains selon l'accord du groupe (défaut : partage égal si pas d'accord).
**Note technique** : positions des objets générées server-side, retrait de l'objet dès la première découverte validée (anti-doublon).

### 4.7 Le vote de leader
**Concept** : l'équipe élit un leader qui décide seul de la répartition finale des gains.
**Déroulement** : avant l'épreuve, vote rapide pour élire un leader. L'équipe réalise ensuite une épreuve collective standard (ex: défi de rapidité collectif). À la fin, le leader élu décide comment répartir les points gagnés entre les membres.
**Paramètres** : durée du vote de leader, type d'épreuve collective, contrainte de répartition minimale (optionnelle, ex: chacun doit recevoir au moins 10%).
**Résolution** : gains distribués selon la décision du leader, dans les limites des contraintes configurées.
**Note technique** : élection résolue par majorité simple côté serveur (égalité = tirage au sort), répartition finale validée contre les contraintes avant application.

### 4.8 La tour fragile
**Concept** : empiler des éléments ensemble sans faire tomber la construction.
**Déroulement** : chaque membre ajoute à tour de rôle un élément à une tour virtuelle avec une jauge de stabilité qui réagit à la précision du placement (timing/position). Si la tour s'effondre, l'équipe échoue.
**Paramètres** : hauteur cible de la tour, sensibilité de la stabilité, nombre de tours de jeu.
**Résolution** : équipe qualifiée si la hauteur cible est atteinte sans effondrement.
**Note technique** : calcul de stabilité cumulatif fait server-side à chaque ajout, avec seuil d'effondrement déclenché automatiquement si dépassé.

### 4.9 Le code collectif
**Concept** : chaque membre détient un indice partiel, la combinaison de tous permet de résoudre une énigme commune.
**Déroulement** : chat limité pour que chacun partage son indice. Un membre désigné (ou n'importe qui) soumet la réponse finale une fois l'énigme reconstituée.
**Paramètres** : nombre d'indices, durée du chat, complexité de l'énigme.
**Résolution** : équipe qualifiée si la réponse correcte est soumise dans le temps imparti.
**Note technique** : indices et solution stockés server-side, validation de la soumission uniquement côté serveur.

### 4.10 La course en cordée
**Concept** : simulation d'ascension où les membres sont "liés" et doivent avancer à un rythme coordonné.
**Déroulement** : chaque membre doit valider son propre "pas" (clic/action rythmée) mais l'équipe n'avance que si les pas sont suffisamment synchronisés (écart de timing sous un seuil). Un membre trop en avance ou en retard ralentit toute la cordée.
**Paramètres** : nombre de "pas" à valider, seuil de synchronisation, distance à parcourir.
**Résolution** : équipe qualifiée si elle atteint la distance cible dans le temps imparti.
**Note technique** : timestamps de chaque pas comparés server-side pour calculer l'écart de synchronisation à chaque étape.

### 4.11 Le radeau
**Concept** : ramer ensemble en rythme pour faire avancer un radeau virtuel.
**Déroulement** : chaque membre rame (clics répétés) ; la vitesse du radeau dépend de la synchronisation des rythmes de rame de tous les membres, pas seulement de la fréquence individuelle.
**Paramètres** : distance à parcourir, tolérance de synchronisation, durée max.
**Résolution** : équipe qualifiée si elle atteint la distance cible dans le temps imparti.
**Note technique** : vitesse calculée server-side comme fonction de la moyenne et de l'écart-type des fréquences de clic des membres (pénalité si désynchronisé).

### 4.12 Le chant collectif
**Concept** : synchroniser les inputs de tous les membres sur un même rythme.
**Déroulement** : un métronome commun est diffusé ; chaque membre doit cliquer en rythme. Le score de l'équipe dépend du pourcentage de clics de tous les membres dans la fenêtre de précision.
**Paramètres** : tempo, largeur de la fenêtre de précision, durée totale.
**Résolution** : équipe qualifiée si le score global de précision dépasse un seuil.
**Note technique** : chaque clic comparé au tempo serveur, score agrégé calculé en temps réel côté serveur.

### 4.13 La cartographie
**Concept** : explorer par tâtonnement pour identifier collectivement les zones sûres d'une grille cachée.
**Déroulement** : chaque membre teste des cases (à tour de rôle ou en parallèle limité) ; une case testée révèle "sûre" ou "danger" à toute l'équipe. L'objectif est de tracer un chemin sûr complet avant la fin du temps.
**Paramètres** : taille de la grille, proportion de cases dangereuses, nombre de tests autorisés.
**Résolution** : équipe qualifiée si un chemin sûr complet est tracé dans le temps/nombre de tests imparti.
**Note technique** : grille de danger générée et stockée server-side, résultat de chaque test partagé en temps réel à tous les membres de la room.

### 4.14 Le marché troc
**Concept** : les membres échangent des ressources entre eux avant une épreuve qui nécessite un lot précis de ressources.
**Déroulement** : chaque membre reçoit des ressources différentes en quantités inégales. Phase de troc (chat limité) pour redistribuer avant l'épreuve, qui nécessite qu'au moins un membre atteigne un lot cible précis.
**Paramètres** : types et quantités de ressources, durée du troc, lot cible requis.
**Résolution** : équipe qualifiée si le lot cible est atteint par au moins un membre à la fin du troc.
**Note technique** : inventaire de chaque membre suivi en room state, transferts validés server-side (pas de double dépense possible).

### 4.15 Le bouclier
**Concept** : coordonner les membres pour bloquer une série d'attaques simulées.
**Déroulement** : des "attaques" apparaissent sur différents côtés d'un plateau commun ; chaque membre doit cliquer pour bloquer les attaques de son côté assigné. Une attaque non bloquée réduit la jauge de vie collective de l'équipe.
**Paramètres** : fréquence des attaques, nombre de côtés/membres, jauge de vie de départ.
**Résolution** : équipe qualifiée si la jauge de vie collective reste au-dessus de zéro à la fin du temps imparti.
**Note technique** : attaques générées server-side avec position et timing, validation du blocage par comparaison de la position du clic et du côté assigné.

### 4.16 La pyramide de points
**Concept** : l'équipe doit décider d'une hiérarchie de répartition avant de savoir le résultat de l'épreuve collective.
**Déroulement** : avant l'épreuve, vote ou discussion pour établir un ordre de priorité de répartition (qui reçoit en premier, deuxième, etc. sur les gains). L'épreuve collective se déroule ensuite normalement (ex: rapidité collective), et les gains sont distribués selon l'ordre décidé, du haut vers le bas jusqu'à épuisement du pot.
**Paramètres** : durée de la discussion de hiérarchie, taille du pot, type d'épreuve.
**Résolution** : distribution des gains selon la hiérarchie décidée et le pot obtenu à l'épreuve.
**Note technique** : ordre de hiérarchie stocké en room state avant le début de l'épreuve, distribution calculée automatiquement server-side après résolution du pot.

### 4.17 Le compte à trois
**Concept** : tous les membres doivent cliquer dans une fenêtre de temps minuscule et commune.
**Déroulement** : un compte à rebours est diffusé à toute l'équipe (ex: "cliquez à exactement 10 secondes"). Tous cliquent sans concertation en temps réel. La manche réussit seulement si l'écart entre le clic le plus rapide et le plus lent est sous un seuil.
**Paramètres** : cible de temps, seuil de tolérance global, nombre de manches.
**Résolution** : équipe qualifiée selon le nombre de manches réussies (écart sous le seuil).
**Note technique** : tous les timestamps de clic comparés server-side, calcul de l'écart max entre tous les membres avec correction de latence individuelle.

### 4.18 Le sacrifice
**Concept** : l'équipe peut voter pour exclure un membre afin d'augmenter les gains des autres.
**Déroulement** : après une épreuve collective standard qui génère un pot commun, l'équipe vote (majorité) pour éventuellement exclure un membre du partage des gains, ce qui augmente la part des membres restants.
**Paramètres** : type d'épreuve initiale, règle de majorité pour le vote de sacrifice, effet sur le partage (proportionnel au nombre exclu).
**Résolution** : si le vote de sacrifice passe, le membre exclu ne reçoit rien et les autres se partagent son dû ; sinon partage égal entre tous.
**Note technique** : vote résolu server-side par majorité simple, redistribution des gains calculée automatiquement selon le résultat du vote.

### 4.19 Le fil rouge
**Concept** : les membres sont liés par un risque partagé — l'échec de l'un affecte le score de tous.
**Déroulement** : chaque membre réalise un mini-défi individuel (ex: réaction ou précision), mais le score final de l'équipe est celui du membre le plus faible (façon "maillon faible"), ce qui incite le groupe à s'entraider avant l'épreuve (conseils via chat) plutôt que pendant.
**Paramètres** : type de mini-défi individuel, durée de la phase de conseils avant l'épreuve.
**Résolution** : score de l'équipe = score du membre le plus faible ; qualification selon ce score minimal.
**Note technique** : scores individuels calculés en parallèle côté serveur, score d'équipe dérivé comme le minimum du groupe.

### 4.20 La négociation finale
**Concept** : l'équipe entière doit s'accorder sur un ratio final de distribution du pot avant qu'il ne soit validé.
**Déroulement** : après avoir gagné collectivement un pot (via n'importe quelle épreuve d'équipe), le groupe dispose d'un temps de négociation libre pour proposer et voter un ratio de répartition. Si aucun accord n'est trouvé dans le temps imparti, répartition égale par défaut est appliquée.
**Paramètres** : durée de négociation, mécanisme de vote (majorité ou unanimité), règle de répartition par défaut.
**Résolution** : ratio voté appliqué si le seuil de vote est atteint ; sinon répartition égale automatique.
**Note technique** : propositions de ratio stockées en room state, vote final résolu server-side selon la règle configurée (majorité/unanimité).

---
# Catalogue de mini-jeux — Section 5

## 5. Rounds Survie collective

Tout le monde joue en simultané contre la même menace (chrono, jauge, mécanique environnementale) — pas d'alliance ni de rôle caché ici. Seul un pourcentage ou un nombre fixe du groupe est éliminé à chaque round. La tension vient de la pression collective et du timing, pas de la négociation sociale.

### 5.1 1,2,3 Soleil digital
**Concept** : un signal alterne entre "safe" (les joueurs peuvent avancer) et "danger" (immobilité totale requise) ; bouger pendant "danger" élimine.
**Déroulement** : le serveur diffuse l'état courant à intervalles irréguliers (aléatoire dans une plage). Pendant "safe", chaque joueur fait progresser une jauge personnelle (input continu : maintien de touche, glissé). Pendant "danger", tout input détecté élimine immédiatement.
**Paramètres** : durée des phases safe/danger (plage aléatoire), distance à parcourir, durée totale du round, tolérance de détection pendant danger.
**Résolution** : qualifiés = joueurs ayant atteint la ligne d'arrivée avant la fin du round ; éliminés = joueurs pris en mouvement pendant danger ou n'ayant pas fini à temps.
**Note technique** : bascule safe/danger décidée et horodatée server-side ; chaque input est comparé à la fenêtre danger avec une marge de tolérance réseau (jamais basé sur l'affichage local).

### 5.2 Zones qui rétrécissent
**Concept** : des cases "sûres" sur une grille diminuent en nombre à chaque tour ; les joueurs sans case sont éliminés.
**Déroulement** : une grille de cases sûres est affichée, chaque joueur doit s'y positionner avant la fin d'un compte à rebours court. Au signal, les cases en surnombre sont retirées et le nombre de cases sûres diminue au tour suivant.
**Paramètres** : nombre de cases initial, taux de réduction par tour, durée du compte à rebours, règle de sur-occupation (une case = un joueur, premier arrivé).
**Résolution** : à chaque tour, les joueurs sans case validée sont éliminés ; le round se termine au nombre de qualifiés visé.
**Note technique** : occupation résolue server-side par ordre d'arrivée des messages ; nombre de cases du tour suivant calculé après résolution du tour précédent.

### 5.3 Dernier debout
**Concept** : tout le monde clique en boucle pour "tenir" une jauge personnelle active ; qui relâche ou est trop lent est éliminé.
**Déroulement** : chaque joueur doit maintenir une fréquence de clic minimale (ou garder un bouton enfoncé). Le serveur vérifie à intervalles réguliers ("checks") que chaque joueur est toujours actif ; inactivité à un check = élimination immédiate.
**Paramètres** : fréquence minimale requise, intervalle entre checks, durée max du round.
**Résolution** : éliminés = joueurs sous le seuil à un check ; qualifiés = derniers joueurs actifs (nombre selon `winnersCount`).
**Note technique** : activité mesurée via timestamps d'input reçus côté serveur (pas de simple flag client, pour détecter les patterns d'auto-clic suspects) ; checks avec léger jitter aléatoire non prévisible côté client.

### 5.4 Le sol qui s'effondre
**Concept** : un sol en cases s'effondre progressivement sous les joueurs, qui doivent se déplacer vers les cases encore intactes.
**Déroulement** : à intervalles réguliers, un sous-ensemble de cases est marqué pour effondrement avec un court délai d'alerte visuelle, puis disparaît. Les joueurs doivent quitter leur case avant son effondrement.
**Paramètres** : taille de la grille, fréquence des vagues, délai d'alerte, proportion de cases effondrées par vague.
**Résolution** : éliminé = joueur présent sur une case au moment de son effondrement ; qualifiés = joueurs encore sur case intacte à la fin du temps imparti.
**Note technique** : état de chaque case géré en room state ; position du joueur vérifiée server-side à l'instant précis de l'effondrement (pas de tolérance visuelle client qui désynchroniserait le rendu).

### 5.5 Le rayon balayeur
**Concept** : un rayon (ou une ombre) balaie l'écran régulièrement ou aléatoirement ; être touché élimine.
**Déroulement** : une ligne (verticale, horizontale ou rotative) traverse le plateau commun à vitesse variable. Les joueurs se déplacent librement pour l'éviter ; contact = élimination.
**Paramètres** : vitesse et trajectoire (linéaire, rotative, aléatoire), largeur du rayon, taille du plateau, durée totale.
**Résolution** : éliminés = joueurs touchés ; qualifiés = joueurs encore en jeu à la fin du temps (ou selon `winnersCount`).
**Note technique** : position du rayon calculée par fonction déterministe côté serveur à chaque tick ; collision vérifiée par comparaison des coordonnées joueur/rayon à chaque tick serveur.

### 5.6 La chaise musicale digitale
**Concept** : variante des chaises musicales — moins de places sûres que de joueurs quand la musique s'arrête.
**Déroulement** : une musique/minuterie tourne pendant une durée aléatoire pendant que les joueurs se déplacent librement entre des places affichées. À l'arrêt (signal serveur), chaque joueur doit valider une place ; il y a toujours moins de places que de joueurs restants.
**Paramètres** : nombre de places par tour (< joueurs restants), durée aléatoire de la musique, fenêtre de validation après l'arrêt.
**Résolution** : joueurs sans place validée à temps sont éliminés ; le tour se répète avec une place en moins jusqu'au nombre de qualifiés visé.
**Note technique** : arrêt déclenché et horodaté server-side à un instant non prévisible ; validation de place résolue par ordre d'arrivée des messages serveur (place verrouillée au premier arrivé).

### 5.7 Le silence mortel
**Concept** : variante audio pure du "1,2,3 soleil" — un signal sonore d'alerte impose l'immobilité, sans repère visuel, pour forcer l'écoute active.
**Déroulement** : un fond sonore neutre joue en continu ; à intervalles irréguliers, un son distinct retentit brièvement. Pendant les X ms suivants, tout mouvement élimine. Le reste du temps, les joueurs avancent librement vers un objectif.
**Paramètres** : fréquence et durée des alertes, fenêtre d'immobilité après chaque alerte, distance à parcourir, durée totale.
**Résolution** : éliminés = joueurs en mouvement pendant une fenêtre d'alerte ; qualifiés = joueurs ayant atteint l'objectif sans être éliminés.
**Note technique** : déclenchement de l'alerte horodaté et diffusé server-side avec correction de latence audio/réseau par joueur (mesurée en amont), marge de tolérance pour éviter les faux positifs liés au décalage de lecture.

### 5.8 Le pont de lumières
**Concept** : un chemin de dalles sûres/piégées est à mémoriser à partir d'un indice visuel très bref.
**Déroulement** : une rangée de dalles s'illumine brièvement pour indiquer un chemin sûr temporaire, puis s'éteint. Les joueurs avancent en se souvenant du chemin ; une dalle piégée élimine au contact.
**Paramètres** : longueur du pont, durée d'affichage de l'indice, proportion de dalles piégées, temps total pour traverser.
**Résolution** : éliminés = joueurs sur une dalle piégée ; qualifiés = joueurs ayant atteint l'autre bout dans le temps imparti.
**Note technique** : disposition sûr/piégé générée et stockée server-side (jamais transmise en clair, seul l'indice temporaire est envoyé) ; chaque pas vérifié contre la disposition réelle côté serveur.

### 5.9 La marée montante
**Concept** : un niveau d'eau commun monte progressivement ; les joueurs doivent grimper sur des plateformes de plus en plus hautes/rares pour rester au sec.
**Déroulement** : une jauge de niveau d'eau visible par tous augmente à intervalle régulier. Chaque joueur doit se positionner sur une plateforme dont la hauteur dépasse le niveau courant ; les plateformes basses deviennent inaccessibles au fil du temps.
**Paramètres** : vitesse de montée de l'eau, nombre et hauteur des plateformes, durée totale.
**Résolution** : éliminé = joueur sous le niveau d'eau à un check ; qualifiés = joueurs restant au-dessus jusqu'au nombre visé.
**Note technique** : niveau d'eau calculé server-side par tick et diffusé ; position de chaque joueur vérifiée contre le niveau à chaque check.

### 5.10 Le radeau qui coule
**Concept** : un radeau commun a une flottabilité limitée qui diminue ; les joueurs doivent sauter volontairement ou risquer le naufrage collectif.
**Déroulement** : tous les joueurs commencent "à bord" ; la flottabilité diminue avec le temps (ou avec le nombre de joueurs à bord). Si elle atteint zéro avec des joueurs encore à bord, tous les joueurs présents à cet instant sont éliminés. Un bouton "sauter" permet de se retirer volontairement pour rester qualifié, au prix d'un moins bon classement.
**Paramètres** : vitesse de décroissance de la flottabilité, temps total avant naufrage, avantage de classement pour ceux qui restent le plus longtemps.
**Résolution** : joueurs encore à bord au naufrage = éliminés ; joueurs ayant sauté à temps = qualifiés, classés par ordre inverse du temps passé à bord.
**Note technique** : flottabilité recalculée server-side à chaque tick selon le nombre à bord ; action de saut horodatée et traitée en priorité absolue avant le calcul du naufrage au même tick.

### 5.11 La ligne de feu
**Concept** : des obstacles mobiles traversent le plateau à intervalles réguliers ; les joueurs se positionnent dans les intervalles sûrs.
**Déroulement** : une ou plusieurs lignes d'obstacles traversent le plateau commun selon un pattern (aléatoire ou cyclique). Les joueurs se déplacent librement pour éviter le contact ; contact = élimination immédiate.
**Paramètres** : nombre de lignes, vitesse et espacement, taille du plateau, durée totale.
**Résolution** : éliminés = joueurs touchés ; qualifiés = joueurs encore en jeu à la fin du temps (ou selon `winnersCount`).
**Note technique** : trajectoires calculées de façon déterministe côté serveur (seed loguée pour audit) ; collision vérifiée par comparaison de coordonnées à chaque tick.

### 5.12 La bulle commune
**Concept** : une jauge partagée gonfle avec les actions cumulées de tous les joueurs ; au-delà d'un seuil, elle explose et élimine une partie du groupe.
**Déroulement** : chaque joueur contribue à une jauge commune visible en temps réel via ses actions. Si elle dépasse un seuil critique, elle explose : un pourcentage des plus gros contributeurs récents (ou un tirage parmi les contributeurs) est éliminé.
**Paramètres** : seuil critique (exact ou flouté), pourcentage éliminé à l'explosion, durée totale, visibilité de la jauge.
**Résolution** : après explosion (ou à la fin du temps sans explosion), les joueurs restants sont qualifiés.
**Note technique** : contribution de chaque joueur suivie individuellement côté serveur pour la sélection en cas d'explosion ; seuil réel jamais transmis en clair si le mode flouté est activé.

### 5.13 Le poids du groupe
**Concept** : une plateforme en équilibre (bascule) réagit au positionnement des joueurs ; un déséquilibre trop fort fait tomber un côté.
**Déroulement** : les joueurs se répartissent librement entre plusieurs zones d'une plateforme commune avec jauge d'équilibre visible. Si un côté devient trop chargé au-delà d'un seuil pendant un temps donné, il s'effondre et élimine les joueurs qui y sont.
**Paramètres** : seuil de déséquilibre tolérable, temps de tolérance avant effondrement, nombre de zones, durée totale.
**Résolution** : éliminés = joueurs du côté effondré ; qualifiés = joueurs des côtés restés stables à la fin.
**Note technique** : position de chaque joueur suivie en room state, calcul de la charge et du déséquilibre fait server-side à chaque tick ; effondrement déclenché uniquement par le serveur.

### 5.14 Le vote d'élimination express
**Concept** : le groupe vote directement pour éliminer un pourcentage de joueurs, sans rôle caché ni tâche — un vote de survie pur.
**Déroulement** : une courte discussion collective (chat commun limité) précède un vote simultané où chaque joueur désigne un ou plusieurs autres à éliminer. Les plus votés sont éliminés jusqu'au quota du tour.
**Paramètres** : durée de la discussion, nombre de votes par joueur, quota d'éliminés par tour, règle de départage en cas d'égalité.
**Résolution** : éliminés = joueurs les plus votés jusqu'au quota ; qualifiés = tous les autres.
**Note technique** : votes collectés en room state et révélés uniquement après clôture du scrutin (pas de compteur en direct, pour éviter l'effet moutonnier) ; départage par tirage aléatoire audité si nécessaire.

### 5.15 La roue du hasard collective
**Concept** : une élimination partiellement aléatoire et transparente, où chacun influence légèrement ses chances via une action simple.
**Déroulement** : chaque joueur effectue une action rapide (mini-défi de précision très court) dont le résultat pondère son poids dans un tirage au sort final. Le tirage élimine un pourcentage de joueurs, avec une probabilité inversement proportionnelle à leur performance.
**Paramètres** : type de mini-défi de pondération, quota d'éliminés, formule de pondération du tirage.
**Résolution** : éliminés = joueurs tirés au sort selon la pondération, jusqu'au quota ; qualifiés = les autres.
**Note technique** : RNG exécuté et logué côté serveur avec seed vérifiable pour audit ; pondérations calculées à partir des performances mesurées server-side avant le tirage.

### 5.16 La bombe partagée
**Concept** : un compte à rebours commun doit être "désamorcé" collectivement par des actions individuelles suffisantes avant zéro, sinon une partie du groupe est éliminée.
**Déroulement** : une jauge de désamorçage commune doit atteindre 100% avant la fin d'un compte à rebours visible, via la contribution cumulée de tous les joueurs. Si le compte atteint zéro sans jauge pleine, les moins contributeurs sont éliminés.
**Paramètres** : durée du compte à rebours, vitesse de remplissage par action, seuil de contribution minimale individuelle.
**Résolution** : si la jauge atteint 100% à temps, tout le monde est qualifié ; sinon, les joueurs sous le seuil de contribution sont éliminés.
**Note technique** : contribution de chaque joueur trackée séparément côté serveur pour permettre le classement en cas d'échec collectif ; jauge globale recalculée à chaque tick.

### 5.17 Le cercle qui tourne
**Concept** : une plateforme circulaire divisée en secteurs tourne ; seuls certains secteurs sont sûrs à un instant donné.
**Déroulement** : le plateau est divisé en secteurs autour d'un cercle ; un sous-ensemble est marqué "sûr" à chaque instant, ce marquage tourne progressivement (façon aiguille d'horloge). Les joueurs se déplacent pour rester dans un secteur sûr au moment des checks.
**Paramètres** : nombre de secteurs, proportion de secteurs sûrs, vitesse de rotation, fréquence des checks.
**Résolution** : éliminés = joueurs dans un secteur non-sûr à un check ; qualifiés = joueurs survivants à la fin du temps imparti.
**Note technique** : position des secteurs sûrs calculée par fonction de rotation déterministe côté serveur ; position de chaque joueur vérifiée contre le secteur sûr courant à chaque check.

### 5.18 Les dominos
**Concept** : une réaction en chaîne se propage sur le plateau ; les joueurs doivent s'écarter de la trajectoire avant qu'elle ne les atteigne.
**Déroulement** : un point de départ déclenche une propagation visuelle (façon dominos qui tombent) qui avance case par case selon un pattern défini (ligne, vague, ramifications). Chaque joueur atteint par la propagation à son tour est éliminé, sauf s'il s'est déplacé hors de la trajectoire à temps.
**Paramètres** : vitesse de propagation, pattern (ligne droite, vague, ramifications), taille du plateau.
**Résolution** : éliminés = joueurs atteints par la propagation ; qualifiés = joueurs ayant esquivé jusqu'à la fin du round.
**Note technique** : trajectoire de propagation calculée de façon déterministe et diffusée avec un préavis minimal juste avant l'arrivée sur chaque case, côté serveur ; position des joueurs vérifiée à chaque étape.

### 5.19 Le sprint des lucioles
**Concept** : des points lumineux temporaires apparaissent sur le plateau ; chaque joueur doit en collecter un minimum avant la fin du temps pour survivre.
**Déroulement** : des lucioles apparaissent aléatoirement pendant un court instant chacune, puis disparaissent si non collectées (clic/déplacement dessus). Chaque joueur doit atteindre un quota individuel avant la fin du round.
**Paramètres** : fréquence d'apparition, durée de vie de chaque luciole, quota individuel requis, durée totale.
**Résolution** : éliminés = joueurs n'ayant pas atteint leur quota à la fin du temps imparti ; qualifiés = les autres.
**Note technique** : apparition et retrait des lucioles gérés server-side avec horodatage ; collecte validée par le premier clic reçu sur une luciole encore active (anti-doublon).

### 5.20 La dernière lumière
**Concept** : chaque joueur possède une jauge de lumière individuelle qui décroît naturellement ; il doit la ranimer par des actions répétées avant qu'elle ne s'éteigne totalement.
**Déroulement** : la jauge personnelle décroît en continu ; des actions (clics, mini-tâches rapides) la rechargent. Si la jauge d'un joueur atteint zéro, il est éliminé.
**Paramètres** : vitesse de décroissance naturelle, quantité rechargée par action, durée totale du round.
**Résolution** : éliminés = joueurs dont la jauge atteint zéro avant la fin du round ; qualifiés = joueurs dont la lumière est encore active (ou selon `winnersCount`).
**Note technique** : jauge de chaque joueur calculée et mise à jour exclusivement côté serveur à chaque tick à partir des actions reçues ; élimination déclenchée dès que la jauge calculée atteint zéro, jamais dépendante de l'affichage client.

---

# Catalogue de mini-jeux — Section 6

## 6. Rounds Rôle caché

Un ou plusieurs joueurs reçoivent un rôle secret (traître, saboteur, imposteur) pendant une tâche collective standard. Discussion limitée dans le temps, puis vote d'élimination/démasquage. Version allégée façon Among Us : jamais de tâches physiques complexes ni de négociation IA — juste un rôle secret simple, une tâche empruntée aux autres familles de rounds, et un vote.

### 6.1 Le saboteur
**Concept** : un joueur tiré au sort doit empêcher discrètement le groupe de valider une tâche commune.
**Déroulement** : le groupe reçoit une tâche collective simple (ex : valider un calcul commun en accumulant les chiffres soumis par chacun). Le saboteur reçoit en privé l'instruction de fausser discrètement un chiffre. Après un temps de discussion court, vote unique pour désigner le suspect.
**Paramètres** : durée de la tâche, durée de la discussion, nombre de saboteurs (1 par défaut), majorité requise pour le vote.
**Résolution** : bonne désignation = la tâche est validée pour le groupe malgré le sabotage et le saboteur est éliminé ; mauvaise désignation = le vote échoue et le groupe subit une pénalité collective (ex : élimination aléatoire ou blocage d'un tour).
**Note technique** : rôle assigné et connu uniquement du joueur concerné (message privé server-side) ; action de sabotage journalisée côté serveur pour audit post-vote, jamais visible pendant la partie.

### 6.2 L'imposteur silencieux
**Concept** : un joueur ne reçoit pas la même information que les autres et doit bluffer pour ne pas se faire repérer.
**Déroulement** : tout le groupe reçoit la même consigne sauf l'imposteur, qui reçoit une version différente ou absente (ex : décrire un objet affiché à l'écran, que l'imposteur ne voit pas et doit improviser). Discussion, puis vote.
**Paramètres** : durée d'affichage de l'info aux non-imposteurs, durée de discussion, nombre d'imposteurs.
**Résolution** : bonne désignation = imposteur éliminé et groupe validé ; mauvaise désignation = le joueur accusé à tort est éliminé à sa place.
**Note technique** : contenu affiché différent selon le rôle, envoyé par canal privé (deux versions de la consigne en room state) ; aucune fuite possible via un état partagé unique.

### 6.3 Le double agent
**Concept** : deux saboteurs coordonnent leur sabotage sans se faire repérer ni se découvrir publiquement.
**Déroulement** : même mécanique que "Le saboteur" mais avec deux rôles secrets, qui connaissent mutuellement leur identité via un canal privé, sans pouvoir se coordonner ouvertement dans le chat public.
**Paramètres** : durée de la tâche, durée de discussion, quota d'éliminés par vote (1 ou 2 selon config).
**Résolution** : au moins un saboteur démasqué = tâche validée pour le reste du groupe ; aucun démasqué = pénalité collective.
**Note technique** : canal privé dédié entre les deux saboteurs (sous-room ou flag serveur), distinct et invisible du chat public utilisé pour le vote.

### 6.4 La carte truquée
**Concept** : un joueur reçoit un objectif légèrement différent qu'il doit faire passer pour l'objectif commun.
**Déroulement** : chaque joueur reçoit une carte d'objectif (ex : "trouver le nombre pair le plus grand"), sauf le traître qui en reçoit une variante et doit orienter la discussion vers une réponse erronée.
**Paramètres** : durée de discussion, complexité de l'objectif, nombre de traîtres.
**Résolution** : réponse commune correcte = tous validés (sauf traître démasqué séparément) ; réponse incorrecte = pénalité collective.
**Note technique** : objectifs réels stockés séparément par rôle côté serveur ; la réponse finale du groupe est comparée à l'objectif réel, jamais à celui du traître.

### 6.5 Le faux témoin
**Concept** : lors d'une mini-enquête collective, un joueur détient une fausse information à injecter sans se faire remarquer.
**Déroulement** : le groupe doit résoudre une petite énigme de déduction à partir d'indices partagés par chacun. Le faux témoin reçoit un indice légèrement modifié qu'il partage comme s'il était vrai.
**Paramètres** : nombre d'indices, durée de partage/discussion, durée du vote final.
**Résolution** : bonne résolution de l'énigme = tous validés (sauf faux témoin démasqué) ; mauvaise résolution = pénalité collective.
**Note technique** : indices réels et faux indices stockés séparément server-side ; la réponse finale est comparée à la solution réelle, jamais à la version du faux témoin.

### 6.6 Le voleur silencieux
**Concept** : un joueur prélève discrètement des points d'une cagnotte commune sans se faire remarquer.
**Déroulement** : une cagnotte commune grossit automatiquement, visible par tous. Le voleur reçoit en secret la capacité de prélever une petite portion à intervalles réguliers, avec un léger différé d'affichage qui masque le prélèvement en temps réel.
**Paramètres** : vitesse de croissance de la cagnotte, montant prélevable, fréquence de prélèvement, durée totale.
**Résolution** : la cagnotte restante est partagée entre les non-voleurs à la fin ; un vote final peut démasquer le voleur et lui retirer son gain volé.
**Note technique** : montant réel et prélèvements suivis exclusivement côté serveur ; l'affichage public tolère un léger délai pour masquer les prélèvements en direct.

### 6.7 L'espion des couleurs
**Concept** : dans une tâche de reconnaissance de motif, seul le traître connaît la vraie règle et doit orienter le groupe vers une erreur.
**Déroulement** : le groupe doit s'accorder sur une règle de tri (ex : classer des formes par couleur) à partir d'exemples partagés. Le traître connaît la vraie règle mais argumente en faveur d'une règle légèrement fausse.
**Paramètres** : complexité du motif, durée de discussion, nombre de traîtres.
**Résolution** : réponse commune correcte = tous validés ; le traître marque un bonus si sa désinformation fait échouer le groupe sans être démasqué au vote suivant.
**Note technique** : règle réelle stockée server-side, jamais exposée en clair avant soumission finale ; le vote de démasquage est traité séparément de la validation de tâche.

### 6.8 Le menteur du groupe
**Concept** : à chaque manche, le traître doit donner une réponse fausse à une question commune et la justifier de façon crédible.
**Déroulement** : une question courte est posée au groupe (ex : estimation d'une quantité). Chacun répond publiquement à tour de rôle avec une brève justification. Le traître ment sciemment tout en argumentant comme s'il disait vrai.
**Paramètres** : nombre de manches, temps de réponse/justification, nombre de traîtres.
**Résolution** : après plusieurs manches, vote pour désigner le(s) suspect(s) ; bonne désignation = bonus pour les votants ; traître non démasqué après N manches = bonus pour lui.
**Note technique** : réponse réelle du traître enregistrée server-side pour vérifier la cohérence de son discours a posteriori, sans être révélée avant le vote.

### 6.9 La preuve cachée
**Concept** : chaque joueur a un alibi secret, le traître doit inventer le sien sans se contredire.
**Déroulement** : chaque joueur reçoit une fiche décrivant une action fictive effectuée pendant un laps de temps donné. Le traître reçoit une fiche vide et doit improviser un alibi cohérent en le communiquant pendant la discussion.
**Paramètres** : nombre de détails par fiche, durée de discussion, nombre de traîtres.
**Résolution** : vote final pour désigner l'alibi le moins cohérent ; bonne désignation élimine le traître, mauvaise élimine un innocent à sa place.
**Note technique** : fiches réelles générées et stockées server-side par joueur (jamais partagées automatiquement entre clients), permettant de vérifier la cohérence des alibis après coup.

### 6.10 Le pion secret
**Concept** : un joueur reçoit pour mission de déplacer discrètement un jeton commun vers un mauvais emplacement.
**Déroulement** : le groupe déplace collectivement un jeton virtuel vers une case cible en votant à chaque tour sur le prochain mouvement. Le traître, quand vient son tour de proposer, essaie de faire dévier le jeton sans paraître suspect.
**Paramètres** : taille du plateau, nombre de tours, majorité requise pour valider chaque mouvement.
**Résolution** : jeton arrivé à la case cible dans le nombre de tours imparti = manche validée (sauf traître démasqué séparément) ; sinon pénalité collective.
**Note technique** : position réelle du jeton et cible stockées server-side, chaque proposition de mouvement journalisée avec l'identité du proposant pour analyse post-manche.

### 6.11 Le validateur corrompu
**Concept** : un joueur reçoit secrètement le pouvoir d'approuver ou rejeter la progression collective, et peut en abuser.
**Déroulement** : le groupe réalise une tâche standard (ex : reproduire un motif), puis un joueur tiré au sort (le "validateur") valide ou rejette le résultat final via un simple bouton, sans justification visible.
**Paramètres** : type de tâche initiale, durée de la tâche, transparence du rôle de validateur (connu ou secret).
**Résolution** : résultat objectivement bon validé = groupe qualifié ; sinon pénalité, avec vote possible ensuite pour démasquer un abus de pouvoir.
**Note technique** : résultat réel de la tâche évalué server-side indépendamment de la décision du validateur, permettant de détecter un abus a posteriori.

### 6.12 Le compte faussé
**Concept** : dans une tâche de calcul collectif, le traître glisse discrètement une mauvaise information dans le total.
**Déroulement** : chaque joueur propose sa contribution au total du groupe. Le traître annonce un nombre légèrement différent du sien sans que cela soit trop visible, faussant la somme finale.
**Paramètres** : nombre de contributeurs, plage des nombres, seuil de tolérance d'erreur sur la somme finale.
**Résolution** : somme annoncée conforme (à la tolérance près) à la vraie somme calculée server-side = manche validée ; sinon pénalité, avec vote de démasquage possible.
**Note technique** : vraie contribution de chaque joueur stockée server-side séparément de ce qu'il annonce publiquement, pour vérifier qui a menti après coup.

### 6.13 L'allié fantôme
**Concept** : dans un round d'équipe, un joueur infiltré prétend aider mais sabote discrètement l'effort collectif.
**Déroulement** : une petite équipe réalise une épreuve collective standard (ex : construction collective). Un membre est secrètement désigné "allié fantôme" et doit commettre une erreur discrète (mauvaise pièce, mauvais timing) sans que cela paraisse volontaire.
**Paramètres** : type d'épreuve collective, taille de l'équipe, nombre d'alliés fantômes.
**Résolution** : épreuve échouée = vote de démasquage ensuite ; bonne désignation = bonus de consolation pour les autres malgré l'échec.
**Note technique** : action de sabotage effectuée via les mêmes inputs que les autres joueurs mais journalisée avec un flag serveur "intentionnelle" pour l'analyse du vote, jamais visible pendant la partie.

### 6.14 Le chronomètre sabordé
**Concept** : le traître peut discrètement ralentir une tâche collective chronométrée sans se faire remarquer.
**Déroulement** : le groupe valide une tâche commune (ex : bombe partagée) avant la fin d'un compte à rebours. Le traître dispose d'un bouton privé qui ralentit légèrement le remplissage de la jauge commune à chaque activation, sans indication publique de l'auteur.
**Paramètres** : durée du compte à rebours, effet de ralentissement par activation, cooldown entre deux activations.
**Résolution** : jauge à 100% à temps = tous qualifiés (sauf traître démasqué à part) ; sinon pénalité collective avec vote de démasquage.
**Note technique** : activations du traître enregistrées avec timestamp server-side pour audit post-manche ; effet appliqué uniquement à la jauge serveur, jamais visible comme action distincte dans le flux public.

### 6.15 Le messager corrompu
**Concept** : dans une tâche de relais d'information, le traître altère discrètement le message transmis.
**Déroulement** : une information est transmise de joueur en joueur (façon "téléphone arabe") jusqu'à un point de validation final. Le traître, en recevant le message, le modifie légèrement avant de le retransmettre.
**Paramètres** : longueur de la chaîne de joueurs, complexité du message, temps de transmission par maillon.
**Résolution** : message final fidèle à l'original = manche validée (sauf traître démasqué séparément) ; sinon pénalité collective avec vote de démasquage.
**Note technique** : message original et chaque version transmise journalisés server-side à chaque maillon, permettant d'identifier précisément où l'altération a eu lieu.

### 6.16 Le jury caché
**Concept** : un joueur détient secrètement un droit de veto sur les votes collectifs du groupe.
**Déroulement** : le groupe organise un vote standard (répartition, élimination). Un joueur tiré au sort peut, une fois par partie, annuler le résultat du vote et le remplacer par son choix personnel, sans annonce publique.
**Paramètres** : nombre d'utilisations du veto autorisées, transparence du résultat (annoncé après coup ou jamais).
**Résolution** : résultat appliqué = celui du veto si utilisé, sinon celui du vote normal ; un vote de démasquage ultérieur permet de sanctionner le détenteur identifié.
**Note technique** : résultat du vote normal et décision de veto stockés séparément côté serveur, avec log de l'utilisation pour analyse post-partie sans exposition en direct.

### 6.17 La fausse alerte
**Concept** : dans un round de survie collective, le traître déclenche secrètement de faux signaux de danger pour piéger les innocents.
**Déroulement** : le groupe joue une variante du "1,2,3 soleil" ; en plus du signal serveur normal, le traître dispose d'un bouton caché qui déclenche une fausse alerte à un moment de son choix, dans la limite d'un cooldown.
**Paramètres** : cooldown entre deux fausses alertes, durée de la fausse alerte, nombre d'utilisations max par manche.
**Résolution** : les joueurs piégés subissent une pénalité de temps (pas d'élimination directe, pour éviter une sanction injuste irréversible) ; un vote de démasquage final sanctionne le traître identifié.
**Note technique** : origine de chaque alerte (réelle ou fausse) journalisée server-side avec l'identité de l'émetteur, jamais révélée en direct aux autres joueurs.

### 6.18 Le sondeur menteur
**Concept** : le traître répond malhonnêtement à un sondage de groupe pour fausser la perception collective.
**Déroulement** : le groupe répond à une série de questions rapides dont les résultats agrégés orientent une décision collective (ex : stratégie pour la manche suivante). Le traître répond délibérément à l'inverse de sa vraie opinion.
**Paramètres** : nombre de questions, visibilité des résultats individuels (anonyme ou nominatif), poids du sondage sur la décision finale.
**Résolution** : décision collective appliquée selon le résultat du sondage (potentiellement biaisé) ; un vote de démasquage séparé peut identifier le traître si les résultats sont incohérents avec son comportement observé.
**Note technique** : réponses individuelles stockées server-side avec identité du répondant (même en affichage anonyme), permettant une analyse de cohérence a posteriori.

### 6.19 Le pacte secret
**Concept** : deux traîtres se connaissent mutuellement mais ne doivent surtout pas être vus en train de collaborer publiquement.
**Déroulement** : deux joueurs reçoivent le rôle de traître et sont informés de l'identité de l'autre via un canal privé. Ensemble, ils doivent faire échouer une tâche collective standard sans jamais échanger publiquement de façon suspecte (le chat public reste journalisé pour le vote final).
**Paramètres** : type de tâche collective, durée de la tâche, durée du vote final.
**Résolution** : tâche échouée et aucun des deux démasqué = bonus commun aux traîtres ; traître(s) démasqué(s) = éliminé(s).
**Note technique** : canal privé entre les deux traîtres géré comme sous-room dédiée invisible aux autres joueurs ; chat public journalisé intégralement pour l'analyse du vote.

### 6.20 Le remplaçant
**Concept** : le traître échange secrètement sa fiche d'objectif avec celle d'un autre joueur, à son insu.
**Déroulement** : chaque joueur reçoit une fiche d'objectif individuel à réaliser. Le traître dispose d'une action unique lui permettant d'échanger sa fiche avec celle d'un autre joueur de son choix, sans que ce dernier en soit informé, avant la fin de la phase de préparation.
**Paramètres** : durée de la phase de préparation, nombre d'échanges autorisés (1 par défaut), moment limite pour échanger.
**Résolution** : chaque joueur est évalué sur la fiche qu'il détient réellement au moment de la validation (potentiellement celle d'un autre) ; le joueur lésé peut voter pour démasquer le traître en fin de manche s'il soupçonne l'échange.
**Note technique** : fiches et propriétaire réel suivis en room state à tout moment (mise à jour lors de l'échange) ; le joueur floué ne reçoit aucune notification client de l'échange, pour préserver le secret jusqu'à la résolution.

---

Fin du catalogue — 120 jeux (6 catégories × 20). Les sections 1 à 6 partagent toutes la même architecture de room (état géré côté serveur, timers serveur, RNG loguée), ce qui permet de les généraliser facilement dans `game-engine` comme des familles de mini-jeux paramétrables plutôt que 120 implémentations isolées.
