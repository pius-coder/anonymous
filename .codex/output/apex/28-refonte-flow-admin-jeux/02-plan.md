# Step 02: Plan

**Task:** Analyser et refondre le flow d'administration des sessions de jeu: readiness joueurs, rounds, pause, notifications, suivi temps reel et dashboard operateur
**Started:** 2026-07-11T04:51:42Z

---

## Planning Progress

_Implementation plan will be written here..._

## Implementation Plan: admin game operations cockpit

### Overview

Replace the current static admin live page with an operator cockpit. Keep existing domain primitives where possible, but add a dedicated aggregated admin ops-state contract and wire admin actions to both database state and the live Colyseus room.

### File changes

#### apps/api/src/admin/sessionOpsState.ts (new)

- Build a single admin-facing session operations snapshot.
- Include session identity/status/config, readiness counts, blocking reasons, liveState, current round, current deadline, planned rounds, player rows, incident tail, audit tail, and recent chat.
- Player rows should join registration, payment status, PlayerConnection, RoundParticipant/PlayerAction/RoundOutcome for the current round.
- Compute canStart and canStartNextRound with explicit blocking reasons.

#### apps/api/src/routes/admin/sessions.ts

- Add GET /admin/sessions/:id/ops-state or enrich the existing session detail route with the ops-state payload.
- Keep sensitive fields behind ADMIN/SUPER_ADMIN where required by the role matrix.

#### apps/api/src/lobby/lobby.ts

- Add reason support to authorizeSessionStart.
- Return structured blocking reasons for min players/check-in readiness.
- Keep checkedInCount >= minPlayers as the normal start rule.
- If override is later supported, require reason and audit it explicitly.

#### apps/api/src/routes/admin/lobby.ts

- Update POST /admin/sessions/:id/start to validate reason/mode.
- Return readiness counts and blocking reasons on conflict.

#### apps/api/src/live/live.ts

- Add reason to resumeLiveSession.
- Change pause/resume to return live commands that can be published to the room.
- Prevent round start while PAUSED, ROUND_ACTIVE, or RESOLVING unless a specific reviewed override exists.
- Replace roundNum body usage with "next round" semantics from planned/actual state.

#### apps/api/src/routes/admin/live.ts

- Publish commands for pause and resume, not only start-round.
- Update start-round route to use next-round semantics and reason.
- Add optional close/finalize current round route if operator control requires manual round closure.

#### apps/game-server/src/rooms/GameSessionRoom.ts

- Extend LiveCommand handling for pause-live and resume-live.
- On pause, store previous phase, stop/hold timers, broadcast session.paused, and reject or queue player actions according to policy.
- On resume, restore the intended phase/deadline behavior and broadcast session.resumed.
- Remove automatic next-round start after results or put it behind an explicit autoAdvance policy visible in admin config.

#### apps/web/src/services/admin/types.ts

- Add AdminSessionOpsState, AdminOpsPlayerRow, AdminOpsRoundRow, AdminReadiness, AdminBlockingReason, AdminLiveCommandResult types matching the API.

#### apps/web/src/services/admin/adminApi.ts

- Add fetchAdminSessionOpsState and action helpers for start, pause, resume, next round, close round, notify players.

#### apps/web/src/app/admin/sessions/[id]/live/page.tsx

- Render the new cockpit shell instead of the current static session detail content.

#### apps/web/src/components/admin/AdminSessionOpsConsole.tsx (new client component)

- Poll ops-state every 3-5 seconds unless a websocket/admin stream is later added.
- Render phase banner, readiness summary, current round, deadline, operator action rail, player table, round timeline, event/audit feed, incident panel, and chat monitor.
- Refresh after every admin action and surface API blocking reasons directly.

#### apps/web/src/components/admin/AdminActionForms.tsx

- Replace "Forcer live" with "Demarrer la session" or "Autoriser le demarrage".
- Remove hardcoded roundNum 1.
- Require reason for pause, resume, start override, finalization, and manual result-impacting actions.

#### apps/web/src/components/lobby/LobbyPage.tsx

- Replace player copy about "forcer le live" with: "Tu es pret. Reste connecte, la session demarre quand les conditions sont validees."
- Consider button text "Je suis pret" while preserving check-in semantics in API.

#### apps/web/src/components/auth/SessionInscriptionCTA.tsx and apps/web/src/components/auth/RegisterDrawer.tsx

- Stabilize SSR/client initial markup for the CTA.
- Prefer a deterministic loading shell or server-provided registration snapshot over client-only divergent trigger structure.

#### apps/api/src/notifications/*

- Add admin-triggered in-app reminders for audiences: all registered, paid not checked-in, checked-in not in-room, disconnected players, current-round pending submissions.
- Keep WhatsApp optional and non-blocking.

### Testing strategy

- API integration tests for ops-state shape, readiness blocking, start authorization, pause/resume command publication, round start preconditions, and audit reason requirements.
- Game-server tests for pause/resume commands and no auto-advance when operator gate is enabled.
- Web component tests for cockpit loading/error/empty states and action disabled states.
- E2E flow: admin creates/publishes session, players pay/check in, admin sees readiness, starts live, pauses, player sees paused state, resumes, starts next round, reviews audit.

### Acceptance criteria mapping

- Admin can operate without switching to a player account: satisfied by AdminSessionOpsConsole + ops-state API.
- Ready/check-in before launch: satisfied by lobby readiness and start blocking reasons.
- Granular round control: satisfied by next-round/close-round actions and no automatic unreviewed advance.
- Pause reflected to players: satisfied by pause/resume live commands and room broadcasts.
- Player communication visible: satisfied by chat/event/audit/notification panels.
- Sensitive actions auditable: satisfied by reason-required admin actions and AuditLog entries.

### Risks

- Timer pause/resume semantics need careful design because deadlines exist in DB and timers exist in Colyseus.
- Existing dirty worktree is broad; implementation must avoid reverting unrelated user changes.
- Role matrix must be preserved: support can view/support, only ADMIN/SUPER_ADMIN can mutate live controls unless PRD changes.

## Step complete

Status: Complete
