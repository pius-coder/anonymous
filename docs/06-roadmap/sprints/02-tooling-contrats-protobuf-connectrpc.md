# Sprint 02 - Tooling contrats Protobuf et ConnectRPC

## Objectif

Creer la source de verite reseau et planifier le tooling Protobuf-ES/ConnectRPC avant les nouveaux
endpoints. Hors scope: migrer toute l'API Hono en une seule fois.

## User Stories Produit

| ID | Role | User story | Valeur produit | Priorite |
|---|---|---|---|---|
| US-02-01 | Joueur | En tant que joueur, je veux recevoir des reponses et erreurs stables, afin de comprendre quoi faire pendant le live. | Les clients ne dependent pas de DTO improvises. | Must |
| US-02-02 | Admin | En tant qu'admin, je veux executer des commandes contractees, afin que chaque action sensible soit compatible et testable. | Les commandes admin sont versionnees. | Must |
| US-02-03 | Observateur | En tant qu'observateur, je veux recevoir un snapshot filtre, afin de suivre sans fuite d'information. | Les contrats portent l'audience. | Must |
| US-02-04 | Support | En tant que support, je veux consulter les evenements via un contrat distinct, afin de diagnostiquer sans donnees sensibles. | Le support a une lecture bornee. | Should |
| US-02-05 | Finance | En tant que finance, je veux un service paiement separe, afin de ne pas melanger argent et gameplay. | Les domaines reseau sont separes. | Must |

## Scenarios D'Acceptation Atomiques

| ID | Story | Surface | Given | When | Then | UML liee | Contrat/Test |
|---|---|---|---|---|---|---|---|
| AC-02-01 | US-02-01 | Live reconnect cible | Connexion perdue et token expire | Le joueur clique `Reconnexion` | Erreur publique stable `RECONNECT_EXPIRED` | [realtime flow](../../03-architecture/uml/realtime-flow.md) | `ReconnectLive` + golden |
| AC-02-02 | US-02-02 | Command center cible | Contrat `PublishParty` absent | L'admin clique `Publier la partie` | Endpoint bloque jusqu'au contrat ou exception documentee | [permissions](../../03-architecture/uml/permissions.md) | Contract gate |
| AC-02-03 | US-02-01 | Live cible | `JoinLive` contracte | Le joueur clique `Rejoindre` | Client utilise service genere, pas DTO manuel | [realtime flow](../../03-architecture/uml/realtime-flow.md) | Golden fixture |
| AC-02-04 | US-02-03 | Page observer | Audience observer | L'observateur clique `Observer la partie` | Snapshot contracte sans champs prives | [realtime flow](../../03-architecture/uml/realtime-flow.md) | `GetReadonlySnapshot` no-leak |
| AC-02-05 | US-02-04 | Dossier audit cible | Role support autorise | Le support clique `Voir les evenements` | Lecture contractee, champs sensibles exclus | [data flow](../../03-architecture/uml/data-flow.md) | Service descriptor + no-leak |
| AC-02-06 | US-02-05 | Vue ledger cible | Role finance | La finance clique `Rechercher transaction` | Service paiement separe du service admin round | [permissions](../../03-architecture/uml/permissions.md) | `PaymentService` golden |
| AC-02-07 | US-02-01 | Mini-jeu cible | Commande invalide ou phase fermee | Le joueur clique `Envoyer mon action` | `LiveCommandRejected` versionne par audience | [realtime flow](../../03-architecture/uml/realtime-flow.md) | Golden realtime |

## Sources Docs Obligatoires

- Produit: [use cases](../../01-product/use-cases.md), [permissions](../../01-product/actors-and-permissions.md)
- UX: [screen states](../../02-ux/screen-state-matrix.md), [loading/error/reconnect](../../02-ux/loading-error-reconnection.md)
- Architecture/UML: [strategie Protobuf](../../03-architecture/protobuf-contract-strategy.md), [realtime](../../03-architecture/realtime-and-streaming.md), [data flow UML](../../03-architecture/uml/data-flow.md)
- Couches: [contracts](../../04-layers/contracts.md), [transports](../../04-layers/transports.md)
- Workflow: [pipeline agentique](../../05-workflows/agentic-feature-pipeline.md), [protobuf change](../../05-workflows/protobuf-change.md)
- Tests: [strategie de test](../../05-workflows/test-strategy.md)

## Preuves Legacy

- Contrats disperses entre Prisma, Zod, React types, Colyseus schema et JSON mini-jeux.
- `round.resolved` diffusait scores/ranks sans separation provisoire/publication.
- [current errors](../../00-audit/current-errors.md) mentionne l'absence de client Protobuf genere.

## UML Concernee

- Lire [data flow](../../03-architecture/uml/data-flow.md), [realtime flow](../../03-architecture/uml/realtime-flow.md) et [scoring publication](../../03-architecture/uml/scoring-publication.md).
- Modifier si un message change audience, transport ou publication.

## Pipeline Par Couche

- Web: consommer clients generes futurs, pas de DTO manuel source de verite.
- API/ConnectRPC: services ConnectRPC pour commands/queries HTTP.
- Game-server: events realtime versionnes; pas remplace par ConnectRPC.
- Domaine: valide les transitions appelees par services.
- DB: aucune entite Prisma exposee.
- Worker: payloads versionnes pour jobs.
- Notifications: contrats notification dedies.
- Observabilite: correlation ids dans messages publics.

## Contrats Protobuf Et ConnectRPC

Packages initiaux: `common/v1`, `identity/v1`, `session/v1`, `participation/v1`, `preparation/v1`,
`realtime/v1`, `round/v1`, `minigame/v1`, `scoring/v1`, `admin/v1`, `notification/v1`, `payment/v1`.
ConnectRPC cible `@connectrpc/connect`, `@connectrpc/connect-web` et `@connectrpc/connect-node`.
Connect ES v2 utilise les descriptors generes par Protobuf-ES `protoc-gen-es`; ne pas ajouter
`protoc-gen-connect-es`.

Portee de figement du sprint 02:

- figer les conventions, l'arborescence, les enums `UNSPECIFIED`, les erreurs communes et les fixtures
  golden minimales;
- creer uniquement les messages necessaires aux sprints 03 a 09 avec statut explicite `draft` lorsque le
  domaine metier n'est pas encore livre;
- ne pas figer les details paiement, notification, scoring final, support/compliance ou mini-jeux avant
  leurs sprints proprietaires;
- toute route Hono transitoire doit pointer vers un message `.proto` et une exception documentee jusqu'au
  cablage ConnectRPC.

## Data

Fixtures golden manuelles ou generees, separees des schemas Prisma.

## UI States

Chaque state view doit documenter audience, champs sensibles exclus et erreurs publiques.

## Permissions

Les services admin/support/finance/joueur sont separes ou controles par RBAC serveur.

## Erreurs Observabilite

Contrats `common/v1/errors.proto`, status public, reason code stable, correlation id.

## Tests Attendus

- Lint/syntaxe proto si outil ajoute.
- Golden fixtures pour messages critiques.
- Tests de non exposition de champs sensibles par audience.
- Compatibilite generation Protobuf-ES si tooling installe.

## Definition Of Done

- Aucun endpoint public futur sans message `.proto` ou exception documentee.
- `@connectrpc/*` reste non installe tant que le sprint tooling ne code pas l'integration.
- Generation documentee avant usage dans web/API.
- Les contrats `draft` ne sont pas traites comme source definitive tant que le sprint proprietaire n'a pas
  valide scenarios, audience, erreurs et tests no-leak.

## Interdictions Specifiques

- Ne pas creer de service depuis une entite Prisma brute.
- Ne pas utiliser `protoc-gen-connect-es` pour Connect ES v2.
- Ne pas remplacer Colyseus/WebSocket live par ConnectRPC.
