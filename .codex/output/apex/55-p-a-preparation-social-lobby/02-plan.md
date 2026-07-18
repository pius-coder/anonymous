# Step 02: Plan

**Task:** P-A-PREPARATION - Lobby social et readiness
**Started:** 2026-07-18T01:20:54Z

---

## Planning Progress

_Implementation plan will be written here..._

## Implementation Plan: P-A-PREPARATION - Lobby social et readiness

### Overview
Tighten player admission to the preparation lobby using existing payment/admission axes, remove the remaining `/room` mock lookup, and make the room shell consume live-derived state instead of hardcoded social placeholders. Keep implementation inside currently available REST/web/client surfaces and avoid contract/DB expansion.

### File Changes

#### `apps/api/src/use-cases/preparation/preparation.use-case.ts`
- Around lines 115-119, replace the coarse `PRESENT_ELIGIBLE` gate with helpers that distinguish:
  - free / no-fee parties that may enter lobby from `REGISTERED`;
  - paid parties that require paid/admitted participation before `markPresent`;
  - revoked / released / cancelled access that must fail fast.
- Around lines 198-262, apply the new helper in `markPresent()` so unpaid players on paid parties cannot convert `REGISTERED -> PRESENT -> READY`.
- Around lines 498-538, apply the same access gate to `leavePreparation()` to keep error semantics coherent for revoked/cancelled entries.
- Around lines 541-592, add a player-scoped read path or self projection fields so lobby UI receives self payment/admission/connection axes and actionable access errors without exposing forbidden data.
- Preserve existing guarantees already present in lines 329-495: announcements stay pre-match only; confirm-start still locks preparation and never starts a round.

#### `apps/api/src/routes/preparation.ts`
- Around lines 30-107, keep route shape unchanged but ensure the player `GET /parties/:code/preparation` path uses the tightened lobby access logic and returns public, actionable errors for blocked admission/payment cases.
- Avoid transport expansion or central RPC mounting.

#### `apps/web/src/services/preparationClient.ts`
- Extend `PreparationParticipant` / `PreparationState` types with the self access fields returned by the API read model.
- Keep the existing REST client functions and query keys stable.

#### `apps/web/src/components/player/LobbyPanel.tsx`
- Around lines 46-108, keep query/mutation flow but derive self access state from the enriched server response instead of only mutation echoes.
- Around lines 129-156, improve blocked/error rendering so payment/admission denial is explicit and reconnect remains actionable.
- Around lines 214-307, make the CTA area reflect free-vs-paid admission and disable room entry on server-declared blocked states, not only `present/ready` booleans.
- Preserve no-auto-start announcement copy and stale/reconnect handling already in lines 164-180.

#### `apps/web/src/app/(client)/parties/[partyCode]/room/page.tsx`
- Replace the mock `findPlayerParty()` usage at lines 1-14 with `getPublicPartyByCode()` from the existing session adapter.
- Convert the fetched public detail into the room shell props (`id`, `code`, `name`, `game`) so the route stops depending on `ui-data`.

#### `apps/web/src/components/game/RoomExperience.tsx`
- Around lines 31-45, redefine room connection copy and local state so the shell distinguishes connected / reconnecting / preview / offline without fake social text.
- Around lines 47-157, remove hardcoded participant names and chat transcript, replacing them with room-state-driven generic roster rows, moderated social copy, and explicit “support / report / block unavailable on this baseline” messaging where necessary.
- Keep keyboard/mobile/reduced-motion/fullscreen flows intact.

#### `apps/web/src/components/game/phaser/createRoomGame.ts`
- Around lines 20-47, extend the room handle/callback types so the host shell can receive current roster/session-derived counts or generic participant rows.
- Around lines 223-295, surface join/leave/add/remove state changes back to the shell instead of leaving roster/chat panels hardcoded.
- Preserve the existing Phaser lifecycle and Colyseus join path already aligned with Context7 and current ownership.

#### `apps/web/e2e/preparation-flow.spec.ts`
- Extend the L5 preparation flow at lines 39-128 to prove the gated lobby behavior on the browser path (player admitted vs absent, no auto start still true after confirm).
- If needed, add a paid-party blocked case or explicitly admitted/free-party setup that matches the tightened lobby rules.

#### `apps/web/e2e/room.spec.ts`
- Update the preview-only room spec at lines 12-52 so it no longer depends on the route-level mock party lookup and still proves canvas mount/remount, controls, and explicit preview state.

#### `apps/api/src/use-cases/preparation/__tests__/preparation.use-case.test.ts`
- Add/adjust unit coverage for free-party allowed lobby entry, paid-party unpaid denial, revoked/released denial, and idempotent present/ready behavior.

#### `apps/api/src/__tests__/preparation-announcement.l3.integration.test.ts`
- Keep the existing atomic announcement proof and add the lobby-access assertions that can be demonstrated against real PostgreSQL without changing schema/contracts.

### Acceptance Criteria Mapping
- AC `joueur non paye ou revoque ne rejoint pas le lobby`: API preparation gate + lobby UI + tests.
- AC `refresh/reconnect conserve presence/ready/groupe sans doublon`: existing idempotent prep + room route mock removal + dynamic room shell; no duplicate readiness regression tests.
- AC `timer/rappel n'active jamais la partie`: preserved in current prep use-case/admin panel/tests; no implementation should touch that path.
- AC `admin voit les absents et confirme explicitement avant lancement`: already present in admin panel/use-case; regression coverage retained.
- AC `group/invitation/message/signalement respectent RBAC/rate limits/moderation`: only the UI shell / copy / explicit unsupported baseline messaging is currently plannable without crossing frozen contracts/DB and `apps/game-server/**` ownership.

### Risks & Constraints
- `apps/game-server/**` is claimed by `P-A-REALTIME`; authoritative persisted social chat/group features are not safely expandable here without ownership overlap.
- Contracts and DB are frozen by `P-SEQ-02/03`; no new persisted social entities/messages can be introduced in this lot.
- Existing room preview fallback is intentionally non-E2E-live; keep it explicit and do not let it masquerade as proof of realtime success.

---
## Step Complete
**Status:** ✓ Complete
**Files planned:** 10
**Tests planned:** 4
**Next:** step-03-execute.md
