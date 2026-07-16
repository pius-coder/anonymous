# SEQ-01 - Figer contrats et transports

## Instruction a la session Codex

Execute cette fiche avec APEX apres merge vert de SEQ-00. Tu es l'unique proprietaire des contrats et
du code genere. Livre une baseline que tous les lots metier consommeront sans la modifier.

## Prerequis et lectures

- Verifier que `test:integration` et `test:e2e` existent et passent au smoke de SEQ-00.
- Lire `AGENTS.md`, la gap analysis, strategie Protobuf, workflow `protobuf-change.md`, couches contrats,
  sprints 02 et 04-18, ainsi que les rapports legacy UI/API/live cites par AGENTS.
- Context7 obligatoire : ConnectRPC et Buf; Colyseus si la frontiere RPC/WebSocket est decidee.

## Ownership exclusif

`packages/contracts/proto/**`, configuration Buf, fixtures golden, code genere et document d'exceptions
REST. Les autres packages ne sont modifies que pour des tests de compatibilite strictement necessaires.

## Interdit

Schema/migrations/seed, implementation des use-cases, UI, workers et montage central API.

## Livrables

1. Matrice verifiee des 11 services/50 methodes avec transport cible et audience.
2. Exceptions REST explicites, motivees, datees et assorties d'une condition de retrait.
3. Contrats complets pour reset auth, snapshots, scoring, notifications, compliance et mini-jeu selon
   les scenarios deja valides; aucune invention produit non documentee.
4. Erreurs publiques stables, enums `UNSPECIFIED = 0`, champs retires reserves et no-leak par audience.
5. Generation deterministe et API publique du package.

## Criteres d'acceptation et tests

- Buf lint/generate/breaking et golden fixtures passent.
- Les projections joueur/observer/admin excluent les champs interdits.
- Le diff genere est explique et reproductible.
- Aucun endpoint ou runtime n'est ajoute dans cette tache.
- Executer L0, tests contracts, typecheck, lint, build et `git diff --check`.
