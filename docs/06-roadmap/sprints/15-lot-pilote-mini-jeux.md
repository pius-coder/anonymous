# Sprint 15 - Lot pilote mini-jeux

## Objectif

Reprendre un petit lot prouvable depuis HEAD pour valider le framework. Hors scope: rendre tout le
catalogue jouable.

## User Stories Produit

| ID | Role | User story | Valeur produit | Priorite |
|---|---|---|---|---|
| US-15-01 | Admin | En tant qu'admin, je veux selectionner un jeu pilote prouve, afin de valider le framework sans promettre tout le catalogue. | Lot pilote borne. | Must |
| US-15-02 | Joueur | En tant que joueur, je veux jouer le jeu pilote de bout en bout, afin de valider le parcours live complet. | Recette gameplay. | Must |
| US-15-03 | Observateur | En tant qu'observateur, je veux suivre chaque jeu pilote en readonly, afin de verifier l'absence de fuite. | Readonly concret. | Must |
| US-15-04 | Support | En tant que support, je veux voir les incidents du jeu pilote, afin de diagnostiquer la recette. | Support gameplay. | Should |

## Scenarios D'Acceptation Atomiques

| ID | Story | Surface | Given | When | Then | UML liee | Contrat/Test |
|---|---|---|---|---|---|---|---|
| AC-15-01 | US-15-01 | Selection mini-jeu | `memory-sequence` fiche complete | L'admin clique `Selectionner memory-sequence` | Jeu pilote selectionne avec manifest | [domains](../../03-architecture/uml/domains.md) | Manifest test |
| AC-15-02 | US-15-02 | Mini-jeu actif | Sequence affichee au joueur | Le joueur clique les choix dans l'ordre | Progression acceptee et score evidence creee | [realtime flow](../../03-architecture/uml/realtime-flow.md) | Runtime integration |
| AC-15-03 | US-15-02 | Mini-jeu actif | Input tardif | Le joueur clique une reponse apres deadline | Commande refusee, incident eventuel | [state machines](../../03-architecture/uml/state-machines.md) | Late input test |
| AC-15-04 | US-15-03 | Observer pilote | Jeu actif avec solution cachee | L'observateur clique `Observer` | Solution cachee absente du snapshot | [realtime flow](../../03-architecture/uml/realtime-flow.md) | No-leak test |
| AC-15-05 | US-15-02 | Live reconnect | Joueur drop mid-round | Le joueur clique `Reconnexion` | State restauree sans rejouer les inputs | [realtime flow](../../03-architecture/uml/realtime-flow.md) | Reconnect test |
| AC-15-06 | US-15-04 | Support incidents | Duplicate nonce detecte | Le support clique `Voir incidents` | Incident lisible sans bouton correction score | [permissions](../../03-architecture/uml/permissions.md) | Support no-command |

## Sources Docs Obligatoires

- Produit: [catalogue mini-jeux](../../01-product/minigame-catalog.md), [use cases](../../01-product/use-cases.md)
- UX: [player states](../../02-ux/player-states.md), [screen states](../../02-ux/screen-state-matrix.md)
- Architecture/UML: [realtime flow](../../03-architecture/uml/realtime-flow.md), [scoring publication](../../03-architecture/uml/scoring-publication.md), [state machines](../../03-architecture/uml/state-machines.md)
- Couches: [realtime](../../04-layers/realtime.md), [domain](../../04-layers/domain.md), [player web](../../04-layers/player-web.md)
- Workflow: [pipeline agentique](../../05-workflows/agentic-feature-pipeline.md), [minigame integration](../../05-workflows/minigame-integration.md)
- Tests: [strategie de test](../../05-workflows/test-strategy.md)

## Preuves Legacy

- Priorite 1: `memory-sequence`, runtime dedie HEAD et regles solo simples.
- Priorite 2: `pure-reaction-duel`, runtime dedie HEAD et contraintes temps/reaction.
- Priorite 3: `rapid-calculation`, runtime dedie HEAD et scoring serveur.
- Jeux recette optionnels seulement apres fiches completes.

## UML Concernee

- Lire [realtime flow](../../03-architecture/uml/realtime-flow.md) et [scoring publication](../../03-architecture/uml/scoring-publication.md).
- Ajouter diagramme specifique pour chaque jeu pilote valide.

## Pipeline Par Couche

- Web: UI et readonly par jeu.
- API/ConnectRPC: selection/config/read models.
- Game-server: adapter runtime par jeu.
- Domaine: runtime pur et tests deterministes.
- DB: evidence/action log selon jeu.
- Worker: deadlines si necessaires.
- Notifications: aucune.
- Observabilite: anti-cheat et replay evidence.

## Contrats Protobuf Et ConnectRPC

Pour chaque jeu: manifest, config, command, public/private state, server events, score evidence, erreurs
specifiques mappees vers erreurs publiques communes.

## Data

Chaque jeu fournit evidence scoring et politique de retention; private state jamais persiste en clair sans raison.

## UI States

Briefing, active, command feedback, finished, reconnect mid-round, readonly stale, rejected input.

## Permissions

Joueur agit seulement pour lui. Observer lit public state. Admin configure/lance selon lifecycle.

## Erreurs Observabilite

Inputs tardifs/dupliques, nonce replay, state leak, deterministic mismatch, suspicious reaction time.

## Tests Attendus

- Unit runtime.
- Integration game-server.
- UI etats joueur.
- Observer no-leak.
- Reconnect mid-round.
- Inputs tardifs/dupliques.

## Definition Of Done

- Le lot pilote peut etre joue de bout en bout jusqu'a publication des resultats.
- Le catalogue 120 reste inventaire produit, pas promesse d'implementation.

## Interdictions Specifiques

- Ne pas presenter 36 definitions comme jouables.
- Ne pas oublier les informations cachees des familles role cache.
