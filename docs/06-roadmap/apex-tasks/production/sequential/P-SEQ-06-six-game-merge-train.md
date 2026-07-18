# P-SEQ-06 - Composition et recette des six mini-jeux

## Mission autonome

Integrer les six features WAVE-B et prouver qu'elles coexistent dans une partie multi-manches sans
collision de contrats, assets, state, scoring ou information privee.

## Prerequis et lectures

- Les six lots WAVE-B sont verts et leurs worktrees propres.
- Lire rulebooks, rapports de lot, matrice audience, scoring et convention merge train.
- Context7 : Colyseus, Phaser/React selon les renderers livres et Playwright.

## Ownership exclusif

Registry final des six manifests, composition game-server/web, catalogue admin, assets manifest global,
E2E multi-jeux et matrice AC. Les corrections gameplay retournent au lot.

## Interdit

Modifier une regle pour resoudre un conflit, desactiver un test no-leak, serialiser artificiellement
les joueurs ou remplacer un runtime par une animation UI.

## Livrables production

- six manifests actifs et aucune cle seed derivee;
- ordre de manches melangeant les six familles, reprise et publication par round;
- UI admin de selection/config versionnee, joueur et observer sans donnees hardcodees;
- inventaire/licences et prechargement des assets des six jeux;
- dashboard metriques par jeu/version et preuves de score reliees au runtime.

## Criteres d'acceptation

- chaque jeu passe un E2E complet admin+joueurs+observer jusqu'a publication;
- une partie contenant les six jeux finit avec gains exacts, aucune fuite et aucune double action;
- reconnect entre et pendant deux jeux differents conserve le bon runtime/version;
- mobile/clavier/reduced motion restent utilisables pour chaque renderer;
- registry, seed, catalogue et admin emploient les six cles canoniques.

## Tests et sortie

Merge atomique avec gates par lot; puis L5 par jeu et scenario L6 six manches. Artefacts video/log/state
rediges, build production et commit de composition. Tout jeu rouge est renvoye a sa fiche.
