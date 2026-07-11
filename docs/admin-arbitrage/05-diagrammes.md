# Diagrammes de conception

Ces diagrammes cadrent l'implementation. Ils doivent etre mis a jour si le modele metier change.

## 1. Diagramme de contexte general

```mermaid
flowchart LR
  Player[Joueur] --> Web[Next.js Web]
  AdminA[Admin A arbitre principal] --> AdminUI[Dashboard admin]
  AdminB[Admin B assistant] --> AdminUI
  Support[Support] --> AdminUI

  Web --> API[Hono API]
  AdminUI --> API
  Web --> GameServer[Colyseus game-server]

  API --> DB[(PostgreSQL)]
  API --> Redis[(Redis)]
  API --> Queue[BullMQ]
  GameServer --> Redis
  GameServer --> DB
  GameServer --> Engine[Game Engine]
  Engine --> EventStore[Registre evenementiel]
  API --> EventStore
  Worker[Worker] --> Queue
  Worker --> DB
  Worker --> EventStore
```

## 2. Architecture Session Orchestrator / Rooms / Event Store

```mermaid
flowchart TB
  Orchestrator[Session Orchestrator] --> Rules[Rules Snapshot]
  Orchestrator --> Program[Round Program]
  Orchestrator --> LiveState[LiveSessionState]
  Orchestrator --> Commands[Command Bus]

  Commands --> Room[Colyseus Room]
  Room --> RoomState[Authoritative Room State]
  Room --> Inputs[Validated Player Inputs]
  Inputs --> Engine[Resolver / Game Engine]
  Engine --> Provisional[Result Provisional]
  Provisional --> SilentCheck[Silent Check]
  SilentCheck --> Decisions[Decisions]
  Decisions --> Results[Official Results]

  Room --> EventStore[(Event Store)]
  Engine --> EventStore
  Decisions --> EventStore
  Results --> EventStore
```

## 3. Machine d'etat d'une session

```mermaid
stateDiagram-v2
  [*] --> DRAFT
  DRAFT --> PUBLISHED: publish
  PUBLISHED --> ACTIVE: open registration
  ACTIVE --> LOCKED: lock lobby
  LOCKED --> WAITING_START: readiness ok
  WAITING_START --> LIVE: authorize start
  LIVE --> PAUSED: pause
  PAUSED --> LIVE: resume
  LIVE --> UNDER_REVIEW: blocking incident
  UNDER_REVIEW --> LIVE: decision no blocking impact
  UNDER_REVIEW --> COMPLETED: final round confirmed
  LIVE --> COMPLETED: final round confirmed
  COMPLETED --> PUBLISHED_RESULTS: publish result version
  PUBLISHED_RESULTS --> FINAL: appeal window closed
  DRAFT --> CANCELLED
  PUBLISHED --> CANCELLED
  ACTIVE --> CANCELLED
  LOCKED --> CANCELLED
```

## 4. Machine d'etat d'un round

```mermaid
stateDiagram-v2
  [*] --> CONFIGURED
  CONFIGURED --> READY: participants resolved
  READY --> BRIEFING: admin starts
  BRIEFING --> RUNNING: countdown complete
  RUNNING --> PAUSED: pause allowed
  PAUSED --> RUNNING: resume
  RUNNING --> RESOLVING: deadline/close
  RESOLVING --> PROVISIONAL: resolver output
  PROVISIONAL --> SILENT_CHECK
  SILENT_CHECK --> CONFIRMED: no blocking incident
  SILENT_CHECK --> UNDER_REVIEW: incident
  UNDER_REVIEW --> CONFIRMED: confirm/correct
  UNDER_REVIEW --> REPLAY_ORDERED
  UNDER_REVIEW --> VOID
  CONFIRMED --> PUBLISHED
  REPLAY_ORDERED --> READY: new instance
  VOID --> [*]
  PUBLISHED --> [*]
```

## 5. Sequence de creation de session

```mermaid
sequenceDiagram
  participant A as Admin A
  participant UI as Admin UI
  participant API as API
  participant DB as PostgreSQL
  participant ES as Event Store

  A->>UI: configure session + rounds
  UI->>API: validate program
  API->>DB: read MiniGameDefinition versions
  API->>API: validate rules, winnersCount, edge cases
  API-->>UI: validation report
  A->>UI: publish
  UI->>API: POST publish(commandId, reason)
  API->>DB: transaction create session snapshot
  API->>ES: SESSION.PUBLISHED
  API-->>UI: published
```

## 6. Sequence de lancement d'un round

```mermaid
sequenceDiagram
  participant A as Admin A
  participant UI as Dashboard
  participant API as API
  participant DB as PostgreSQL
  participant Redis as Redis Command Bus
  participant Room as Colyseus Room
  participant ES as Event Store

  A->>UI: Demarrer le prochain round
  UI->>API: POST next-round(commandId, lease, sessionVersion, reason)
  API->>DB: verify lease, phase, previous result confirmed
  API->>DB: create RoundDeadline
  API->>ES: ROUND.START_REQUESTED
  API->>Redis: publish start-round
  Redis->>Room: start-round
  Room->>Room: set BRIEFING then RUNNING
  Room->>ES: ROUND.STARTED
  Room-->>UI: state through ops polling/stream
```

## 7. Sequence de reconnexion

```mermaid
sequenceDiagram
  participant P as Player
  participant Room as Colyseus Room
  participant DB as PostgreSQL
  participant UI as Admin UI
  participant ES as Event Store

  P-xRoom: network drop
  Room->>Room: onDrop()
  Room->>DB: mark DISCONNECTED + reconnectUntil
  Room->>ES: PLAYER.DROPPED
  Room->>Room: allowReconnection(timeout)
  UI->>DB: poll ops-state
  DB-->>UI: reconnectUntil visible
  P->>Room: reconnect
  Room->>Room: onReconnect()
  Room->>DB: mark CONNECTED
  Room->>ES: PLAYER.RECONNECTED
```

## 8. Sequence multi-admin

```mermaid
sequenceDiagram
  participant A as Admin A
  participant B as Admin B
  participant API as API
  participant DB as PostgreSQL
  participant ES as Event Store

  A->>API: renew controlLease
  API->>DB: upsert active lease
  B->>API: propose correction
  API->>DB: create AdminActionRequest
  API->>ES: ADMIN.ACTION_REQUESTED
  A->>API: approve/decide with lease
  API->>DB: verify lease + version
  API->>DB: apply decision if approvals satisfied
  API->>ES: DECISION.CONFIRMED
```

## 9. Sequence incident et revision

```mermaid
sequenceDiagram
  participant Room as Colyseus Room
  participant Engine as Game Engine
  participant ES as Event Store
  participant B as Admin B
  participant A as Admin A
  participant API as API

  Room->>Engine: close round with snapshot
  Engine->>ES: RESULT.PROVISIONAL_CREATED
  Engine->>Engine: silent check
  Engine->>ES: INCIDENT.OPENED
  B->>API: open review dossier
  API-->>B: timeline, rule, evidence, recalculation
  B->>API: recommend CORRECT
  API->>ES: DECISION.RECOMMENDED
  A->>API: final decision
  API->>ES: DECISION.CONFIRMED
  API->>ES: RESULT.CORRECTED/CONFIRMED
```

## 10. Sequence de vote secret

```mermaid
sequenceDiagram
  participant P1 as Player 1
  participant P2 as Player 2
  participant Room as Colyseus Room
  participant ES as Event Store
  participant Engine as Resolver

  Room->>Room: open vote window
  P1->>Room: submit vote nonce
  Room->>ES: VOTE.RECEIVED sealed
  P2->>Room: submit vote nonce
  Room->>ES: VOTE.RECEIVED sealed
  Room->>Room: close vote
  Room->>Engine: resolve sealed votes
  Engine->>ES: VOTE.REVEALED authorized
  Engine->>ES: RESULT.PROVISIONAL_CREATED
```

## 11. Sequence de publication des resultats

```mermaid
sequenceDiagram
  participant A as Admin A
  participant API as API
  participant DB as PostgreSQL
  participant ES as Event Store
  participant Worker as Worker

  A->>API: publish result version
  API->>DB: verify no blocking incidents
  API->>DB: create resultVersion + integrityHash
  API->>ES: RESULT.PUBLISHED
  API->>Worker: enqueue prize distribution if allowed
  Worker->>DB: idempotent ledger credits
  Worker->>ES: CREDITS.DISTRIBUTED
```

## 12. Modele de donnees cible

```mermaid
erDiagram
  GameSession ||--o{ RoundInstance : has
  GameSession ||--|| SessionRulesSnapshot : locks
  GameSession ||--o{ SessionControlLease : controls
  GameSession ||--o{ GameEvent : records
  GameSession ||--o{ Incident : opens
  GameSession ||--o{ ResultVersion : publishes

  MiniGameDefinition ||--o{ MiniGameRulesVersion : versions
  MiniGameRulesVersion ||--o{ RoundInstance : used_by
  RoundInstance ||--o{ RoundParticipant : includes
  RoundInstance ||--o{ PlayerAction : receives
  RoundInstance ||--o{ RoundResult : produces
  RoundInstance ||--o{ ResolutionLog : proves
  RoundInstance ||--o{ Incident : triggers

  Incident ||--o{ ReviewDossier : has
  ReviewDossier ||--o{ ArbitrationDecision : decisions
  ArbitrationDecision ||--o{ AdminApproval : approvals

  ResultVersion ||--o{ PrizeDistribution : releases
```

## 13. Matrice des permissions

```mermaid
flowchart TB
  View[Consulter session] --> AdminA
  View --> AdminB
  View --> Support

  Incident[Classer incident] --> AdminA
  Incident --> AdminB
  Incident --> Support

  Start[Demarrer round] --> LeaseA[Admin avec controlLease]
  Resume[Reprendre] --> LeaseA
  Pause[Pause urgence] --> AdminA
  Pause --> AdminB

  Recommend[Recommander correction] --> AdminB
  Decide[Decision finale] --> AdminA
  Critical[Correction critique] --> Approval[Double approbation Admin A + Admin B]
  Secret[Reveler secret] --> Approval
  Publish[Publier resultats] --> AdminA
```

## 14. Schema du registre d'evenements

```mermaid
flowchart LR
  E1[previousEventHash] --> E2[eventId + sequenceNumber]
  E2 --> E3[serverTimestamp]
  E3 --> E4[eventType]
  E4 --> E5[payload]
  E5 --> E6[ruleReference]
  E6 --> E7[previousStateHash]
  E7 --> E8[newStateHash]
  E8 --> E9[traceId + sourceService]
  E9 --> E10[next previousEventHash]
```

## 15. Wireframes Admin A et Admin B

### Admin A

```text
+--------------------------------------------------------------------+
| SESSION | ROUND | PHASE | RESULT STATUS | LEASE | SERVER HEALTH    |
+--------------------------------------------------------------------+
| Action principale | Blocages | Pause | Transferer | Publier        |
+-------------------+--------------------------------+---------------+
| Match en direct                                    | Decisions     |
| - round actuel                                     | - a trancher  |
| - timer                                            | - approvals   |
| - participants                                     | - publication |
+----------------------------------------------------+---------------+
| Timeline rounds | Resultats provisoires | Feuille de match       |
+--------------------------------------------------------------------+
```

### Admin B

```text
+--------------------------------------------------------------------+
| SESSION | ROUND | INCIDENTS | REVISION QUEUE | SERVER HEALTH       |
+--------------------------------------------------------------------+
| Players monitor         | Centre d'arbitrage                      |
| - connexions            | - incidents ouverts                     |
| - submissions           | - preuves                               |
| - latence               | - recommandations                       |
| - tickets               | - approvals critiques                   |
+--------------------------------------------------------------------+
| Event replay | Chat/support | Anti-cheat | Reglement applicable    |
+--------------------------------------------------------------------+
```
