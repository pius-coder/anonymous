# Documentation v0.1

Cette documentation est la source de verite de reconstruction. Elle ne valide pas le legacy comme architecture cible.

## Lecture obligatoire

1. `00-audit/` decrit l'etat observe, les erreurs et la matrice KEEP/REWRITE/DELETE/UNKNOWN.
   Pour l'etat **code v0.1 actuel** : `00-audit/v0.1-current-state.md`.
2. `01-product/` fixe le vocabulaire, les acteurs, le cycle de vie produit et le catalogue des mini-jeux.
3. `02-ux/` separe les parcours administrateur, joueur et observateur lecture seule.
4. `03-architecture/` decrit la cible technique, les frontieres, le temps reel, Protobuf et les UML par theme.
5. `04-layers/` donne le canevas d'ajout, modification et suppression par couche.
6. `05-workflows/` impose le pipeline agentique des futures features.
7. `06-roadmap/` decoupe la reconstruction en sprints fonctionnels et explique la couverture narrative des cas d'utilisation.

Pour terminer v0.1 avec plusieurs agents/worktrees, lire dans cet ordre :

1. `00-audit/v0.1-gap-analysis.md` pour l'etat prouve au commit audite;
2. `06-roadmap/apex-parallel-execution-plan.md` pour les dependances et ownership;
3. `05-workflows/agent-worktree-convention.md` avant de creer ou lancer une session parallele;
4. `05-workflows/apex-parallel-worktrees.md` pour l'isolation, l'ownership et le merge train;
5. `05-workflows/test-strategy.md` pour les gates L0 a L6.
6. `05-workflows/test-commands.md` pour les commandes `test:unit|integration|e2e`, timeouts et diagnostic.
7. `06-roadmap/apex-tasks/README.md` pour lancer une session Codex par fiche autonome.

## Decisions v0.1

- La branche `v0.1` a ete creee depuis l'etat courant sale de `feature/rules-lifecycle-v1`, sur validation explicite.
- Le stream lecture seule cible est un rendu distant par snapshots et evenements, pas une capture video.
- Le timer peut ouvrir la preparation et declencher des rappels, mais ne demarre jamais automatiquement la partie active.
- Les contrats reseau cible sont Protobuf, avec Connect pour les APIs navigateur et WebSocket/Colyseus ou transport equivalent pour les evenements live.
- La priorite frontend est definie par `02-ux/user-stories-ui.md` et
  `02-ux/frontend-architecture.md`; `02-ux/component-and-screen-inventory.md` maintient la matrice
  Figma-like des ecrans, composants et Sheets. Ces documents decrivent les comportements humains
  reels et le shell plein ecran sans scroll de page.
- Le catalogue des 120 mini-jeux est restaure comme inventaire produit dans `01-product/minigame-catalog.md`; chaque mini-jeu reste a revalider avant implementation.
- Le code source legacy a ete supprime de la fondation `v0.1` apres demande explicite de nettoyage immediat, tout en conservant les packages, applications, lockfiles, configurations et tests de socle.

## Audit HEAD legacy

- `00-audit/head-file-index.md` liste les 928 fichiers suivis dans le `HEAD` legacy.
- `00-audit/head-forensic-audit.md` analyse le legacy complet : routes, modules, DB, realtime, mini-jeux, erreurs, causes racines et decisions.
- `03-architecture/uml.md` indexe les diagrammes Mermaid de contexte, domaines, etats, sequences, permissions,
  data flow, realtime et scoring/publication.
