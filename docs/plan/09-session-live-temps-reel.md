# Feature 09 - Plan Scrum - GameSession live temps reel

## Objectif sprint

Orchestrer une session live avec Colyseus : room, phases, timers, actions, reconnexion, pause/reprise.

## Dependances

- Feature 08 lobby/check-in.
- Colyseus configure.
- Redis et BullMQ disponibles.

## User stories

### Story 9.1 - Reservation live

Etapes :

1. Creer endpoint `POST /v1/live/sessions/:id/reservation`.
2. Verifier auth, registration CHECKED_IN, session startable.
3. Creer seat reservation Colyseus ou token bridging.
4. Retourner endpoint WS.

Tests :

- CHECKED_IN OK.
- Non checked-in refuse.
- Session non live refuse.

### Story 9.2 - Room Colyseus par session

Etapes :

1. Creer room `GameSessionRoom`.
2. Charger state initial depuis DB.
3. Definir phases : BRIEFING, ROUND_ACTIVE, RESOLVING, RESULTS, PAUSED.
4. Synchroniser uniquement donnees utiles au client.

Tests :

- Room creee.
- State minimal synchronise.
- Client ne peut pas creer room arbitraire.

### Story 9.3 - Timers et deadlines

Etapes :

1. Utiliser clock Colyseus pour timer ressenti.
2. Persister `RoundDeadline` en DB.
3. Planifier job BullMQ de fermeture.
4. Rejeter actions apres deadline.

Tests :

- Deadline DB existe.
- Late input refuse.
- Worker ferme round si room tombe.

### Story 9.4 - Reconnexion et pause admin

Etapes :

1. Implementer `allowReconnection`.
2. Restaurer etat joueur.
3. Creer `POST /v1/admin/live/:sessionId/pause`.
4. Creer `POST /v1/admin/live/:sessionId/resume`.
5. Auditer pause/reprise.

Tests :

- Reconnexion restaure state.
- Action deja soumise non replay.
- Pause/resume audite.

## Definition of Done

- Room live fonctionnelle.
- Timer officiel durable.
- Reconnexion testee.
- Crash/recovery minimal teste.

