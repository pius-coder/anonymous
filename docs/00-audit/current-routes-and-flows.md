# Routes et flux observes dans HEAD

## Routes web HEAD

Preuve : `apps/web/src/app/**`.

| Route | Fichier | Acteur | Lecture |
|---|---|---|---|
| `/` | `apps/web/src/app/(client)/page.tsx` | Public | Landing/acquisition |
| `/auth/login` | `(client)/auth/login/page.tsx` | Public | Connexion |
| `/auth/register` | `(client)/auth/register/page.tsx` | Public | Inscription |
| `/catalogue` | `(arena)/catalogue/page.tsx` | Joueur/public | Catalogue sessions |
| `/session/[code]` | `(arena)/session/[code]/page.tsx` | Joueur | Detail partie par code |
| `/session/[code]/lobby` | `(arena)/session/[code]/lobby/page.tsx` | Joueur | Lobby/check-in |
| `/session/[code]/live` | `(arena)/session/[code]/live/page.tsx` | Joueur | Live surcharge : briefing, mini-jeu, attente, spectateur, social |
| `/session/[code]/results` | `(arena)/session/[code]/results/page.tsx` | Joueur | Resultats |
| `/me` | `(arena)/me/page.tsx` | Joueur | Profil |
| `/me/sessions` | `(arena)/me/sessions/page.tsx` | Joueur | Historique/mes parties |
| `/notifications` | `(arena)/notifications/page.tsx` | Joueur | Notifications |
| `/payments/[id]/status` | `(arena)/payments/[id]/status/page.tsx` | Joueur | Statut paiement |
| `/admin` | `admin/page.tsx` | Admin | Dashboard |
| `/admin/sessions` | `admin/sessions/page.tsx` | Admin | Liste parties |
| `/admin/sessions/new` | `admin/sessions/new/page.tsx` | Admin | Creation partie |
| `/admin/sessions/[id]` | `admin/sessions/[id]/page.tsx` | Admin | Detail partie |
| `/admin/sessions/[id]/live` | `admin/sessions/[id]/live/page.tsx` | Admin | Supervision/commandes live |
| `/admin/live` | `admin/live/page.tsx` | Admin | Vue live globale |
| `/admin/minigames` | `admin/minigames/page.tsx` | Admin | Gestion definitions mini-jeux |
| `/admin/payments` | `admin/payments/page.tsx` | Finance/Admin | Paiements |
| `/admin/users` | `admin/users/page.tsx` | Admin/Support | Utilisateurs |
| `/admin/users/[id]` | `admin/users/[id]/page.tsx` | Admin/Support | Detail utilisateur |
| `/admin/wallets` | `admin/wallets/page.tsx` | Finance/Admin | Wallets |
| `/admin/audit` | `admin/audit/page.tsx` | Admin/Support | Audit logs |
| `/admin/compliance` | `admin/compliance/page.tsx` | Admin | Compliance gates |
| `/dev/ui`, `/dev/social` | `(arena)/dev/*` | Dev | Showcases gardes en prod |

## Routes API Hono HEAD

Preuve : `apps/api/src/index.ts`.

| Prefixe | Modules | Role |
|---|---|---|
| `/health` | `routes/health.ts` | Healthcheck |
| `/internal` | `internal/rounds`, `internal/notifications`, `internal/anticheat` | Appels internes worker/game-server |
| `/v1/public/sessions` | `public/sessions`, `public/session-detail` | Catalogue et detail publics |
| `/v1/share` | `routes/share.ts` | Liens partage |
| `/v1/auth` | `routes/auth.ts` | Register/login/logout/reset |
| `/v1/me` | `routes/me.ts`, `routes/notifications.ts` | Utilisateur courant, notifications |
| `/v1/admin/sessions` | `routes/admin/sessions.ts` | Admin configuration/lifecycle/simulation |
| `/v1` | `registrations`, `payments`, `wallet`, `lobby`, `results`, `players`, `security` | Parcours joueur/app |
| `/v1/admin/payments` | `routes/admin/payments.ts` | Paiements admin |
| `/v1/admin/wallets` | `routes/admin/wallets.ts` | Wallet admin |
| `/v1/admin` | lobby, live, results, operations, notifications, security | Admin operations transverses |
| `/v1/live` | `routes/live.ts` | Reservation et state live |
| `/v1/minigames` | `routes/minigames.ts` | Definitions mini-jeux public/app |
| `/v1/admin/minigames` | `routes/admin/minigames.ts` | Gestion mini-jeux |
| `/v1/webhooks` | `webhooks/whatsapp.ts` | Webhook notification |

## Flux joueur legacy

```text
Home/Catalogue
  -> Session detail by code
  -> Register
  -> Payment provider or wallet
  -> Lobby
  -> Check-in
  -> Join token
  -> Live reservation
  -> Colyseus game_session
  -> Round game messages
  -> Round resolved/session completed
  -> Results route
```

Preuves :

- `docs/audit-ui-api-trace.md`
- `apps/api/src/registrations/sessionRegistration.ts`
- `apps/api/src/payments/fapshi.ts`
- `apps/api/src/wallet/wallet.ts`
- `apps/api/src/lobby/lobby.ts`
- `apps/api/src/live/live.ts`
- `apps/web/src/hooks/useGameRoom.ts`

Probleme :

- Le joueur ne dispose pas d'un etat produit explicite apres fin de manche.
- Les messages live decident implicitement de l'UI.

## Flux admin legacy

```text
Dashboard admin
  -> Create session
  -> Publish/open registration
  -> Compliance gates
  -> Start live
  -> Live supervision
  -> Pause/resume/force close
  -> Results correction/publication
  -> Audit/support/incidents
```

Preuves :

- `apps/api/src/routes/admin/sessions.ts`
- `apps/api/src/routes/admin/live.ts`
- `apps/api/src/routes/admin/results.ts`
- `apps/api/src/admin/operations.ts`
- `apps/web/src/components/admin/*`
- `docs/admin-arbitrage/*`

Probleme :

- Plusieurs surfaces admin existent, mais pas un command center unifie avec lecture seule separee.
- Le controle, la supervision et l'arbitrage sont melanges dans les memes composants/routes.

## Flux live legacy

```text
GET /sessions/:id/join-token
POST /live/sessions/:id/reservation
Colyseus joinOrCreate("game_session")
onAuth -> consumeLiveReservation
onJoin -> joined + round.game
messages -> action/chat/group/ping
round close -> internal finalize -> round.resolved
```

Preuves :

- `docs/analysis-live-connection-flow.md`
- `apps/api/src/lobby/lobby.ts`
- `apps/api/src/live/live.ts`
- `apps/game-server/src/live/sessionStore.ts`
- `apps/game-server/src/rooms/GameSessionRoom.ts`

Probleme :

- Handshake trop lourd.
- DB transactions concurrentes.
- Source de verite live partagee entre API REST et game-server.

## Flux resultats legacy

```text
PlayerAction
  -> RoundResolution
  -> RoundResult/RoundOutcome/ResolutionLog
  -> GameResult/PrizeDistribution
  -> Results API
```

Preuves :

- `apps/api/src/rounds/roundResolution.ts`
- `apps/api/src/results/results.ts`
- `packages/game-engine/src/index.ts`
- `packages/game-engine/src/runtimes/*`

Probleme :

- La notion score provisoire vs score publie n'est pas assez visible dans les parcours joueur/admin.

## Routes cible

Les routes legacy ne sont pas reprises automatiquement.

La cible doit nommer les usages :

- joueur preparation : `/games/[code]/preparation`
- joueur round : `/games/[code]/round`
- joueur attente verification : `/games/[code]/waiting-review`
- joueur resultats publies : `/games/[code]/results`
- admin command center : `/admin/games/[id]/command`
- admin verification : `/admin/games/[id]/verification`
- observer readonly : `/observe/games/[id]`

Ces noms sont une proposition d'architecture d'information, pas une implementation validee.
