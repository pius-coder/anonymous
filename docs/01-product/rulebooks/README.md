# Rulebooks signes — six mini-jeux du premier lancement

**Statut programme :** `P-SEQ-01` complete (documentation).  
**Freeze contrats :** ces cles sont figées avant `P-SEQ-02`. Aucun remplacement implicite.

## Ratification

| Famille | Cle canonique | Titre affiche | Decision | Rulebook | Version | Statut |
|---|---|---|---|---|---|---|
| Solo | `memory-sequence` | Sequence memoire | `DEC-P-SEQ-01-RATIFY` — **ratifiee** | [memory-sequence.md](./memory-sequence.md) | 1.0.0 | `APPROVED` |
| Duel | `pure-reaction-duel` | Course au signal | `DEC-P-SEQ-01-RATIFY` — **ratifiee** | [pure-reaction-duel.md](./pure-reaction-duel.md) | 1.0.0 | `APPROVED` |
| Alliance | `trust-bridge` | Le pont fragile | `DEC-P-SEQ-01-RATIFY` — **ratifiee** | [trust-bridge.md](./trust-bridge.md) | 1.0.0 | `APPROVED` |
| Equipe | `team-relay` | Relais de mini-defis | `DEC-P-SEQ-01-RATIFY` — **ratifiee** | [team-relay.md](./team-relay.md) | 1.0.0 | `APPROVED` |
| Survie | `danger-sweep` | Le rayon balayeur | `DEC-P-SEQ-01-RATIFY` — **ratifiee** | [danger-sweep.md](./danger-sweep.md) | 1.0.0 | `APPROVED` |
| Role cache | `silent-vote` | Le saboteur | `DEC-P-SEQ-01-RATIFY` — **ratifiee** (regles roles caches, pas le vote majoritaire legacy) | [silent-vote.md](./silent-vote.md) | 1.0.0 | `APPROVED` |

**Proprietaire produit :** Product Owner Session-Jeu (`product-owner`).  
**ADR :** [0003-six-minigame-rulebook-freeze.md](../../03-architecture/decisions/0003-six-minigame-rulebook-freeze.md).  
**Matrice commune :** [fairness-matrix.md](./fairness-matrix.md).  
**Audience UX :** [six-games-audience.md](../../02-ux/minigames/six-games-audience.md).

## Regles d'usage pour les agents

1. Aucune regle ne se deduce d'un titre, d'un nom de cle ou d'un resolver legacy.
2. Le serveur est la seule source de verite pour timestamps, positions, scores, victoires, roles et timers.
3. Avant contrats (`P-SEQ-02`) ou runtime (`P-B-*`), lire le rulebook de la cle + la matrice fairness.
4. Toute amendment de rulebook incremente la version et re-signe le statut; un changement de cle exige un nouvel ADR.

## Questions ouvertes bloquant P-SEQ-02

Aucune question bloquante au moment de la signature `1.0.0`.  
Les parametres numeriques (durees, barres de score) restent **config versionnee** dans chaque fiche; les contrats doivent les exposer comme config, pas comme constantes magiques dans le wire.

## Mapping AC → niveaux de preuve

Chaque rulebook porte une table `AC → L1/L3/L4/L5`. Synthese commune dans [fairness-matrix.md](./fairness-matrix.md#niveaux-de-preuve).
