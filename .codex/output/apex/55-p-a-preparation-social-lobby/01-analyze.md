# Step 01: Analyze

**Task:** P-A-PREPARATION - Lobby social et readiness
**Started:** 2026-07-18T01:20:54Z

---

## Context Discovery

_Findings will be appended here as exploration progresses..._

## Analyze Findings

### Base state
- Worktree: `/home/afreeserv/worktrees/anonymous/p-a-preparation-social-lobby`
- Branch: `apex/p-a-preparation-social-lobby`
- Base commit: `ea703ab`
- Current baseline already includes post-`P-A-ADMIN` merge and production freeze/data artifacts (`packages/contracts/docs/rest-exceptions.md`, `packages/db/prisma/migrations/20260717120000_production_data/migration.sql`).

### Docs read
- `docs/README.md`
- `docs/05-workflows/agent-worktree-convention.md`
- `docs/05-workflows/apex-parallel-worktrees.md`
- `docs/06-roadmap/apex-tasks/production/wave-a/P-A-PREPARATION-social-lobby.md`
- `docs/06-roadmap/apex-tasks/production/wave-a/P-A-REALTIME-authoritative-live.md`
- `docs/02-ux/announcements.md`
- `docs/02-ux/user-stories-ui.md`
- `docs/02-ux/frontend-architecture.md`
- `docs/03-architecture/realtime-and-streaming.md`
- `docs/01-product/actors-and-permissions.md`
- `docs/00-audit/v0.1-current-state.md`
- `docs/00-audit/head-forensic-audit.md`

### Context7
- `/colyseus/docs`: room lifecycle (`onAuth`, `onCreate`, `onJoin`, `onDrop`/`onReconnect`/`onLeave`), schema sync, `allowReconnection`, simulation interval, authoritative message handlers.
- `/phaserjs/phaser/v3_90_0`: scene lifecycle, `Scale.RESIZE`, resize events via Scale Manager, destroy/shutdown behavior for React mount/unmount.
- No retained chat SDK/provider found in repo dependencies; current room chat is UI-only local shell.

### What exists now
- API preparation use-cases already exist for `openPreparation`, `markPresent`, `markReady`, `sendPreparationAnnouncement`, `confirmStart`, `leavePreparation`, `getPreparationState` in `apps/api/src/use-cases/preparation/preparation.use-case.ts`.
- Player preparation REST routes exist in `apps/api/src/routes/preparation.ts`; admin preparation routes exist in `apps/api/src/routes/admin/preparation.ts`.
- Connect transport exists but is not the primary mounted web path yet: `apps/api/src/rpc/preparation-service.ts`.
- Lobby player/admin web panels are already wired to REST via `apps/web/src/services/preparationClient.ts`, `apps/web/src/components/player/LobbyPanel.tsx`, `apps/web/src/components/admin/AdminPreparationPanel.tsx`.
- `sendPreparationAnnouncement()` already creates `Announcement + AuditLog + NotificationJob(PENDING)` atomically; delivery stays out of scope (`A-WORKERS`).
- L3/L5 preparation tests already exist: `apps/api/src/__tests__/preparation-announcement.l3.integration.test.ts`, `apps/web/e2e/preparation-flow.spec.ts`.

### Gaps confirmed
- Lobby admission is not yet aligned with acceptance criteria: `markPresent()` still allows `REGISTERED`/`PAID`, and lobby read path does not explicitly block unpaid / not-admitted / revoked participants.
- `/room` page is still mock-backed: `apps/web/src/app/(client)/parties/[partyCode]/room/page.tsx` uses `findPlayerParty()` from `apps/web/src/components/player/player-data.ts`, which reads `ui-data` instead of server state.
- Room shell is partially real and partially mock:
  - Phaser/Colyseus client exists in `apps/web/src/components/game/phaser/createRoomGame.ts`.
  - Page shell `apps/web/src/components/game/RoomExperience.tsx` still hardcodes roster/chat content and exposes explicit `Aperçu local` fallback.
- Game server currently proves auth/movement/snapshots/reconnect basics only (`apps/game-server/src/rooms/GameRoom.ts`, handlers). No existing authoritative groups/invitations/chat/moderation surfaces were found.
- DB schema/repositories currently expose `PartyParticipation`, `RealtimeConnection`, `AuditLog`, `Announcement`, `NotificationJob`, `Incident`, `SupportAccessGrant`, `RetentionPolicyRule`; no dedicated persisted social group/invite/chat/moderation repository surface exists in `packages/db/src/repositories`.

### Ownership / risk observations
- `P-A-PREPARATION` task owns lobby/room social route/components and moderation surfaces, but `P-A-REALTIME` doc claims ownership over `apps/game-server/**` and `RealtimeAccess`. This is an overlap/risk area for any server-side social feature beyond existing prep read/write flows.
- Contracts and DB are frozen by `P-SEQ-02/03`; social group/chat persistence additions would require new contract/schema work and are therefore not available in this baseline without violating ownership.

### Most relevant files
- `apps/api/src/use-cases/preparation/preparation.use-case.ts`
- `apps/api/src/routes/preparation.ts`
- `apps/api/src/routes/admin/preparation.ts`
- `apps/api/src/use-cases/live/live-access.use-case.ts`
- `apps/web/src/services/preparationClient.ts`
- `apps/web/src/components/player/LobbyPanel.tsx`
- `apps/web/src/components/admin/AdminPreparationPanel.tsx`
- `apps/web/src/app/(client)/parties/[partyCode]/lobby/page.tsx`
- `apps/web/src/app/(client)/parties/[partyCode]/room/page.tsx`
- `apps/web/src/components/game/RoomExperience.tsx`
- `apps/web/src/components/game/phaser/createRoomGame.ts`
- `apps/game-server/src/rooms/GameRoom.ts`
- `packages/db/prisma/schema.prisma`
- `packages/db/src/repositories/{participation,realtime,announcement,notification}.repository.ts`
