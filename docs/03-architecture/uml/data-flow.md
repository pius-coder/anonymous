# UML - Data Flow

Question: comment les messages, projections et donnees durables circulent ?

```mermaid
flowchart LR
  Web[Web UI] --> Command[Command/Query Protobuf]
  Command --> API[API Hono / ConnectRPC cible]
  API --> UseCase[Use case application]
  UseCase --> Domain[Domaine]
  UseCase --> Repo[Repositories]
  Repo --> DB[(PostgreSQL)]
  UseCase --> Audit[AuditLog]
  API --> Response[Response Protobuf]
  Response --> Web
```

```mermaid
flowchart LR
  PlayerCommand[PlayerCommand protobuf] --> Room[Realtime transport]
  Room --> Domain[Domaine/runtime]
  Room --> RealtimeEvent[RealtimeEvent protobuf]
  RealtimeEvent --> PlayerView[Projection joueur]
  RealtimeEvent --> AdminView[Projection admin]
  RealtimeEvent --> ObserverView[Projection observer]
  Room --> DB[(Persistence/audit/evidence)]
```

Regles:

- Les schemas Prisma ne sortent pas comme contrats reseau.
- Une projection a toujours une audience.
- Les champs sensibles sont exclus par contrat, pas seulement caches par UI.
