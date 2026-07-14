# Minigame Integration

## Catalogue

La liste des mini-jeux candidats est maintenue dans `docs/01-product/minigame-catalog.md`.
Cette liste est un inventaire produit, pas une preuve d'implementation.

Avant toute integration, choisir explicitement le mini-jeu, sa famille, son objectif joueur,
ses regles, ses donnees d'entree, ses evenements serveur et ses criteres de scoring.

1. Definir famille de mini-jeu.
2. Definir public state, private state, player commands, server events.
3. Definir resolution et preuves.
4. Definir read-only rendering par snapshots.
5. Definir no-leak tests.
6. Integrer runtime server-side.
7. Integrer UI joueur seulement apres contrats.
