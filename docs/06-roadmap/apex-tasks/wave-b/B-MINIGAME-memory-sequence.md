# B-MINIGAME - Framework et pilote memory-sequence

## Mission autonome

Apres SEQ-03 et avec A-REALTIME/A-SCORING merges, implementer le framework mini-jeu puis un seul pilote
`memory-sequence` defini par le **rulebook signe**
`docs/01-product/rulebooks/memory-sequence.md` (`APPROVED` v1.0.0, `DEC-P-SEQ-01-RATIFY`).
Ne pas extrapoler les regles depuis le titre ni le legacy : le rulebook et
`docs/01-product/rulebooks/fairness-matrix.md` sont la source de verite gameplay.

## Ownership

`packages/game-engine/src/minigame/**`, adapter mini-jeu dedie dans game-server, UI de ce pilote et tests.

## Interdit

Contrats, schema/migrations, tooling racine, scoring publication, room core hors point d'extension public,
autres mini-jeux. Si l'extension publique manque, demander son ajout au proprietaire realtime.

## Demarrage obligatoire

Lire AGENTS, rulebook `memory-sequence`, fairness-matrix, catalogue, `minigame-integration.md`,
sprints 14/15, contrats, anti-cheat et preuves legacy (erreurs seulement). Context7 : Colyseus et
moteur/test utilise.

## AC

- Runtime pur deterministe et injectable, manifest valide et versionne.
- Commandes publiques/privees separees; serveur valide nonce, deadline, ordre et score.
- Reconnect restaure uniquement la projection autorisee.
- Score produit reste provisoire puis suit A-SCORING pour publication.
- Mobile et clavier fonctionnent sans logique competitive cliente.

## Tests et sortie

L1 moteur/scoring/anti-cheat, L4 Colyseus reconnect/duplicate/late/no-leak, L5 jeu complet jusqu'a
publication. Validations completes, commit atomique et rapport AC -> test.
