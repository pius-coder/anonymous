# Step 01: Analyze

**Task:** review and fix payment status, phone validation, realtime refresh, server ping, and game UI organization
**Started:** 2026-07-11T00:48:52Z

---

## Context Discovery

_Findings will be appended here as exploration progresses..._

## Local Documents Read

- `docs/plan/02-authentification-compte.md` and `docs/prd/features/02-authentification-compte.md`: player account creation, phone/email uniqueness, secure session requirements.
- `docs/plan/05-inscription-session.md` and `docs/prd/features/05-inscription-session.md`: registration status workflow, idempotency, pending payment.
- `docs/plan/06-paiement-fapshi.md` and `docs/prd/features/06-paiement-fapshi.md`: Fapshi hosted checkout, webhook-first, provider unavailable, status endpoint, idempotency.
- `docs/plan/08-lobby-check-in.md` and `docs/prd/features/08-lobby-check-in.md`: paid-only lobby, check-in, presence and DB truth.
- `docs/plan/09-session-live-temps-reel.md` and `docs/prd/features/09-session-live-temps-reel.md`: Colyseus room sync, reconnection and live health.
- `docs/plan/04-configuration-sessions-admin.md`, `docs/prd/features/04-configuration-sessions-admin.md`, `docs/plan/13-dashboard-admin-audit-support.md`, `docs/prd/features/13-dashboard-admin-audit-support.md`: admin operations and audit context.
- Source docs: `docs/BRAINSTORMING.md`, `docs/PRD_PHASE_1.md`, `docs/PRD_PHASE_2.md`, `docs/cahier_des_charges_technique_plateforme_sessions_jeu.md`, `docs/deep-research-report.md`, `docs/catalogue-mini-jeux.md`, `docs/analysis-live-connection-flow.md`.

## External Documentation Checked

- Context7 `/vercel/next.js/v16.2.9`: client form validation/error display and responsive UI guidance.
- Context7 `/websites/hono_dev`: explicit JSON status responses and custom error handling.
- Context7 `/prisma/web`: unique constraints, interactive transactions, Serializable conflict retry patterns.
- Context7 `/colyseus/docs`: client room lifecycle, `onStateChange`, reconnection options.
- Fapshi official `https://docs.fapshi.com/llms.txt` and OpenAPI: `apiuser`/`apikey`, sandbox/live base URLs, `initiate-pay`, `payment-status/{transId}`, `x-wh-secret`, statuses `CREATED/PENDING/SUCCESSFUL/FAILED/EXPIRED`, polling max 6/min/transId.

## Codebase Findings

- Phone validation:
  - `apps/api/src/auth/validation.ts` has `phone: z.string().trim().min(6).max(32).optional()`, so empty strings fail despite the UI label saying optional.
  - `apps/web/src/components/auth/RegisterForm.tsx` initializes `phone: ""` and submits the whole object, sending an empty phone.
  - `apps/web/src/lib/useSession.ts` posts the input unchanged to `/auth/register`.
  - Tests exist for register validation, but no optional empty phone regression.
- Payment:
  - `apps/api/src/payments/fapshi.ts` marks failed provider initiation as `FAILED` with `providerStatus: "INITIATE_FAILED"` and returns `provider-unavailable`.
  - `apps/api/src/routes/payments.ts` maps that to `502 PROVIDER_UNAVAILABLE`.
  - `apps/web/src/services/api/BaseApiService.ts` currently throws `HTTP_ERROR` for non-2xx responses and loses API error codes/details.
  - `apps/web/src/components/auth/RegisterDrawer.tsx` calls Fapshi initiate and redirects to checkout URL when present; fallback route goes to status page.
  - `apps/web/src/app/(arena)/payments/[id]/status/page.tsx` polls every 3s and shows a synthetic 24h deadline from page load, not from payment data.
- Realtime/lobby:
  - `apps/api/src/routes/health.ts` exposes `/health` with `status`, `timestamp`, `uptime`.
  - `apps/web/src/components/lobby/LobbyPage.tsx` loads lobby data on mount and after local check-in only. Other users checking in will not refresh this client.
  - `apps/web/src/components/live/LiveRoomShell.tsx` shows Colyseus status but no API/server ping indicator.
  - `apps/web/src/hooks/useGameRoom.ts` already uses Colyseus schema `onStateChange`, room messages and reconnect; no SSE exists.
- UI:
  - `apps/web/src/components/live/LiveRoomShell.tsx` is fullscreen and panel-based, but side panels can be dense. Existing tests enforce `LiveRoomShell` in lobby/live and panel exclusivity.
  - `apps/web/src/components/auth/RegisterDrawer.tsx` was inspected because it is modified in the working tree; the latest file no longer contains the duplicated `<Button` seen in an earlier snippet.

## Acceptance Criteria

- Empty optional phone input must not show a min-length error.
- Meaningful phone values must still be trimmed and length validated.
- Payment provider unavailable must stay a structured `PROVIDER_UNAVAILABLE` error through server-side services and client UI.
- Payment status page must avoid misleading timing, continue sensible polling, and surface retry guidance.
- Lobby must refresh automatically so another player's join/check-in becomes visible without a manual reload.
- UI must display real-time API/server health/ping in lobby/live.
- Changes must preserve Colyseus as the live sync path and avoid changing payment truth/idempotency semantics.

---

## Step Complete

**Status:** ✓ Complete
**Next:** step-02-plan.md
