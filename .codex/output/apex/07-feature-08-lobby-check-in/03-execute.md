# Step 03: Execute

**Task:** Feature 08 lobby check-in preparation
**Started:** 2026-07-08T05:35:40Z

---

## Implementation Log

- Added `WAITING_START` and `LIVE` session statuses, `CHECKED_IN`, `IN_ROOM`, and `NO_SHOW` registration statuses, timestamp fields, and `JoinToken` model plus migration.
- Added `apps/api/src/lobby/lobby.ts` and `presence.ts` for DB-backed lobby/check-in/start/token logic with optional Redis presence.
- Added public player routes in `apps/api/src/routes/lobby.ts` and admin start route in `apps/api/src/routes/admin/lobby.ts`.
- Mounted lobby routes in `apps/api/src/index.ts`.
- Added BullMQ scheduling module `apps/api/src/queues/checkInDeadline.ts` and scheduled the job when admin opens registration.
- Added worker processor `apps/worker/src/checkInDeadline.ts` and dispatch from the worker entrypoint.
- Updated registration active/capacity status rules to include checked-in and in-room registrations.
- Added `ioredis` to `@session-jeu/api`.
