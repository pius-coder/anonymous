# APEX Task: 08-feature-09-live-realtime

**Created:** 2026-07-08T05:53:43Z
**Task:** Feature 09 live realtime session orchestration

---

## Configuration

| Flag | Value |
|------|-------|
| Auto mode (`-a`) | true |
| Examine mode (`-x`) | true |
| Save mode (`-s`) | true |
| Test mode (`-t`) | true |
| Economy mode (`-e`) | false |
| Branch mode (`-b`) | true |
| PR mode (`-pr`) | true |
| Interactive mode (`-i`) | false |
| Branch name | feature/09-live-realtime |

---

## User Request

```
apex -a -b -pr -s -t -x Feature 09 live realtime session orchestration
```

---

## Acceptance Criteria

- `POST /v1/live/sessions/:id/reservation` consumes a checked-in player's join token and returns a one-time live reservation token plus `game_session` WebSocket options.
- Colyseus `game_session` room consumes live reservations, loads DB-backed state, syncs only minimal player/phase/deadline state, and records connection status.
- Official round deadline is persisted in Postgres and scheduled in BullMQ for recovery.
- Player actions are accepted only during `ROUND_ACTIVE`, rejected after DB deadline, and deduplicated by nonce.
- Admin pause/resume endpoints persist and audit live state changes.
- Worker closes rounds from durable deadline jobs if the room process is unavailable.
- Mandatory validations pass: Prisma validate/generate, typecheck, lint, test, build.

---

## Progress

| Step | Status | Timestamp |
|------|--------|-----------|
| 00-init | ✓ Complete | 2026-07-08T06:19:49Z |
| 01-analyze | ✓ Complete | 2026-07-08T06:19:49Z |
| 02-plan | ✓ Complete | 2026-07-08T06:19:49Z |
| 03-execute | ✓ Complete | 2026-07-08T06:19:49Z |
| 04-validate | ✓ Complete | 2026-07-08T06:19:49Z |
| 05-examine | ✓ Complete | 2026-07-08T06:19:49Z |
| 06-resolve | ✓ Complete | 2026-07-08T06:19:49Z |
| 07-tests | ✓ Complete | 2026-07-08T06:19:49Z |
| 08-run-tests | ✓ Complete | 2026-07-08T06:19:49Z |
| 09-finish | ✓ Complete | 2026-07-08T06:19:49Z |
