# APEX Task: 07-feature-08-lobby-check-in

**Created:** 2026-07-08T05:35:40Z
**Task:** Feature 08 lobby check-in preparation

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
| Branch name | feature/08-lobby-check-in |

---

## User Request

```
apex -a -b -pr -s -t -x Feature 08 lobby check-in preparation
```

---

## Acceptance Criteria

- Lobby endpoint is available only to PAID/CHECKED_IN/IN_ROOM players and returns session rules, countdown/deadline, paid counts, checked-in counts, and volatile presence count when Redis is available.
- Check-in is idempotent before the deadline, persists `CHECKED_IN` in Postgres, and audits `player.checked-in`.
- Admin start authorization requires enough checked-in players, persists LIVE status, and audits the decision.
- Join token endpoint issues short-lived single-use tokens bound to registration; token consumption is covered by service tests for game-server integration.
- Check-in deadline job marks unpaid-but-registered PAID players as `NO_SHOW`.
- Mandatory validations pass: Prisma validate/generate, typecheck, lint, test, build.

---

## Progress

| Step | Status | Timestamp |
|------|--------|-----------|
| 00-init | ✓ Complete | 2026-07-08T05:51:51Z |
| 01-analyze | ✓ Complete | 2026-07-08T05:51:51Z |
| 02-plan | ✓ Complete | 2026-07-08T05:51:51Z |
| 03-execute | ✓ Complete | 2026-07-08T05:51:51Z |
| 04-validate | ✓ Complete | 2026-07-08T05:51:51Z |
| 05-examine | ✓ Complete | 2026-07-08T05:51:51Z |
| 06-resolve | ✓ Complete | 2026-07-08T05:51:51Z |
| 07-tests | ✓ Complete | 2026-07-08T05:51:51Z |
| 08-run-tests | ✓ Complete | 2026-07-08T05:51:51Z |
| 09-finish | ✓ Complete | 2026-07-08T05:51:51Z |
