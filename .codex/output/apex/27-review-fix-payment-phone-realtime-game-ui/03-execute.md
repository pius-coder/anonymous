# Step 03: Execute

**Task:** review and fix payment status, phone validation, realtime refresh, server ping, and game UI organization
**Started:** 2026-07-11T00:48:52Z

---

## Implementation Log

### Completed Changes

- Normalized optional auth fields so blank `phone` and `name` values are omitted before API validation, while non-empty phone numbers still enforce min/max length.
- Cleared stale register form field errors when users edit inputs.
- Preserved structured API error codes in the web API client, including `PROVIDER_UNAVAILABLE`.
- Added payment status handling for failed Fapshi initiation, with a clearer unavailable-provider state and retry path.
- Based the payment countdown on the payment `createdAt` timestamp instead of the browser page-load time.
- Added a reusable server health hook polling `/api/health` and measuring latency.
- Added the `/api/health` Next rewrite to the API health route.
- Passed live server health to lobby/live shells and rendered a compact realtime ping indicator.
- Added periodic lobby refresh so group/member changes from another user are reloaded without a manual page refresh.
- Added targeted tests covering phone normalization, payment provider-unavailable responses, payment status UI source behavior, and live refresh/ping wiring.

### Files Touched By This Fix

- `apps/api/src/auth/validation.ts`
- `apps/api/src/auth/__tests__/validation.test.ts`
- `apps/api/src/routes/__tests__/payments.test.ts`
- `apps/web/next.config.ts`
- `apps/web/src/app/(arena)/payments/[id]/status/page.tsx`
- `apps/web/src/app/(arena)/session/[code]/live/page.tsx`
- `apps/web/src/components/auth/RegisterDrawer.tsx`
- `apps/web/src/components/auth/RegisterForm.tsx`
- `apps/web/src/components/live/LiveRoomShell.tsx`
- `apps/web/src/components/lobby/LobbyPage.tsx`
- `apps/web/src/hooks/useServerHealth.ts`
- `apps/web/src/lib/useSession.ts`
- `apps/web/src/services/api/BaseApiService.ts`
- `apps/web/src/__tests__/live-games.test.ts`
- `apps/web/src/__tests__/payments.test.ts`
