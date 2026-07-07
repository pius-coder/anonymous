# Feature 09 - GameSession live et orchestration temps reel

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Orchestrer la session live: rooms, phases, timers, reconnexion, pause/reprise, joueurs actifs/elimines et etat synchronise.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Fournir l experience centrale temps reel tout en gardant la verite critique cote serveur et base durable. |
| Target users | joueurs actifs, joueurs elimines, admins live, game-server |
| Business value | Critique: experience coeur du produit. |
| Technical complexity | Tres elevee: Colyseus, state sync, timers serveur, reconnexion, crash recovery, coherence DB/live. |
| Risk level | Tres eleve: desync, session bloquee, resolution incorrecte, latence, deconnexion, crash game-server. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Une room Colyseus par GameSession en V1.
- Phases live LOBBY/BRIEFING/ROUND_ACTIVE/RESOLVING/RESULTS/PAUSED.
- Timers ressentis via Colyseus clock, deadlines officielles en DB.
- Actions joueurs validees serveur et routees vers game-engine.
- Pause/reprise admin auditee et recovery worker.

## Parcours et workflows

1. Reservation live verifie auth + CHECKED_IN + session WAITING_START/LIVE.
2. Room creee, charge state depuis DB et annonce briefing.
3. Round start: DB RoundDeadline + event + timer Colyseus + BullMQ safety job.
4. Input joueur: action nonce + validation etat/round/deadline -> stockage ou rejet.
5. Reconnexion: allowReconnection restaure state sans rejouer action deja soumise.

## Logiques metier et invariants

- Colyseus gere le live mais ne decide pas des paiements.
- Le client affiche, le serveur decide.
- Deadline officielle de round en DB.
- Colyseus diffuse timer ressenti; BullMQ filet de securite.
- Reconnexion restaure etat joueur si possible.
- Pause admin auditee.
- Le client ne calcule jamais score, elimination ou gain officiel.

## Donnees principales

- `LiveRoomState`
- `RoundInstance`
- `RoundDeadline`
- `PlayerConnection`
- `AdminPauseEvent`
- `PlayerAction`

## API et contrats

- `WS /game/:sessionId`
- `POST /v1/live/sessions/:id/reservation`
- `POST /v1/admin/live/:sessionId/pause`
- `POST /v1/admin/live/:sessionId/resume`
- `GET /v1/live/:sessionId/state`

Erreurs et cas limites a normaliser :

- `403_NOT_CHECKED_IN`
- `409_SESSION_NOT_LIVE`
- `409_RECONNECT_WINDOW_EXPIRED`
- `410_ROUND_ALREADY_CLOSED`
- `409_ACTION_ALREADY_SUBMITTED`

## Evenements et jobs

- `live.room-created`
- `round.started`
- `round.deadline-set`
- `player.disconnected`
- `player.reconnected`
- `session.paused`

## Securite, conformite et audit

- Authoritative server.
- Action nonce/deduplication.
- Rate limit action submit.
- No sensitive answers in client state before resolution.
- Admin pause/restart audited.
- Restrict matchmaker so clients cannot create arbitrary rooms.

## Criteres d acceptation

- Timer officiel stocke cote serveur/DB.
- Reconnexion restaure etat sans replay action.
- Pause admin auditee.
- Crash game-server recuperable via DB/jobs.
- Late input apres deadline rejete.
- Room state divergence detectee/reparee.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `room_active_count`
- `reconnect_success_rate`
- `drop_rate`
- `round_close_lag_ms`
- `desync_repair_count`
- `late_input_rejected_count`

## Dependances fonctionnelles

- Feature 08 lobby/check-in
- Feature 10 game-engine
- Feature 11 mini-jeux
- Feature 13 admin live
- Feature 15 anti-triche

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- BRAINSTORMING.md apps/game-server et RoundStatus
- deep-research-report.md Colyseus room authoritative
- Colyseus rooms/presence/clock/reconnection
- BullMQ safety jobs
- PostgreSQL deadlines

References officielles techniques :

- Colyseus rooms, schema, presence, clock/timers, reconnection, matchmaking: https://docs.colyseus.io/llms.txt
- Redis data structures, presence/cache/pubsub patterns: https://redis.io/docs/latest/develop/index.html.md
- BullMQ jobs, delayed jobs, retries and jobId deduplication: https://docs.bullmq.io/readme.md
- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt
- PostgreSQL transaction isolation and retry expectations: https://www.postgresql.org/docs/current/transaction-iso.html
- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt

## Questions ouvertes

- Duree fenetre reconnexion.
- Room par session ou par round apres V1.
- Politique pause/reprise et compensation joueurs.
