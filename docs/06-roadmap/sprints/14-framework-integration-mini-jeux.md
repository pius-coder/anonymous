# Sprint 14 - Framework integration mini-jeux

## Objectif

Creer le cadre robuste avant de reintegrer les titres produit. Hors scope: implementation en masse du
catalogue 120.

## User Stories Produit

| ID | Role | User story | Valeur produit | Priorite |
|---|---|---|---|---|
| US-14-01 | Admin | En tant qu'admin, je veux choisir et configurer un mini-jeu valide, afin de lancer une manche jouable. | Mini-jeu configure sans surprise. | Must |
| US-14-02 | Joueur | En tant que joueur, je veux jouer avec des commandes et feedbacks explicites, afin de comprendre mes actions. | Gameplay testable. | Must |
| US-14-03 | Observateur | En tant qu'observateur, je veux voir le rendu readonly du mini-jeu, afin de suivre sans informations cachees. | Readonly par jeu. | Must |
| US-14-04 | Support | En tant que support, je veux lire les anomalies mini-jeu, afin de diagnostiquer sans modifier le score. | Diagnostic borne. | Should |

## Scenarios D'Acceptation Atomiques

| ID | Story | Surface | Given | When | Then | UML liee | Contrat/Test |
|---|---|---|---|---|---|---|---|
| AC-14-01 | US-14-01 | Configuration round | Catalogue mini-jeu valide | L'admin clique `Choisir ce mini-jeu` | Manifest charge, config affichee | [domains](../../03-architecture/uml/domains.md) | `MiniGameManifest` |
| AC-14-02 | US-14-01 | Configuration mini-jeu | Config invalide | L'admin clique `Valider la configuration` | Erreurs par champ, bouton lancement bloque | [data flow](../../03-architecture/uml/data-flow.md) | Config validation |
| AC-14-03 | US-14-02 | Mini-jeu actif | Round actif, commande valide | Le joueur clique `Envoyer mon action` | Feedback accepte, state public maj | [realtime flow](../../03-architecture/uml/realtime-flow.md) | Runtime command test |
| AC-14-04 | US-14-02 | Mini-jeu actif | Commande dupliquee | Le joueur reclique `Envoyer mon action` | Refus idempotent ou duplicate nonce | [realtime flow](../../03-architecture/uml/realtime-flow.md) | Anti-cheat test |
| AC-14-05 | US-14-03 | Observer mini-jeu | Mini-jeu avec private state | L'observateur clique `Observer` | Rendu sans private state | [realtime flow](../../03-architecture/uml/realtime-flow.md) | No private leak |
| AC-14-06 | US-14-04 | Support incident | Anomalie detectee | Le support clique `Voir anomalie mini-jeu` | Evidence lisible sans modifier score | [permissions](../../03-architecture/uml/permissions.md) | Support read-only |

## Sources Docs Obligatoires

- Produit: [catalogue mini-jeux](../../01-product/minigame-catalog.md), [scoring](../../01-product/scoring-and-publication.md)
- UX: [player states](../../02-ux/player-states.md), [screen states](../../02-ux/screen-state-matrix.md)
- Architecture/UML: [realtime flow](../../03-architecture/uml/realtime-flow.md), [data flow](../../03-architecture/uml/data-flow.md), [scoring publication](../../03-architecture/uml/scoring-publication.md)
- Couches: [domain](../../04-layers/domain.md), [realtime](../../04-layers/realtime.md), [contracts](../../04-layers/contracts.md)
- Workflow: [pipeline agentique](../../05-workflows/agentic-feature-pipeline.md), [minigame integration](../../05-workflows/minigame-integration.md)
- Tests: [strategie de test](../../05-workflows/test-strategy.md)

## Preuves Legacy

- 120 titres produit.
- 36 definitions API.
- 6 jeux de recette live.
- 3 runtimes dedies: `memory-sequence`, `rapid-calculation`, `pure-reaction-duel`.

## UML Concernee

- Lire [realtime flow](../../03-architecture/uml/realtime-flow.md), [scoring publication](../../03-architecture/uml/scoring-publication.md) et [domains](../../03-architecture/uml/domains.md).
- Ajouter un diagramme par mini-jeu prioritaire apres fiche validee.

## Pipeline Par Couche

- Web: adapter UI joueur et readonly.
- API/ConnectRPC: manifest/config reads et admin selection.
- Game-server: adapter runtime, commands/events.
- Domaine: runtime pur avec clock/random injectes.
- DB: config, evidence, action log si requis.
- Worker: deadlines si regle du jeu.
- Notifications: aucune logique mini-jeu.
- Observabilite: anti-cheat, late input, evidence hash.

## Contrats Protobuf Et ConnectRPC

`MiniGameManifest`, `MiniGameConfig`, `MiniGameCommand`, `MiniGamePublicState`,
`MiniGamePrivateState`, `MiniGameServerEvent`, `MiniGameScoreEvidence`.

## Data

Manifest versionne: key, family, player mode, config, commands, public/private state, events, scoring,
anti-cheat, readonly rendering.

## UI States

Config invalid, briefing, active, command accepted/rejected, finished, reconnect, readonly stale.

## Permissions

Joueur commande seulement sa participation. Admin configure. Observer lit public state. State prive jamais expose.

## Erreurs Observabilite

Invalid command, duplicate nonce, suspicious rate, private state leak check, deterministic replay failure.

## Tests Attendus

- Validation config.
- Command validation.
- Runtime deterministic avec clock/random injectes.
- No private state leak.
- Reconnection.
- Scoring provisoire.

## Definition Of Done

- Un mini-jeu est complet seulement avec manifest, runtime, UI, readonly, scoring, anti-cheat et tests.
- Premier mini-jeu choisi uniquement apres fiche validee.

## Interdictions Specifiques

- Ne pas implementer un mini-jeu depuis son titre.
- Ne pas transformer les 36 definitions JSON/Zod HEAD en source de verite durable.
