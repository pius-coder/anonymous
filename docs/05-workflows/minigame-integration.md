# Minigame Integration

## Catalogue

La liste des mini-jeux candidats est maintenue dans `docs/01-product/minigame-catalog.md`.
Cette liste est un inventaire produit, pas une preuve d'implementation.

Les **six jeux du premier lancement** ont des rulebooks signes (`APPROVED`) sous
`docs/01-product/rulebooks/`. Aucun agent ne deduit une regle depuis un titre, une cle ou un
resolver legacy : lire le rulebook de la cle + `fairness-matrix.md` avant contrats ou runtime.

Avant toute integration, choisir explicitement le mini-jeu, sa famille, son objectif joueur,
ses regles, ses donnees d'entree, ses evenements serveur et ses criteres de scoring.

1. Lire le rulebook signe si la cle est ratifiee ; sinon rediger un rulebook avant tout contrat.
2. Definir famille de mini-jeu.
3. Definir public state, private state, player commands, server events (alignes rulebook).
4. Definir resolution et preuves.
5. Definir read-only rendering par snapshots (matrice d'audience).
6. Definir no-leak tests.
7. Integrer runtime server-side.
8. Integrer UI joueur seulement apres contrats.
