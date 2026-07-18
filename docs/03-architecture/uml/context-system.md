# UML - Contexte Systeme

Question: quels acteurs, runtimes et dependances entourent la plateforme ?

```mermaid
flowchart LR
  Player[Joueur]
  Admin[Admin]
  Support[Support]
  Finance[Finance]
  Observer[Observateur lecture seule]
  Payment[Fournisseur paiement]
  Notification[Fournisseur notification]

  subgraph Platform[Plateforme parties multijoueurs]
    Web[Web Next.js]
    Api[API Hono / ConnectRPC cible]
    Realtime[Game server Colyseus/WebSocket]
    Worker[Workers]
    Domain[Domaine jeu]
    DB[(PostgreSQL)]
    Redis[(Redis)]
  end

  Player --> Web
  Admin --> Web
  Support --> Web
  Finance --> Web
  Observer --> Web
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
  Api --> Payment
  Worker --> Notification
```

```mermaid
flowchart TB
  WebApp[apps/web] --> Contracts[packages/contracts]
  WebApp --> Shared[packages/shared]
  ApiApp[apps/api] --> Contracts
  ApiApp --> Domain[packages/game-engine ou domaine futur]
  ApiApp --> DB[packages/db]
  GameServer[apps/game-server] --> Contracts
  GameServer --> Domain
  GameServer --> DB
  Worker[apps/worker] --> Domain
  Worker --> DB
  Gateway[apps/whatsapp-gateway] --> Contracts
```

Interdictions:

- `apps/web` ne depend jamais de `packages/db`.
- Les contrats reseau ne sont pas des entites Prisma.
- Le game-server ne possede pas les workflows admin complets.
