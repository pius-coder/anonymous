# Step 01: Analyze

**Task:** Analyser et refondre le flow d'administration des sessions de jeu: readiness joueurs, rounds, pause, notifications, suivi temps reel et dashboard operateur
**Started:** 2026-07-11T04:51:42Z

---

## Context Discovery

_Findings will be appended here as exploration progresses..._

## Local docs read

- docs/plan/04-configuration-sessions-admin.md
- docs/plan/08-lobby-check-in.md
- docs/plan/09-session-live-temps-reel.md
- docs/plan/10-game-engine-resolution-rounds.md
- docs/plan/13-dashboard-admin-audit-support.md
- docs/plan/14-notifications-whatsapp.md
- docs/plan/19-phase3-operateur-lancement.md
- docs/prd/features/04-configuration-sessions-admin.md
- docs/prd/features/08-lobby-check-in.md
- docs/prd/features/09-session-live-temps-reel.md
- docs/prd/features/10-game-engine-resolution-rounds.md
- docs/prd/features/13-dashboard-admin-audit-support.md
- docs/prd/features/14-notifications-whatsapp.md
- docs/BRAINSTORMING.md
- docs/PRD_PHASE_1.md
- docs/PRD_PHASE_2.md
- docs/cahier_des_charges_technique_plateforme_sessions_jeu.md
- docs/deep-research-report.md
- docs/catalogue-mini-jeux.md

## Context7 docs used

- /vercel/next.js for the hydration mismatch on App Router/client components.

## Package versions verified

- Next.js 16.2.10
- React 19.2.4 / react-dom 19.2.4
- Hono 4.12.28
- Prisma 6.19.3
- Colyseus 0.17.10 / @colyseus/schema 4.0.27 / @colyseus/sdk 0.17.43
- BullMQ 5.79.3 / ioredis 5.10.1
- Vitest 2.1.9 / Playwright 1.61.1

## Findings

1. The user complaint is valid. The current admin live page is not a production operator cockpit. It shows high-level status and a players table, but not the actual operational state needed to run a live session.

2. The data model already has several primitives required by the PRDs:
   - GameSessionStatus includes DRAFT, PUBLISHED, ACTIVE, WAITING_START, LIVE, COMPLETED, CANCELLED.
   - SessionRegistrationStatus includes PAID, CHECKED_IN, IN_ROOM, NO_SHOW.
   - LivePhase includes LOBBY, BRIEFING, ROUND_ACTIVE, RESOLVING, RESULTS, PAUSED.
   - The schema also has LiveSessionState, PlayerConnection, RoundInstance, RoundParticipant, RoundDeadline, PlayerAction, RoundResult, GameEvent, AuditLog, IncidentLog, NotificationJob.

3. The admin UI does not expose these primitives:
   - apps/web/src/components/admin/AdminSessionLiveContent.tsx renders stats, controls, a minimal live state card, and a registrations table.
   - apps/web/src/components/admin/AdminLiveStateCard.tsx only shows previousPhase, currentRoundId, phaseStartedAt, pausedAt and pauseReason.
   - apps/web/src/components/admin/AdminLivePlayersTable.tsx only reads session.registrations and does not show connection status, lastSeenAt, reconnectUntil, current round submission, action status, elimination, or player communication.

4. Current controls are unsafe/unclear for production:
   - apps/web/src/components/admin/AdminActionForms.tsx labels the start action "Forcer live".
   - It starts roundNum 1 hardcoded.
   - Start, resume, and round start do not require an operator reason in the UI.
   - Resume does not require a reason server-side.

5. Pause/resume is incomplete:
   - apps/api/src/routes/admin/live.ts publishes a command only for round start.
   - pause and resume update the database but do not publish live commands to the game room.
   - apps/game-server/src/rooms/GameSessionRoom.ts handleLiveCommand only handles "start-round".
   - Therefore a pause can be recorded in DB without reliably pausing the Colyseus room/player experience.

6. Round control is not operator-gated:
   - apps/game-server/src/rooms/GameSessionRoom.ts automatically starts the next round after RESULTS_DURATION_MS.
   - This contradicts the requested operator flow where the admin reviews readiness/results and deliberately starts the next step.

7. Lobby readiness exists partially:
   - apps/api/src/lobby/lobby.ts authorizeSessionStart requires checkedInCount >= minPlayers and sets the session LIVE.
   - The admin UI does not present this as a readiness matrix with blocking reasons.
   - The player lobby copy says "L'admin peut forcer le live puis lancer le premier round", reinforcing the wrong model.

8. Hydration mismatch is a separate immediate bug:
   - apps/web/src/components/auth/SessionInscriptionCTA.tsx renders a disabled Button while loading.
   - Once client auth state resolves, it can render RegisterDrawer.
   - RegisterDrawer wraps the trigger in a span, so the server/client initial tree can differ.
   - Next.js docs confirm this class of mismatch occurs when SSR and first client render produce different markup.

## Product conclusion

The fix is not a patch on the current dashboard. The live admin surface should be rewritten as an operator cockpit backed by a dedicated ops-state API. The cockpit must make the state machine visible: paid players, checked-in players, in-room players, connected players, current phase, current round, deadline, submitted actions, results, incidents, recent chat, notifications, and audit trail.

## Step complete

Status: Complete
