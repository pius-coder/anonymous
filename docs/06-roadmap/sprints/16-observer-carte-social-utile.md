# Sprint 16 - Observer carte et social utile

## Objectif

Definir ce qui releve de l'observation lecture seule et ce qui releve d'un usage social ou carte. Hors scope:
recreer une carte decorative sans use case.

## User Stories Produit

| ID | Role | User story | Valeur produit | Priorite |
|---|---|---|---|---|
| US-16-01 | Observateur | En tant qu'observateur, je veux suivre la partie en lecture seule, afin de regarder sans influencer le jeu. | Observation sure. | Must |
| US-16-02 | Joueur | En tant que joueur elimine, je veux etre distingue d'un observateur externe, afin de garder mes droits limites mais contextualises. | Roles clairs. | Should |
| US-16-03 | Admin | En tant qu'admin, je veux ouvrir une vue readonly d'un joueur, afin de superviser sans controler son client. | Supervision non intrusive. | Must |
| US-16-04 | Support | En tant que support, je veux diagnostiquer un snapshot autorise, afin d'aider sans acceder au state prive. | Diagnostic no-leak. | Should |

## Scenarios D'Acceptation Atomiques

| ID | Story | Surface | Given | When | Then | UML liee | Contrat/Test |
|---|---|---|---|---|---|---|---|
| AC-16-01 | US-16-01 | Page observer | Permission observer valide | L'observateur clique `Observer la partie` | Snapshot global filtre affiche | [realtime flow](../../03-architecture/uml/realtime-flow.md) | `GetReadonlySnapshot` |
| AC-16-02 | US-16-01 | Page observer | Client manipule | L'observateur force `Envoyer une action` | Commande refusee serveur | [permissions](../../03-architecture/uml/permissions.md) | No-input test |
| AC-16-03 | US-16-02 | Joueur elimine | Joueur elimine | Le joueur clique `Continuer en spectateur` | Vue elimine distincte de l'observateur public | [state machines](../../03-architecture/uml/state-machines.md) | Role projection test |
| AC-16-04 | US-16-03 | Admin monitoring | Role admin | L'admin clique `Voir joueur en lecture seule` | Snapshot individuel, aucun bouton de controle | [sequences](../../03-architecture/uml/sequences.md) | No direct control |
| AC-16-05 | US-16-04 | Support diagnostic | Role support | Le support clique `Voir snapshot autorise` | Donnees privees et reponses cachees absentes | [permissions](../../03-architecture/uml/permissions.md) | No-leak support |
| AC-16-06 | US-16-01 | Carte/social | Use case social non valide | L'observateur clique `Carte` | Fonction absente ou marquee hors scope | [data flow](../../03-architecture/uml/data-flow.md) | No decorative map |

## Sources Docs Obligatoires

- Produit: [readonly observer](../../01-product/readonly-observer.md), [actors](../../01-product/actors-and-permissions.md)
- UX: [information architecture](../../02-ux/information-architecture.md), [screen states](../../02-ux/screen-state-matrix.md), [loading/error/reconnect](../../02-ux/loading-error-reconnection.md)
- Architecture/UML: [realtime flow](../../03-architecture/uml/realtime-flow.md), [permissions](../../03-architecture/uml/permissions.md), [data flow](../../03-architecture/uml/data-flow.md)
- Couches: [realtime](../../04-layers/realtime.md), [player web](../../04-layers/player-web.md), [admin web](../../04-layers/admin-web.md)
- Workflow: [pipeline agentique](../../05-workflows/agentic-feature-pipeline.md), [layer canvas](../../05-workflows/layer-change-canvas.md)
- Tests: [strategie de test](../../05-workflows/test-strategy.md)

## Preuves Legacy

- `LiveRoomShell` et `GameSessionRoom` contenaient carte sociale, chat, groupes, pings, invitations.
- Le produit v0.1 valide l'observer par snapshots/evenements, pas une video.

## UML Concernee

- Lire [realtime flow](../../03-architecture/uml/realtime-flow.md) et [permissions](../../03-architecture/uml/permissions.md).
- Modifier si social/carte devient un use case valide.

## Pipeline Par Couche

- Web: vue observer, stale/reconnect/error, distinction elimine/observer/admin.
- API/ConnectRPC: queries snapshot si necessaire.
- Game-server: snapshots filtres, aucune commande observer.
- Domaine: audience et filtrage.
- DB: retention events seulement si decidee.
- Worker: cleanup retention si decidee.
- Notifications: aucune logique social par defaut.
- Observabilite: no input observer, snapshot filtered metrics.

## Contrats Protobuf Et ConnectRPC

`GetReadonlySnapshot`, `ReadonlyEvent`, `ObserverConnected`, `SocialCommand` seulement si social valide.

## Data

Snapshots globaux/individuels filtres par role; aucune capture video stockee en v0.1.

## UI States

Observer loading, stale snapshot, reconnecting, denied, no active round, public results.

## Permissions

Observer ne peut pas envoyer input. Admin/support lisent selon permission. Joueur elimine est distinct.

## Erreurs Observabilite

Commande observer refusee, champ prive retire, retention non decidee, logs sans reponses cachees.

## Tests Attendus

- Observer ne peut pas envoyer input.
- Etat prive non visible.
- Snapshot filtre par audience.
- Carte non decorative si implementee.
- Chat/social respecte les locks de phase.

## Definition Of Done

- Toute interaction carte/social correspond a un use case documente.
- Observer est separe du joueur elimine et de l'admin decideur.

## Interdictions Specifiques

- Ne pas reproduire `SocialMapCanvas` sans utilite produit.
- Ne pas fuiter roles caches via observer ou chat.
