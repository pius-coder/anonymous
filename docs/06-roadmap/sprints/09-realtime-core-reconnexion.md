# Sprint 09 - Realtime core et reconnexion

## Objectif

Refaire le noyau live avec handshake court, source de verite unique et state views filtrees. Hors scope:
mini-jeux complets, chat/social et publication de scores.

## User Stories Produit

| ID | Role | User story | Valeur produit | Priorite |
|---|---|---|---|---|
| US-09-01 | Joueur | En tant que joueur, je veux entrer dans le live et me reconnecter, afin de continuer ma partie sans rejouer mes inputs. | Live fiable et equitable. | Must |
| US-09-02 | Observateur | En tant qu'observateur, je veux suivre la partie en lecture seule, afin de regarder sans influencer le jeu. | Snapshot filtre. | Must |
| US-09-03 | Admin | En tant qu'admin, je veux voir connexions, rejets et desync, afin de superviser le live. | Supervision exploitable. | Should |

## Scenarios D'Acceptation Atomiques

| ID | Story | Surface | Given | When | Then | UML liee | Contrat/Test |
|---|---|---|---|---|---|---|---|
| AC-09-01 | US-09-01 | Lobby pret | Participation active, acces autorise | Le joueur clique `Entrer dans le live` | Live access court cree | [realtime flow](../../03-architecture/uml/realtime-flow.md) | `CreateLiveAccess` |
| AC-09-02 | US-09-01 | Live | Token live valide | Le joueur clique `Rejoindre la room` | Connexion `connected`, state view joueur | [realtime flow](../../03-architecture/uml/realtime-flow.md) | `JoinLive` integration |
| AC-09-03 | US-09-01 | Live reconnect | Drop reseau, deadline active | Le joueur clique `Reconnexion` | State view restauree sans replay input | [realtime flow](../../03-architecture/uml/realtime-flow.md) | `ReconnectLive` |
| AC-09-04 | US-09-01 | Live reconnect | Deadline expiree | Le joueur clique `Reconnexion` | Refus `RECONNECT_EXPIRED` | [state machines](../../03-architecture/uml/state-machines.md) | Test expired |
| AC-09-05 | US-09-02 | Page observer | Permission observer | L'observateur clique `Observer la partie` | Snapshot filtre, aucun input possible | [permissions](../../03-architecture/uml/permissions.md) | `ReadonlySnapshot` no-leak |
| AC-09-06 | US-09-02 | Page observer | UI manipulee ou client malveillant | L'observateur force `Envoyer commande` | Commande refusee serveur | [realtime flow](../../03-architecture/uml/realtime-flow.md) | Test no input |
| AC-09-07 | US-09-03 | Monitoring live | Role admin | L'admin clique `Voir connexions` | Connexions/rejets/desync visibles | [data flow](../../03-architecture/uml/data-flow.md) | Admin state view |
| AC-09-08 | US-09-01 | Live | Participation absente ou role interdit | Le joueur clique `Rejoindre la room` | Acces refuse avec erreur publique, aucun state prive | [permissions](../../03-architecture/uml/permissions.md) | Test reject |

## Sources Docs Obligatoires

- Produit: [actors](../../01-product/actors-and-permissions.md), [readonly observer](../../01-product/readonly-observer.md), [lifecycle](../../01-product/session-lifecycle.md)
- UX: [loading/error/reconnect](../../02-ux/loading-error-reconnection.md), [screen states](../../02-ux/screen-state-matrix.md)
- Architecture/UML: [realtime architecture](../../03-architecture/realtime-and-streaming.md), [realtime flow](../../03-architecture/uml/realtime-flow.md), [sequences](../../03-architecture/uml/sequences.md)
- Couches: [realtime](../../04-layers/realtime.md), [transports](../../04-layers/transports.md), [observability](../../04-layers/observability.md)
- Workflow: [pipeline agentique](../../05-workflows/agentic-feature-pipeline.md), [protobuf change](../../05-workflows/protobuf-change.md)
- Tests: [strategie de test](../../05-workflows/test-strategy.md)

## Preuves Legacy

- Flow legacy: join-token -> reservation -> Colyseus `onAuth`.
- Transactions Serializable et conflits P2034.
- `GameSessionRoom.ts` gerait auth, rounds, chat, groupes, mini-jeux et resultats.

## UML Concernee

- Lire [realtime flow](../../03-architecture/uml/realtime-flow.md), [data flow](../../03-architecture/uml/data-flow.md) et [permissions](../../03-architecture/uml/permissions.md).
- Modifier apres decision exacte session HTTP + short live token ou alternative.

## Pipeline Par Couche

- Web: client realtime contracte, etats reconnect/rejected/stale.
- API/ConnectRPC: `CreateLiveAccess` ou equivalent court.
- Game-server: room mince, auth live, join/leave/drop/reconnect, dispatch commandes.
- Domaine: verifier participation, phase et audience.
- DB: `RealtimeConnection`, reconnect deadline, audit minimal.
- Worker: expiration reconnect si decidee.
- Notifications: aucune.
- Observabilite: connect, reconnect, reject, desync, lag.

## Contrats Protobuf Et ConnectRPC

`CreateLiveAccess`, `JoinLive`, `ReconnectLive`, `LiveStateView`, `ReadonlySnapshot`,
`LiveCommandRejected`, events realtime par audience. ConnectRPC sert l'access token court; WebSocket/Colyseus
reste le live bidirectionnel.

Exception transitoire autorisee: tant que ConnectRPC n'est pas cable, `CreateLiveAccess` peut etre expose
par un endpoint Hono JSON mince si le message `.proto`, la fixture golden, l'erreur publique et le test
RBAC/no-leak existent. Cette exception ne vaut pas pour de nouvelles commandes gameplay.

## Data

Connexion liee a participation, token court stocke hashe si persiste, deadline de reconnexion, state view
non rejouable.

## UI States

Connecting, connected, reconnecting, reconnect expired, access denied, stale snapshot, live unavailable.

## Permissions

Participation active obligatoire pour joueur. Observer ne peut envoyer aucune commande joueur. Admin lit supervision.

## Erreurs Observabilite

Reject role, participant absent, token expired, duplicate connection, desync, no private state in logs.

## Tests Attendus

- Connexion.
- Reconnexion sans rejouer inputs.
- Refus participant absent.
- Refus role interdit.
- No leak de state prive.
- Concurrence double connexion.

## Definition Of Done

- Aucune commande joueur acceptee hors participation et phase valide.
- L'API et le game-server ne modifient plus le meme etat live en double.

## Interdictions Specifiques

- Ne pas garder la reservation legacy sous un autre nom.
- Ne pas laisser les messages Colyseus dicter directement les composants UI.
