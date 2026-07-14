# Analyse UML et diagrammes d'architecture

## Statut

Ces diagrammes remplacent l'UML simplifie initial.
Ils combinent :

- les preuves du `HEAD` legacy ;
- les anciens diagrammes d'arbitrage dans `HEAD:docs/admin-arbitrage/05-diagrammes.md` ;
- les contraintes produit donnees par l'utilisateur ;
- les limites de `v0.1` : pas d'implementation metier ajoutee pendant cette mission.

Chaque diagramme repond a une question precise.

## 1. Contexte systeme

Question : quels acteurs et systemes externes entourent la plateforme ?

```mermaid
flowchart LR
  Player[Joueur]
  AdminPrimary[Administrateur principal]
  AdminAssistant[Administrateur assistant]
  Support[Support]
  ReadObserver[Observateur lecture seule]
  PaymentProvider[Fournisseur paiement]
  NotificationProvider[Fournisseur notification]

  subgraph Platform[Plateforme parties multijoueurs]
    Web[Web Next.js]
    Api[API Hono]
    Realtime[Serveur temps reel Colyseus]
    Worker[Workers BullMQ]
    Domain[Domaine jeu]
    DB[(PostgreSQL via Prisma)]
    Redis[(Redis)]
  end

  Player --> Web
  AdminPrimary --> Web
  AdminAssistant --> Web
  Support --> Web
  ReadObserver --> Web

  Web --> Api
  Web --> Realtime
  Api --> Domain
  Api --> DB
  Api --> Redis
  Realtime --> Domain
  Realtime --> DB
  Realtime --> Redis
  Worker --> DB
  Worker --> Redis

  Api --> PaymentProvider
  Worker --> NotificationProvider
  NotificationProvider --> Worker
```

Decision : garder le monorepo et les runtimes actuels ; ne pas ajouter microservices tant que les limites
de responsabilite ne sont pas restaurees.

## 2. Packages et dependances cible

Question : quelles dependances sont autorisees entre modules ?

```mermaid
flowchart TB
  subgraph Apps
    WebApp[apps/web]
    ApiApp[apps/api]
    GameServer[apps/game-server]
    WorkerApp[apps/worker]
    Gateway[apps/whatsapp-gateway]
  end

  subgraph Packages
    Contracts[packages/contracts - futur Protobuf genere]
    Domain[packages/game-domain]
    GameEngine[packages/game-engine]
    DB[packages/db]
    Shared[packages/shared]
    Observability[packages/observability]
  end

  WebApp --> Contracts
  WebApp --> Shared
  ApiApp --> Contracts
  ApiApp --> Domain
  ApiApp --> DB
  ApiApp --> Shared
  GameServer --> Contracts
  GameServer --> Domain
  GameServer --> GameEngine
  GameServer --> DB
  WorkerApp --> Domain
  WorkerApp --> DB
  Gateway --> Contracts
  Domain --> Shared
  GameEngine --> Domain
  DB --> Shared
  Observability --> Shared
```

Interdictions :

- `apps/web` ne depend jamais de `packages/db`.
- `packages/game-engine` ne depend jamais de Hono, Next, Prisma ou Colyseus.
- `packages/db` n'exporte pas les entites Prisma comme contrats reseau.
- `apps/game-server` ne contient pas les workflows admin complets.

## 3. Domain model cible

Question : quels concepts doivent etre distincts ?

```mermaid
classDiagram
  class User {
    +id
    +email
    +role
    +isActive
  }

  class PlayerProfile {
    +userId
    +displayName
    +avatar
  }

  class Game {
    +id
    +code
    +status
    +scheduledAt
    +visibility
  }

  class GameParticipation {
    +id
    +gameId
    +userId
    +role
    +readinessState
    +connectionState
    +rights
  }

  class PreparationLobby {
    +gameId
    +openedAt
    +readinessSummary
  }

  class Announcement {
    +id
    +gameId
    +phase
    +message
    +createdBy
  }

  class Round {
    +id
    +gameId
    +number
    +status
    +miniGameKey
  }

  class MiniGameManifest {
    +key
    +version
    +family
    +playerMode
    +commandTypes
    +eventTypes
  }

  class PlayerCommand {
    +id
    +roundId
    +participationId
    +type
    +nonce
    +payload
  }

  class ProvisionalScore {
    +roundId
    +participationId
    +score
    +rank
    +evidenceHash
  }

  class PublishedScore {
    +roundId
    +participationId
    +score
    +rank
    +publishedAt
  }

  class RealtimeConnection {
    +id
    +participationId
    +roomId
    +status
    +reconnectUntil
  }

  User "1" --> "0..1" PlayerProfile
  User "1" --> "0..*" GameParticipation
  Game "1" --> "0..*" GameParticipation
  Game "1" --> "0..1" PreparationLobby
  Game "1" --> "0..*" Announcement
  Game "1" --> "0..*" Round
  Round "1" --> "1" MiniGameManifest
  Round "1" --> "0..*" PlayerCommand
  Round "1" --> "0..*" ProvisionalScore
  Round "1" --> "0..*" PublishedScore
  GameParticipation "1" --> "0..*" RealtimeConnection
  GameParticipation "1" --> "0..*" PlayerCommand
```

Decision : `GameParticipation` est le pivot manquant du legacy. Elle separe inscription, droits,
presence, etat joueur et observation.

## 4. Machine d'etat d'une partie

Question : quelles transitions sont autorisees et qui peut les declencher ?

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Scheduled: schedule(admin)
  Scheduled --> PreparationOpen: openPreparation(admin ou rappel planifie)
  PreparationOpen --> PreparationLocked: lockPreparation(admin)
  PreparationOpen --> Cancelled: cancel(admin)
  PreparationLocked --> RoundSetup: prepareRound(admin)
  RoundSetup --> RoundBriefing: startBriefing(admin)
  RoundBriefing --> RoundActive: startRound(admin)
  RoundActive --> RoundClosing: closeRound(server deadline ou admin)
  RoundClosing --> Verification: computeProvisional(server)
  Verification --> ResultsPublished: publishResults(admin)
  Verification --> RoundSetup: requestCorrection(admin)
  ResultsPublished --> RoundSetup: nextRound(admin)
  ResultsPublished --> Completed: completeGame(admin)
  RoundActive --> Suspended: pause(admin)
  Suspended --> RoundActive: resume(admin)
  Suspended --> Failed: fail(system/admin)
  Failed --> PreparationOpen: recover(admin)
  Draft --> Cancelled: cancel(admin)
  Scheduled --> Cancelled: cancel(admin)
  Completed --> [*]
  Cancelled --> [*]

  note right of Scheduled
    L'heure planifiee ne declenche jamais
    automatiquement RoundActive.
  end note
```

Transition interdite :

- `Scheduled -> RoundActive` par timer.
- `PreparationOpen -> RoundActive` sans action admin.
- `RoundClosing -> ResultsPublished` sans verification explicite.

## 5. Machine d'etat d'une participation

Question : comment suivre un joueur rattache explicitement a une partie ?

```mermaid
stateDiagram-v2
  [*] --> Invited
  Invited --> Registered: acceptInvitation/player
  Registered --> Paid: paymentConfirmed/system
  Paid --> Present: checkIn/player
  Present --> Ready: markReady/player
  Ready --> InRoom: connectRealtime/server
  InRoom --> Playing: roundStarted/server
  Playing --> FinishedRound: submitOrTimeout/server
  Playing --> Disconnected: networkDrop/server
  Disconnected --> Playing: reconnectBeforeDeadline/server
  Disconnected --> Abandoned: reconnectExpired/server
  FinishedRound --> WaitingReview: roundClosed/server
  WaitingReview --> ResultsVisible: resultsPublished/admin
  ResultsVisible --> Ready: nextRound/admin
  ResultsVisible --> Completed: gameCompleted/admin
```

Decision : les etats de paiement, preparation, connexion et round ne doivent pas etre ecrases dans un
unique enum d'inscription.

## 6. Sequence preparation et annonce admin

Question : comment l'administration gere l'avant-match ?

```mermaid
sequenceDiagram
  participant A as Administrateur
  participant API as API application
  participant DB as Persistence
  participant Notif as Notifications
  participant Player as Client joueur

  A->>API: OpenPreparation(gameId, reason)
  API->>DB: verifier droits + transition
  API->>DB: enregistrer PreparationOpen + audit
  API-->>A: etat preparation

  A->>API: SendAnnouncement(gameId, message)
  API->>DB: creer Announcement phase=PREPARATION
  API->>Notif: enqueue notification push/message
  Notif-->>API: delivery status si disponible
  API-->>Player: evenement AnnouncementDisplayed
```

Regle : l'annonce de preparation n'apparait pas dans la selection mini-jeu active.

## 7. Sequence lancement manuel de manche

Question : comment empecher le timer de demarrer seul ?

```mermaid
sequenceDiagram
  participant A as Administrateur autorise
  participant API as API application
  participant Room as Serveur temps reel
  participant DB as Persistence
  participant Player as Joueur

  A->>API: StartRound(gameId, roundId, overrideNotReady?, reason)
  API->>DB: verifier droits, phase, participants attendus
  API->>DB: enregistrer command + audit
  API-->>Room: RoundStartCommand
  Room->>Room: appliquer etat autoritaire
  Room-->>Player: RoundBriefingStarted
  A->>API: ConfirmRoundActive(roundId)
  API-->>Room: RoundActivateCommand
  Room-->>Player: RoundStarted
```

Decision : le serveur peut compter le temps d'une manche active, mais ne choisit pas seul le passage
en manche active.

## 8. Sequence commande joueur et score provisoire

Question : ou sont validees les actions competitives ?

```mermaid
sequenceDiagram
  participant Player as Client joueur
  participant Room as Colyseus Room mince
  participant Engine as MiniGame Runtime
  participant DB as Persistence
  participant Admin as Admin command center

  Player->>Room: SubmitPlayerCommand(type, nonce, payload)
  Room->>Room: verifier participation + phase + rate limit
  Room->>Engine: validateCommand(command, public/private state)
  Engine-->>Room: accepted/rejected + evidence
  Room->>DB: persister PlayerCommand + AntiCheatEvent si besoin
  Room-->>Player: CommandAccepted ou CommandRejected
  Room-->>Admin: PlayerProgressUpdated
  Room->>Engine: resolveRound(snapshot)
  Engine-->>Room: ProvisionalScoreSet
  Room->>DB: persister score provisoire + evidence hash
  Room-->>Admin: ProvisionalScoresReady
```

Regle : les scores critiques ne viennent jamais directement du client.

## 9. Sequence fin de manche joueur

Question : que doit voir le joueur apres avoir termine ?

```mermaid
sequenceDiagram
  participant Player as Client joueur
  participant Room as Serveur temps reel
  participant API as API application
  participant Admin as Administration

  Player->>Room: commande finale ou timeout
  Room-->>Player: PlayerRoundFinished
  Player->>Player: afficher WaitingReviewState
  Admin->>API: verifier anomalies et scores provisoires
  API-->>Admin: dossier verification
  Admin->>API: PublishResults(roundId, reason)
  API-->>Room: ResultsPublishedEvent
  Room-->>Player: PublishedResultsAvailable
```

Le joueur ne recoit pas les scores definitifs avant `PublishResults`.

## 10. Sequence observation lecture seule

Question : comment observer sans controler le joueur ?

```mermaid
sequenceDiagram
  participant Player as Joueur
  participant Room as Serveur autoritaire
  participant Observer as Observateur lecture seule
  participant Admin as Admin

  Player->>Room: commandes joueur
  Room->>Room: validation serveur
  Room-->>Player: etat joueur autorise
  Room-->>Admin: evenement supervision detaille
  Room-->>Observer: snapshot filtre + evenements autorises
  Observer--xRoom: aucune commande joueur
  Admin--xPlayer: aucun controle direct
```

Decision : rendu distant par snapshots/evenements. Pas de capture video sauvegardee en premiere version.

## 11. Sequence verification et publication

Question : comment separer score provisoire et score publie ?

```mermaid
sequenceDiagram
  participant Room as Serveur live
  participant API as API application
  participant DB as Persistence
  participant A as Administrateur
  participant Worker as Worker
  participant Player as Joueur

  Room->>API: CloseRound(roundId, snapshotHash)
  API->>DB: creer ProvisionalScore + ResolutionLog
  API-->>A: dossier verification
  A->>API: validateOrCorrect(roundId, corrections, reason)
  API->>DB: enregistrer decision + audit
  A->>API: publishResults(roundId)
  API->>DB: creer PublishedScore versionne
  API->>Worker: enqueue rewards si applicable
  API-->>Player: results published
```

Regle : une correction admin doit etre auditee et liee a une regle documentee.

## 12. Flux de donnees temps reel cible

Question : quels messages doivent etre contractes ?

```mermaid
flowchart LR
  Command[PlayerCommand protobuf] --> Room[Realtime transport]
  AdminCommand[AdminCommand protobuf] --> API[Application API]
  API --> RoomCommand[RoomCommand protobuf]
  Room --> Event[RealtimeEvent protobuf]
  Event --> PlayerProjection[Projection joueur]
  Event --> AdminProjection[Projection admin]
  Event --> ObserverProjection[Projection lecture seule]
  Room --> PersistenceEvent[GameEvent/AuditLog]
  PersistenceEvent --> DB[(PostgreSQL)]
```

Contrats minimaux :

- Commands joueur.
- Commands admin.
- Events live.
- Snapshots lecture seule.
- Erreurs stables.
- Resultats provisoires et publies.

## 13. Matrice de permissions cible

Question : qui peut faire quoi ?

```mermaid
flowchart TB
  View[Consulter partie] --> AdminPrimary
  View --> AdminAssistant
  View --> Support
  Observe[Observer lecture seule] --> ReadObserver
  Prepare[Ouvrir preparation] --> AdminPrimary
  Announce[Envoyer annonce preparation] --> AdminPrimary
  Start[Demarrer manche] --> AdminPrimary
  Pause[Pause urgence] --> AdminPrimary
  Pause --> AdminAssistant
  Recommend[Recommander correction] --> AdminAssistant
  Decide[Valider/corriger score] --> AdminPrimary
  Publish[Publier resultats] --> AdminPrimary
  Finance[Traiter paiements/gains] --> FinanceRole[Finance]
  SupportCase[Traiter support] --> Support
```

Decision ouverte : valider si les roles `AdminPrimary`, `AdminAssistant`, `Support`, `Finance` doivent
etre des roles produit distincts ou des permissions attribuables.

## 14. Deploiement logique

Question : comment deployer sans complexite inutile ?

```mermaid
flowchart TB
  Browser[Browser]
  Web[Next.js Web]
  Api[Hono API Node]
  Game[Colyseus Node]
  Worker[BullMQ Worker]
  Redis[(Redis)]
  Postgres[(PostgreSQL)]
  Payment[Payment Provider]
  Notification[Notification Provider]

  Browser --> Web
  Browser --> Api
  Browser --> Game
  Web --> Api
  Api --> Postgres
  Api --> Redis
  Game --> Postgres
  Game --> Redis
  Worker --> Postgres
  Worker --> Redis
  Api --> Payment
  Worker --> Notification
```

Decision : ce diagramme ne justifie pas microservices supplementaires. Il justifie seulement des
processus separes par runtime : web, API, game-server, worker.

## 15. Diagrammes a produire apres decisions

- ERD cible detaille apres validation du modele `GameParticipation`.
- Sequence exacte d'auth live apres decision cookie opaque vs token court.
- Diagramme par mini-jeu prioritaire apres choix du premier runtime a reconstruire.
- Diagramme de securite RBAC apres validation roles/permissions.
