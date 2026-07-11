# Step 02: Plan

**Task:** review and fix payment status, phone validation, realtime refresh, server ping, and game UI organization
**Started:** 2026-07-11T00:48:52Z

---

## Planning Progress

_Implementation plan will be written here..._

## Overview

Apply focused fixes instead of a broad live rewrite: normalize optional phone values, preserve backend business error codes, add a reusable server-health ping hook, and use existing polling patterns to keep lobby state current.

## File Changes

### `apps/api/src/auth/validation.ts`

- Add a small preprocessor for optional trimmed strings.
- Use it for `name` and `phone` so empty strings become `undefined`, while non-empty phone values still enforce 6-32 chars.

### `apps/api/src/auth/__tests__/validation.test.ts`

- Add regression tests for empty optional phone and trimmed valid phone.
- Add a short invalid phone case to prove real values still validate.

### `apps/web/src/lib/useSession.ts`

- Normalize register payload before `apiPost`: trim optional `name` and `phone`, omit them when blank.
- This keeps the client from sending `phone: ""`.

### `apps/web/src/components/auth/RegisterForm.tsx`

- Submit the normalized payload shape through `useSession`.
- Clear stale field errors as values change.
- Keep the optional label, but avoid showing phone error for blank input.

### `apps/web/src/services/api/BaseApiService.ts`

- Use the existing `ApiError.fromResponse` helper when the API returns `{ success:false, error:{ code, message, details } }`.
- Preserve `PROVIDER_UNAVAILABLE`, validation details and other domain codes instead of converting to `HTTP_ERROR`.

### `apps/web/src/components/auth/RegisterDrawer.tsx`

- Treat a Fapshi response without `checkoutUrl` as a status-page fallback.
- If initiate fails with `PROVIDER_UNAVAILABLE`, show the translated message and keep the user in the payment step.

### `apps/web/src/app/(arena)/payments/[id]/status/page.tsx`

- Add `providerStatus`, `checkoutUrl`, `createdAt`, `updatedAt` to the local payment type.
- Compute deadline from `createdAt` instead of page-load time.
- Show a clear provider-unavailable/retry state for `FAILED` + `INITIATE_FAILED`.
- Keep 3s polling for non-terminal local payment status only.

### `apps/web/src/hooks/useServerHealth.ts` (new)

- Poll `/api/health` with an abortable fetch and measure round-trip ms.
- Return `{ status, latencyMs, checkedAt, error }`.
- Default interval: 5s for lobby/live; no auth dependency.

### `apps/web/next.config.ts`

- Add rewrite from `/api/health` to `${API_URL}/health`, matching existing `/api/v1/*` proxy style.

### `apps/web/src/components/live/LiveRoomShell.tsx`

- Add optional `serverHealth` prop.
- Render compact server status/ping in the header, using green/gold/danger tones.
- Keep text compact to reduce visual density.

### `apps/web/src/components/lobby/LobbyPage.tsx`

- Use `useServerHealth`.
- Poll lobby every 5s with cleanup/abort guard.
- Preserve current explicit reload after check-in.
- Pass health to `LiveRoomShell`.

### `apps/web/src/app/(arena)/session/[code]/live/page.tsx`

- Use `useServerHealth` and pass it to `LiveRoomShell`.

### `apps/web/src/__tests__/live-games.test.ts`

- Add source-level checks that lobby auto-refreshes and live/lobby pass `serverHealth` to the shell.

### `apps/web/src/__tests__/payments.test.ts` (new)

- Add source-level regression that payment page handles `INITIATE_FAILED` and computes deadline from `createdAt`.

## Acceptance Criteria Mapping

- Optional phone no longer errors when blank: `validation.ts`, `useSession.ts`, `RegisterForm.tsx`, validation tests.
- Provider unavailable remains structured: `BaseApiService.ts` and payment UI.
- Payment UI clearer: payment status page changes and source tests.
- Other users refresh in lobby: `LobbyPage.tsx` interval and test.
- Ping/health visible: `useServerHealth.ts`, `next.config.ts`, `LiveRoomShell.tsx`, lobby/live pages and tests.

## Risks

- Full Colyseus protocol simplification is out of scope for this pass; we keep the current join-token/reservation flow.
- A true multi-client E2E refresh test would require browser orchestration and a running stack; this pass adds unit/source checks plus CLI validation.

---

## Step Complete

**Status:** ✓ Complete
**Files planned:** 14
**Tests planned:** 3
**Next:** step-03-execute.md
