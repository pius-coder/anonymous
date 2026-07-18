# Catalogue des mini-jeux

## Statut

Cette liste restaure l'inventaire des titres depuis `HEAD:docs/catalogue-mini-jeux.md`.
Elle sert de catalogue produit de reference pour la reconstruction `v0.1`.

Elle ne signifie pas que les 120 mini-jeux sont implementes, validables ou priorises.
Chaque mini-jeu devra passer par le workflow `docs/05-workflows/minigame-integration.md`
avant toute implementation.

## Regles d'utilisation

- Ne pas creer un runtime a partir du seul titre.
- Ne pas deduire les regles detaillees si elles ne sont pas documentees dans une decision ou une fiche validee.
- Ne pas exposer un mini-jeu au joueur tant que son contrat serveur, son scoring, ses evenements temps reel et ses tests ne sont pas valides.
- Le serveur reste la source de verite pour les scores, timers, abandons, connexions et validations competitives.
- Les mini-jeux a roles caches doivent documenter explicitement les informations visibles par chaque acteur.

## 1. Rounds Solo - test QI / reflexe

1. 1.1 Sequence memoire
2. 1.2 Calcul rapide
3. 1.3 L'intrus
4. 1.4 Reaction pure
5. 1.5 Tri rapide
6. 1.6 Memoire de grille
7. 1.7 Rotation mentale
8. 1.8 Compte a rebours inverse
9. 1.9 Labyrinthe eclair
10. 1.10 Precision de tir
11. 1.11 Mots meles chronometres
12. 1.12 Puzzle glissant
13. 1.13 Suite logique
14. 1.14 Repetition audio
15. 1.15 Comptage rapide
16. 1.16 Anagramme eclair
17. 1.17 Suivi de curseur
18. 1.18 Estimation visuelle
19. 1.19 Stabilite de main
20. 1.20 Memoire de symboles

## 2. Rounds Duel 1v1

1. 2.1 Chifoumi a mise
2. 2.2 Course au signal
3. 2.3 Bras de fer digital
4. 2.4 Duel de tir
5. 2.5 Le bluff des cartes
6. 2.6 Match de rythme
7. 2.7 Poussee de jauge
8. 2.8 Le voleur de points
9. 2.9 Duel de memoire
10. 2.10 Roulette de risque
11. 2.11 Le duel du menteur
12. 2.12 Tir a la corde de precision
13. 2.13 Dernier chiffre
14. 2.14 Le mimeur
15. 2.15 Duel d'encheres
16. 2.16 Pierre-papier-ciseaux evolutif
17. 2.17 Le duel des zones
18. 2.18 Quiz eclair face a face
19. 2.19 Le compte juste
20. 2.20 Duel de patience

## 3. Rounds Alliance forcee - binome

1. 3.1 Le coffre a deux cles
2. 3.2 Synchronisation
3. 3.3 Pot commun
4. 3.4 Le pont fragile
5. 3.5 Le partage inegal
6. 3.6 Le fil tendu
7. 3.7 Le mensonge partage
8. 3.8 La cle unique
9. 3.9 Le compte a repartir
10. 3.10 Le miroir
11. 3.11 La corde a deux
12. 3.12 Le puzzle inverse
13. 3.13 Le vote a deux
14. 3.14 La lumiere partagee
15. 3.15 Le message cache
16. 3.16 Le compte parallele
17. 3.17 Le saut de confiance
18. 3.18 Le silence force
19. 3.19 Le pacte a duree
20. 3.20 Le relais a un seul jeton

## 4. Rounds Equipe libre - 3 a 4 joueurs, choix mutuel

1. 4.1 Relais de mini-defis
2. 4.2 Construction collective
3. 4.3 Vote unanime
4. 4.4 Le pont collectif
5. 4.5 La chaine humaine
6. 4.6 Le tresor partage
7. 4.7 Le vote de leader
8. 4.8 La tour fragile
9. 4.9 Le code collectif
10. 4.10 La course en cordee
11. 4.11 Le radeau
12. 4.12 Le chant collectif
13. 4.13 La cartographie
14. 4.14 Le marche troc
15. 4.15 Le bouclier
16. 4.16 La pyramide de points
17. 4.17 Le compte a trois
18. 4.18 Le sacrifice
19. 4.19 Le fil rouge
20. 4.20 La negociation finale

## 5. Rounds Survie collective

1. 5.1 1,2,3 Soleil digital
2. 5.2 Zones qui retrecissent
3. 5.3 Dernier debout
4. 5.4 Le sol qui s'effondre
5. 5.5 Le rayon balayeur
6. 5.6 La chaise musicale digitale
7. 5.7 Le silence mortel
8. 5.8 Le pont de lumieres
9. 5.9 La maree montante
10. 5.10 Le radeau qui coule
11. 5.11 La ligne de feu
12. 5.12 La bulle commune
13. 5.13 Le poids du groupe
14. 5.14 Le vote d'elimination express
15. 5.15 La roue du hasard collective
16. 5.16 La bombe partagee
17. 5.17 Le cercle qui tourne
18. 5.18 Les dominos
19. 5.19 Le sprint des lucioles
20. 5.20 La derniere lumiere

## 6. Rounds Role cache

1. 6.1 Le saboteur
2. 6.2 L'imposteur silencieux
3. 6.3 Le double agent
4. 6.4 La carte truquee
5. 6.5 Le faux temoin
6. 6.6 Le voleur silencieux
7. 6.7 L'espion des couleurs
8. 6.8 Le menteur du groupe
9. 6.9 La preuve cachee
10. 6.10 Le pion secret
11. 6.11 Le validateur corrompu
12. 6.12 Le compte fausse
13. 6.13 L'allie fantome
14. 6.14 Le chronometre saborde
15. 6.15 Le messager corrompu
16. 6.16 Le jury cache
17. 6.17 La fausse alerte
18. 6.18 Le sondeur menteur
19. 6.19 Le pacte secret
20. 6.20 Le remplacant

## Decisions ouvertes

- Format exact du manifeste de mini-jeu dans les futurs contrats Protobuf (`P-SEQ-02`).
- Parametres numeriques fins restent config versionnee dans chaque rulebook (pas de reouverture de cle).

## Baseline ratifiee du premier lancement production (P-SEQ-01)

Decision `DEC-P-SEQ-01-RATIFY` (2026-07-17) : les six cles candidates sont **ratifiees** sans
remplacement. Freeze avant contrats : aucun changement de cle implicite apres cette decision.
Rulebooks signes : `docs/01-product/rulebooks/`. Matrice fairness :
`docs/01-product/rulebooks/fairness-matrix.md`. ADR :
`docs/03-architecture/decisions/0003-six-minigame-rulebook-freeze.md`.

| Famille | Cle canonique | Titre affiche | Rulebook | Statut |
|---|---|---|---|---|
| Solo | `memory-sequence` | Sequence memoire | [rulebooks/memory-sequence.md](./rulebooks/memory-sequence.md) | `APPROVED` v1.0.0 |
| Duel | `pure-reaction-duel` | Course au signal | [rulebooks/pure-reaction-duel.md](./rulebooks/pure-reaction-duel.md) | `APPROVED` v1.0.0 |
| Alliance | `trust-bridge` | Le pont fragile | [rulebooks/trust-bridge.md](./rulebooks/trust-bridge.md) | `APPROVED` v1.0.0 |
| Equipe | `team-relay` | Relais de mini-defis | [rulebooks/team-relay.md](./rulebooks/team-relay.md) | `APPROVED` v1.0.0 |
| Survie | `danger-sweep` | Le rayon balayeur | [rulebooks/danger-sweep.md](./rulebooks/danger-sweep.md) | `APPROVED` v1.0.0 |
| Role cache | `silent-vote` | Le saboteur | [rulebooks/silent-vote.md](./rulebooks/silent-vote.md) | `APPROVED` v1.0.0 |

`silent-vote` conserve la cle runtime pour stabilite wire ; le produit est **Le saboteur** avec roles
caches reels. Le vote majoritaire legacy n'est **pas** la regle finale.

## Niveaux d'implementation constates dans HEAD

Le `HEAD` contenait quatre niveaux differents qu'il ne faut plus confondre.

| Niveau | Quantite | Source HEAD | Statut |
|---|---:|---|---|
| Catalogue produit | 120 | `docs/catalogue-mini-jeux.md` | Vision/inventaire |
| Definitions techniques API | 36 | `apps/api/src/minigames/catalogue.ts` | Seed/config/allowed actions |
| Jeux de recette live | 6 | `RECETTE_ROUND_KEYS` dans `apps/game-server/src/live/sessionStore.ts` | Parcours demo |
| Runtimes dedies | 3 | `packages/game-engine/src/runtimes` | Implementation domaine partielle |

### 36 definitions techniques HEAD

- Solo : `memory-sequence`, `rapid-calculation`, `target-precision`, `pattern-recall`, `logic-grid`, `timing-window`.
- Duel : `pure-reaction-duel`, `mirror-match`, `quick-draw`, `duel-calculation`, `rhythm-duel`, `bluff-duel`.
- Alliance : `trust-bridge`, `shared-code`, `pair-memory`, `alliance-balance`, `split-focus`, `relay-logic`.
- Team : `team-relay`, `squad-signal`, `formation-hold`, `team-calculation`, `resource-sort`, `synchronized-tap`.
- Survival : `safe-zones`, `shrinking-floor`, `danger-sweep`, `last-light`, `obstacle-path`, `endurance-count`.
- Hidden role : `signal-detective`, `silent-vote`, `decoy-hunt`, `role-memory`, `suspect-pattern`, `alibi-check`.

### 6 jeux de recette live HEAD

- `memory-sequence`
- `pure-reaction-duel`
- `trust-bridge`
- `team-relay`
- `danger-sweep`
- `silent-vote`

### 3 runtimes dedies HEAD

- `memory-sequence`
- `rapid-calculation`
- `pure-reaction-duel`

Conclusion : un mini-jeu ne doit etre declare reconstruit que lorsqu'il possede un manifest,
des commandes, des evenements, un runtime serveur, une UI joueur, un mode lecture seule,
un scoring provisoire, une publication et des tests.
