# ADR 0003 — Freeze des six rulebooks mini-jeux (P-SEQ-01)

## Statut

Accepte — 2026-07-17

## Contexte

Le premier lancement commercial exige exactement un mini-jeu par famille. Les cles candidates
(`memory-sequence`, `pure-reaction-duel`, `trust-bridge`, `team-relay`, `danger-sweep`, `silent-vote`)
sont les mieux etayees par le legacy (runtimes, catalogue technique 36, RECETTE_ROUND_KEYS).

Sans rulebooks signes, les contrats Protobuf et les runtimes improviseront des regles a partir des
titres ou des resolvers legacy — interdit par le programme production.

## Decision

1. **Ratifier** les six cles candidates sans remplacement (`DEC-P-SEQ-01-RATIFY`).
2. Publier six rulebooks `APPROVED` v1.0.0 sous `docs/01-product/rulebooks/`.
3. Publier la matrice commune fairness/audience.
4. **Figer** cles et titres affiches avant `P-SEQ-02`. Tout changement ulterieur exige un nouvel ADR
   et un bump de version des rulebooks + regeneration des contrats.
5. `silent-vote` conserve la cle runtime pour stabilite wire, mais le produit est **Le saboteur** avec
   roles caches reels; le vote majoritaire legacy n'est **pas** la regle finale.
6. Aucune verite competitive client (timestamp, position, score, victoire, role).

## Consequences

- `P-SEQ-02` peut nommer messages/enums a partir des commandes et phases documentees.
- Les lots `P-B-*` consomment ces fiches comme source de verite gameplay.
- Les agents ne doivent plus proposer d'autres cles "par defaut" sans ADR.
- Les parametres numeriques restent config versionnee, pas hardcode wire.

## Alternatives rejetees

| Alternative | Motif de rejet |
|---|---|
| Remplacer une cle par un autre jeu de la meme famille | Preuves legacy moindres; cout de re-spec inutile au freeze |
| Copier les resolvers HEAD | Incomplets, parfois injustes, et interdits comme source finale |
| Différer silent-vote | Casse la couverture "un jeu par famille" du go-live |

## References

- [rulebooks/README.md](../../01-product/rulebooks/README.md)
- [fairness-matrix.md](../../01-product/rulebooks/fairness-matrix.md)
- [minigame-catalog.md](../../01-product/minigame-catalog.md)
