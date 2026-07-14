# Audit forensique du HEAD legacy

## Objet

Ce document audite le `HEAD` Git legacy, pas seulement le socle nettoye sur `v0.1`.
Il reconstitue ce qui existait reellement avant nettoyage, avec preuves verifiables.

Objectif : reprendre le projet comme un produit serieux, pas comme une fondation au rabais.
La conclusion n'est pas "tout jeter" ; la conclusion est : isoler les decisions valables,
supprimer les melanges de responsabilites et reconstruire par contrats.

## Sources et preuves

Commandes executees :

- `git ls-tree -r --name-only HEAD`
- `git ls-tree -r -l HEAD`
- `git grep` cible sur routes, rooms, schema Prisma, workers, hooks, imports et docs legacy
- `git show HEAD:<path>` sur les fichiers structurants
- `npx ctx7@latest library/docs` pour Next.js, Hono, Colyseus, Prisma et BullMQ

Index complet :

- `docs/00-audit/head-file-index.md` contient la liste complete des 928 fichiers suivis dans `HEAD`.

## Inventaire quantitatif HEAD

| Zone | Volume observe | Role |
|---|---:|---|
| Total fichiers HEAD | 928 | Code, docs, sorties agents, assets, configs |
| `apps/` | 426 | Web, API, game-server, worker, gateway |
| `packages/` | 60 | DB, game-engine, shared |
| `docs/` | 67 | PRD, plans, audits, arbitrage, catalogue |
| `analysis/` | 21 | Rapports d'audit admin/API |
| `.codex/` | 283 | Journaux APEX et captures |
| `.claude/` | 20 | Journaux agents |

Fichiers critiques par taille ou centralite :

| Fichier HEAD | Taille/poids | Lecture architecturale |
|---|---:|---|
| `packages/db/prisma/schema.prisma` | 1333 lignes | Modele metier massif, deja proche d'un back-office complet |
| `apps/game-server/src/rooms/GameSessionRoom.ts` | 993 lignes | Room Colyseus trop chargee : auth live, rounds, chat, groupes, pings, resultats |
| `apps/game-server/src/live/sessionStore.ts` | 919 lignes | Store live + transactions + finalisation + persistence |
| `packages/db/prisma/seed.ts` | 850 lignes | Seed riche, destructif sous garde, melange donnees demo/recette |
| `apps/api/src/routes/admin/sessions.ts` | 797 lignes | Admin session, lifecycle, publication, simulation, lancement |
| `apps/api/src/minigames/catalogue.ts` | 785 lignes | 36 definitions API, schema/config, anti-cheat, seed catalogue |
| `apps/api/src/results/results.ts` | 704 lignes | Resultats, publication, distribution, disputes |
| `apps/api/src/admin/operations.ts` | 645 lignes | Dashboard/admin/support/audit/actions, trop large |
| `apps/api/src/live/live.ts` | 544 lignes | Reservation live, admin live, etat operations |
| `apps/web/src/components/live/LiveRoomShell.tsx` | 508 lignes | UI live joueur/spectateur/chat/groupes/mini-jeux dans un composant |
| `apps/web/src/hooks/useGameRoom.ts` | 397 lignes | Handshake, Colyseus, messages, state local, social, chat, erreurs |

## Runtimes et bibliotheques verifies

| Runtime | Version HEAD/package | Documentation verifiee | Implication |
|---|---|---|---|
| Next.js | `next@16.2.10` dans `apps/web/package.json` | `/vercel/next.js` via ctx7 | App Router, layouts/pages fichier, route handlers possibles |
| React | `19.2.4` | via stack Next | UI client/server a separer strictement |
| Hono | `hono@^4.6.0` | `/websites/hono_dev` via ctx7 | Sous-routeurs chainees, validation middleware, handlers minces |
| Colyseus | `colyseus@^0.17`, `@colyseus/schema@^4.0.27` | `/colyseus/docs` via ctx7 | Room lifecycle, state schema, messages, reconnexion |
| Prisma | `prisma@^6.0.0` | `/prisma/web` via ctx7 | Schema/migrations, transactions, relations, client type-safe |
| BullMQ | `bullmq@^5.x` | `/taskforcesh/bullmq` via ctx7 | Jobs, retries, idempotence ; pas moteur de transitions produit |
| Pixi.js | `pixi.js@^8.16.0` | present dans web | Support jeux canvas, pas encore architecture runtime propre |

## Structure applicative HEAD

### API Hono

Preuve : `apps/api/src/index.ts`.

Routes montees :

- `/health`
- `/internal` : rounds, notifications, anticheat
- `/v1/public/sessions`
- `/v1/share`
- `/v1/auth`
- `/v1/me`
- `/v1/admin/sessions`
- `/v1/admin/payments`
- `/v1/admin/wallets`
- `/v1/admin/minigames`
- `/v1/admin/*` : lobby, live, results, operations, notifications, security
- `/v1/live`
- `/v1/minigames`
- `/v1/webhooks/whatsapp`
- routes player-facing sous `/v1` : registrations, payments, wallet, lobby, results, players, security

Constat :

- Le montage Hono est lisible, mais la granularite interne n'est pas stable.
- Beaucoup de routes appellent Prisma directement.
- Les schemas Zod, les DTO de sortie et les types React coexistent sans source de verite.
- Les routes admin regroupent configuration, lifecycle, operations, support, compliance et arbitrage.

### Web Next.js

Preuves : `apps/web/src/app/**`.

Routes HEAD :

- Public/client : `(client)/page.tsx`, auth login/register.
- Arena joueur : `(arena)/catalogue`, `(arena)/session/[code]`, `lobby`, `live`, `results`, profil, paiements.
- Admin : `/admin`, `/admin/sessions`, `/admin/sessions/[id]`, `/admin/sessions/[id]/live`, `/admin/live`, `/admin/minigames`, `/admin/payments`, `/admin/users`, `/admin/wallets`, `/admin/audit`, `/admin/compliance`.
- Dev : `(arena)/dev/ui`, `(arena)/dev/social`.

Constat :

- Les routes existent, mais les parcours ne sont pas conceptuellement separes.
- Le joueur passe de session detail -> lobby -> live -> results, mais `/live` absorbe briefing, mini-jeu, attente, spectateur, chat et fin de round.
- L'admin a plusieurs surfaces (`admin/live`, `admin/sessions/[id]/live`, dashboard), sans contrat de supervision unique.
- Les services web (`apps/web/src/services/*`) dupliquent les formes de reponse deja presentes dans API/shared.

### Game server Colyseus

Preuves : `apps/game-server/src/rooms/GameSessionRoom.ts`, `apps/game-server/src/live/sessionStore.ts`.

Responsabilites reelles :

- Authentification live par reservation token.
- Chargement participants.
- State Colyseus `LiveRoomState`.
- Gestion reconnexion.
- Briefing et start round.
- Fermeture/finalisation de round.
- Broadcast resultats.
- Chat global/prive/groupe.
- Groupes sociaux, invitations, candidatures, locks.
- Pings, emotes, roles caches.
- Appel API interne pour finalisation.

Constat :

- La room est autoritaire, ce qui est bon pour le jeu.
- Elle porte trop de responsabilites produit et sociales dans un seul objet.
- Elle connait des details de mini-jeux par `publicStateForGame`.
- Elle declenche des transitions temporisees (`BRIEFING_DURATION_MS`, `RESULTS_DURATION_MS`) alors que le futur produit exige un controle admin explicite.
- Elle diffuse `round.resolved` avant separation claire entre score provisoire et score publie.

### Base de donnees Prisma

Preuve : `packages/db/prisma/schema.prisma`.

Groupes de modeles :

- Identite : `User`, `PlayerProfile`, `PlayerStatsSnapshot`, `AuthSession`, `PasswordResetToken`, `RoleAssignment`.
- Partie/session : `GameSession`, `SessionRegistration`, `JoinToken`.
- Live : `LiveSessionState`, `LiveReservation`, `PlayerConnection`.
- Rounds/mini-jeux : `RoundInstance`, `MiniGameDefinition`, `RoundParticipant`, `RoundDeadline`, `PlayerAction`, `AntiCheatEvent`.
- Resultats : `RoundResult`, `RoundOutcome`, `ResolutionLog`, `GameEvent`, `GameResult`, `PrizeDistribution`, `CommissionRecord`, `DisputeWindow`.
- Administration/securite : `AuditLog`, `SupportCase`, `IncidentLog`, `AdminActionApproval`, `RiskSignal`, `RateLimitBucket`, `ComplianceGate`, `ModerationAction`.
- Notifications : `NotificationPreference`, `MessageTemplate`, `NotificationJob`, `DeliveryLog`, `ConsentRecord`, `OutboundMessage`, `ShareLink`.

Constat :

- Le schema couvre beaucoup plus qu'un MVP.
- Le probleme n'est pas l'ambition ; le probleme est le manque de frontieres entre concepts.
- `SessionRegistration` porte paiement, check-in et in-room. La cible doit introduire une `GameParticipation` explicite ou clarifier que `SessionRegistration` devient cette participation.
- `JoinToken` + `LiveReservation` creent un flux live lourd deja critique dans `docs/analysis-live-connection-flow.md`.
- `GameEvent` existe mais ne suffit pas a garantir event sourcing ; ne pas promettre un event store complet sans besoin prouve.

### Workers et queues

Preuves : `apps/api/src/queues/*`, `apps/worker/src/*`, `apps/game-server/src/live/roundDeadlineQueue.ts`.

Jobs identifies :

- Deadline check-in.
- Expiration registration.
- Reconciliation paiement.
- Distribution credits.
- Rappels notifications.
- Deadline round.

Constat :

- BullMQ est utile pour les traitements asynchrones.
- Les jobs doivent rester idempotents et observables.
- Un job/timer ne doit pas devenir une transition automatique vers partie active.
- Les deadlines de round peuvent fermer/finaliser une manche selon regle, mais le demarrage de manche reste admin.

## Mini-jeux : trois niveaux differents dans HEAD

### Niveau 1 - Catalogue produit 120

Preuve : `docs/catalogue-mini-jeux.md`.

Le catalogue produit contient 120 titres organises en 6 familles :

- Solo QI/reflexe : 20.
- Duel 1v1 : 20.
- Alliance forcee/binome : 20.
- Equipe libre : 20.
- Survie collective : 20.
- Role cache : 20.

Il est restaure dans `docs/01-product/minigame-catalog.md`.

### Niveau 2 - Definitions API 36

Preuve : `apps/api/src/minigames/catalogue.ts`, test `apps/api/src/minigames/__tests__/catalogue.test.ts`.

Le code contenait 36 definitions MVP :

- Solo : `memory-sequence`, `rapid-calculation`, `target-precision`, `pattern-recall`, `logic-grid`, `timing-window`.
- Duel : `pure-reaction-duel`, `mirror-match`, `quick-draw`, `duel-calculation`, `rhythm-duel`, `bluff-duel`.
- Alliance : `trust-bridge`, `shared-code`, `pair-memory`, `alliance-balance`, `split-focus`, `relay-logic`.
- Team : `team-relay`, `squad-signal`, `formation-hold`, `team-calculation`, `resource-sort`, `synchronized-tap`.
- Survival : `safe-zones`, `shrinking-floor`, `danger-sweep`, `last-light`, `obstacle-path`, `endurance-count`.
- Hidden role : `signal-detective`, `silent-vote`, `decoy-hunt`, `role-memory`, `suspect-pattern`, `alibi-check`.

Ces definitions portaient :

- `configSchema`
- `defaultConfig`
- `allowedActions`
- `antiCheatPolicy`
- `clientStateSchema`
- `uiCopy`

Constat :

- C'est une bonne base d'inventaire technique.
- Ce n'est pas un contrat reseau stable.
- Les schemas JSON/Zod doivent etre remplaces ou derives depuis Protobuf/contrats versionnes.

### Niveau 3 - Runtimes reellement implementes

Preuves : `packages/game-engine/src/runtimes/*`, `apps/game-server/src/live/sessionStore.ts`.

Runtimes dedies :

- `memory-sequence`
- `rapid-calculation`
- `pure-reaction-duel`

Runtimes de recette regroupes :

- `trust-bridge`
- `team-relay`
- `danger-sweep`
- `silent-vote`

Preuve complementaire : `RECETTE_ROUND_KEYS` dans `apps/game-server/src/live/sessionStore.ts`.

Conclusion :

- 120 mini-jeux produits.
- 36 definitions techniques seedables.
- 6 jeux de recette live.
- 3 runtimes dedies.

Ce decalage doit etre affiche comme risque produit majeur, pas masque.

## Erreurs et problemes deja documentes dans HEAD

### 1. Publication publique bloquee par compliance

Preuve : `docs/audit-rapport-incoherences.md`, `apps/api/src/security/security.ts`,
`apps/api/src/routes/admin/sessions.ts`.

Cause :

- Gates creees `BLOCKED` par defaut.
- Endpoint de lecture existant.
- Pas de vrai workflow de validation/deblocage complet dans l'experience admin.

Impact :

- Toute session publique peut etre bloquee.

Decision cible :

- Garder le concept de gate compliance.
- Reecrire le workflow admin comme verification explicite, avec audit et roles.

### 2. Donnees admin perdues ou hardcodees

Preuve : `docs/audit-rapport-incoherences.md`, route admin session detail.

Exemples :

- `durationMs` retourne 0.
- `policy` retourne null.
- statuts affiches bruts.

Decision cible :

- Les projections admin doivent etre des read models explicites, testes, pas des mappings ad hoc.

### 3. Paiement wallet non trace comme transaction

Preuve : `docs/audit-rapport-incoherences.md`, `apps/api/src/wallet/wallet.ts`,
`apps/api/src/routes/admin/payments.ts`.

Cause :

- Wallet debit met l'inscription payee mais ne cree pas toujours une `PaymentTransaction`.

Decision cible :

- Un paiement doit avoir un evenement/trace unique quelle que soit la source : provider externe ou wallet.

### 4. Flux live trop lourd

Preuve : `docs/analysis-live-connection-flow.md`.

Flux legacy :

1. `GET /sessions/:id/join-token`.
2. `POST /live/sessions/:id/reservation`.
3. `client.joinOrCreate("game_session", { sessionId, reservationToken })`.
4. `GameSessionRoom.onAuth` consomme la reservation.

Problemes :

- Trois etapes avant WebSocket.
- Deux transactions Serializable.
- Write conflicts P2034 en rafale.
- API REST et game-server modifient les memes concepts live.

Decision cible :

- Un handshake live simplifie, authentifie, observable et idempotent.
- La source de verite live doit etre unique.

### 5. `/live` surcharge plusieurs cas d'usage

Preuves :

- `apps/web/src/app/(arena)/session/[code]/live/page.tsx`
- `apps/web/src/components/live/LiveRoomShell.tsx`
- `apps/web/src/hooks/useGameRoom.ts`
- image utilisateur : "EN ATTENTE DU SERVEUR..."

Cas melanges :

- Chargement live.
- Briefing.
- Mini-jeu actif.
- Carte sociale.
- Chat.
- Spectateur.
- Joueur elimine.
- Fin de round.
- Session completed.
- Resultats.

Decision cible :

- Etats joueur explicites :
  - `PREPARATION_WAITING`
  - `ROUND_BRIEFING`
  - `ROUND_ACTIVE`
  - `ROUND_FINISHED_WAITING_REVIEW`
  - `RESULTS_PUBLISHED`
  - `ELIMINATED_OBSERVING`
  - `RECONNECTING`
  - `ERROR_RECOVERABLE`
  - `ERROR_BLOCKING`

### 6. Admin et joueur trop couples

Preuves :

- `AdminSessionLiveContent` polling session.
- `GameSessionRoom` broadcast resultats et evenements directement.
- `docs/admin-arbitrage/05-diagrammes.md` decrit pourtant des roles Admin A/Admin B/Support plus riches.

Decision cible :

- Administration command center separe :
  - command lease ou controle exclusif si besoin ;
  - timeline des evenements ;
  - participants et connexions ;
  - verification scores ;
  - publication explicite ;
  - vue lecture seule par joueur via snapshots/evenements, sans controle.

## Causes racines

1. Le terme "session" a servi a designer a la fois partie, inscription, lobby, room live et parcours web.
2. `SessionRegistration` a absorbe trop d'etats : achat, presence, check-in, entree room, participation.
3. Les contrats sont disperses : Prisma, Zod, types React, Colyseus Schema, JSON config.
4. La room Colyseus contient orchestration, social, chat, mini-jeu, resultats et persistence.
5. Les routes admin sont fonctionnelles mais pas alignees sur un modele de supervision/verdict/publication.
6. Le catalogue mini-jeux est plus ambitieux que les runtimes disponibles.
7. Les docs legacy contiennent des decisions valables, mais elles sont dispersees entre PRD, plans, rapports, APEX et audits.

## Decisions a conserver

| Decision | Preuve HEAD | Sort cible |
|---|---|---|
| Monorepo apps/packages | `pnpm-workspace.yaml`, packages | KEEP |
| Next.js pour web | `apps/web/package.json` | KEEP |
| Hono pour API | `apps/api/package.json`, `apps/api/src/index.ts` | KEEP |
| Colyseus pour temps reel | `apps/game-server/package.json`, `GameSessionRoom.ts` | KEEP avec redesign room boundaries |
| Prisma/PostgreSQL | `packages/db/prisma/schema.prisma` | KEEP mais schema a reduire/recomposer |
| BullMQ/Redis jobs | queues et worker | KEEP pour jobs idempotents |
| Auth cookie opaque | `apps/api/src/auth/session.ts` | KEEP comme hypothese technique a valider |
| AuditLog | `schema.prisma`, routes admin | KEEP |
| Compliance gates | `security.ts`, admin compliance | KEEP concept, REWRITE workflow |
| Mini-game families | catalogue + Prisma enum | KEEP |
| Anti-cheat server-side | `AntiCheatEvent`, `allowedActions`, nonce | KEEP |
| Read-only observer via snapshots/events | demande utilisateur + architecture live | KEEP |

## Elements a reecrire

| Element | Preuve HEAD | Raison |
|---|---|---|
| `GameSessionRoom.ts` | 993 lignes | Trop de responsabilites dans la room |
| `sessionStore.ts` | 919 lignes | Transactions, live, finalisation, DB dans un seul module |
| `LiveRoomShell.tsx` | 508 lignes | UI joueur/spectateur/social/mini-jeu melangee |
| `useGameRoom.ts` | 397 lignes | Handshake, messages et state UI couples |
| Routes admin sessions | `apps/api/src/routes/admin/sessions.ts` | Lifecycle, validation, read model, publication dans un fichier |
| `apps/api/src/live/live.ts` | 544 lignes | Reservation live et ops live a separer |
| Resultats | `apps/api/src/results/results.ts` | Score provisoire/publication/distribution a contracter |
| Mini-game definitions | `apps/api/src/minigames/catalogue.ts` | JSON/Zod a remplacer par contrats versionnes |
| Prisma schema complet | `schema.prisma` | Recomposer par domaines et migrations controlees |

## Elements a supprimer ou archiver

| Element | Preuve HEAD | Raison |
|---|---|---|
| Sorties agents `.codex/output`, `.claude/output` | 303 fichiers environ | Historique utile ponctuellement, pas source produit |
| `apps/web/playwright-report/index.html` | fichier genere | Artefact de test, pas source |
| Fonts dupliquees `src/app/fonts` et `public/fonts` | memes blobs | Duplication assets |
| Routes dev en prod | `(arena)/dev/*` | A garder seulement sous garde stricte ou package dev |
| Workflow join-token + live-reservation legacy | `JoinToken`, `LiveReservation` | Trop lourd et conflit transactionnel |
| DTO/types dupliques frontend/shared | audit incoherences | Drift permanent |

## Architecture cible analytique

### Domaines

| Domaine | Responsabilite | Donnees principales | Interdits |
|---|---|---|---|
| Identity | utilisateurs, sessions auth, roles | User, AuthSession, RoleAssignment | logique de jeu |
| Game Planning | creation/configuration partie | GameSession draft/scheduled/config | live room |
| Participation | rattachement joueur-partie | GameParticipation, status preparation, droits | paiement brut sans audit |
| Preparation Lobby | presence, pret, annonces avant-match | readiness, announcements | selection mini-jeu active |
| Round Orchestration | cycle manche | Round, RoundParticipant, deadlines | UI directe |
| MiniGame Runtime | commandes/evenements/scoring local au jeu | manifest, public/private state | DB directe dans runtime pur |
| Realtime Transport | room, connexion, reconnexion | connection, snapshots | decision metier non deleguee |
| Scoring Publication | provisoire, verification, publication | provisional score, published result | diffusion prematuree |
| Admin Command Center | supervision/decision | actions admin, audit, incidents | controle client joueur |
| Notifications | annonces/rappels/statuts livraison | job, delivery log | demarrage de partie |
| Payments/Wallet | transactions et ledger | payment, wallet, ledger | score/round |
| Observability | logs, traces, metrics | audit/technical events | secrets |

### Regle de dependance

```text
UI -> application API/realtime clients -> contracts -> use cases -> domain -> persistence ports
Transports -> contracts -> use cases/domain
Workers -> use cases -> persistence ports
Domain -> aucun framework
Persistence -> Prisma uniquement
```

### Contrats

La cible Protobuf doit separer :

- Commands : `CreateGame`, `OpenPreparation`, `MarkReady`, `StartRound`, `SubmitPlayerCommand`, `PublishResults`.
- Queries : `GetAdminGameState`, `GetPlayerState`, `ListParticipants`, `GetReadonlySnapshot`.
- Events : `ParticipantConnected`, `PreparationAnnouncementSent`, `RoundStarted`, `PlayerFinishedRound`, `ProvisionalScoreReady`, `ResultsPublished`.
- Errors : codes stables, pas messages UI comme source de verite.

## Plan de reconstruction par sprints

1. Audit et decisions HEAD : extraire les decisions valables, archiver les restes, valider vocabulaire.
2. Modele produit : partie, participation, lobby, round, mini-jeu, session live, score provisoire/publie.
3. Contrats Protobuf : packages par domaine, regles compat, generation plus tard.
4. DB minimale : identity, game, participation, round, result, audit, notification.
5. Auth/RBAC : cookie opaque ou autre decision documentee, guards API, guards layouts.
6. Realtime core : Colyseus room mince, commands/events, reconnect, snapshots read-only.
7. Lobby preparation : invites, presence, ready, annonces, notifications.
8. Admin command center : supervision, timeline, participants, verification, publication.
9. Player states : etats explicites dont attente fin de manche et resultats non publies.
10. Mini-game framework : manifest, runtime contract, test harness, premier runtime.
11. Scoring/publication : provisoire, anomalies, correction, publication.
12. Notifications : provider, delivery status, opt-in, audit.
13. Migration legacy controlee : reintegrer morceau par morceau ce qui a une preuve et des tests.

## Questions bloquantes restantes

- Le role "admin autorise" doit-il etre un seul role ou une separation Admin A/Admin B/Support/Finance comme dans les anciens diagrammes ?
- Le catalogue produit 120 doit-il rester complet dans la vision, ou faut-il prioriser une famille pour reconstruire la premiere version ?
- Le mecanisme auth cible conserve-t-il le cookie opaque `__Host-session`, ou faut-il une federation externe ?
- Le fournisseur notification cible est-il WhatsApp uniquement, push web, SMS, ou plusieurs canaux ?
- Les scores financiers/gains font-ils partie de la prochaine reconstruction ou doivent-ils rester hors premier lot ?
- Le flux lecture seule doit-il afficher uniquement le rendu mini-jeu courant, ou aussi timeline, inputs anonymises et preuves ?
