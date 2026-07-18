# Step 03: Execute

**Task:** P-A-PREPARATION - Lobby social et readiness
**Started:** 2026-07-18T01:20:54Z

---

## Implementation Log

_Changes will be logged here as implementation progresses..._

## Applied changes

- Hardened lobby admission in `apps/api/src/use-cases/preparation/preparation.use-case.ts`.
  Added `self` projection fields, payment/admission gate helpers, revoked access handling, and reused the gate across `markPresent()`, `markReady()`, `leavePreparation()`, and player-scoped `getPreparationState()`.
- Updated `apps/api/src/routes/preparation.ts` so player `GET /parties/:code/preparation` uses `getPreparationState({ partyId, userId })` directly and returns the tightened access errors from the preparation use-case.
- Extended unit coverage in `apps/api/src/use-cases/preparation/__tests__/preparation.use-case.test.ts` for:
  free-party present flow,
  paid-party unpaid denial,
  self access projection,
  revoked lobby read denial.
- Extended L3 coverage in `apps/api/src/__tests__/preparation-announcement.l3.integration.test.ts` with the paid-party unpaid denial on `markPresent()`.
- Extended `apps/web/src/services/preparationClient.ts` with `PreparationSelfState` and `PreparationState.self`.
- Updated `apps/web/src/components/player/LobbyPanel.tsx` to prefer server-provided self status and display payment/admission/connection axes in the player status card.
- Replaced the room page mock lookup in `apps/web/src/app/(client)/parties/[partyCode]/room/page.tsx` with `getPublicPartyByCode()`.
- Removed fake roster/chat placeholders from `apps/web/src/components/game/RoomExperience.tsx` in favor of live-derived generic roster labels and explicit moderated-baseline messaging.

## Scope note

- No DB schema, protobuf, central mount, or authoritative social-group/chat persistence was introduced in this lot.
- `apps/game-server/**` remained untouched because that surface is already claimed by `P-A-REALTIME` and current contracts/schema are frozen.

---
## Step Complete
**Status:** ✓ Complete
**Touched files:** 8
**Next:** step-04-validate.md
