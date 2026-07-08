# APEX Task: 09-feature-10-game-engine-resolution

**Created:** 2026-07-08T06:21:56Z
**Task:** Feature 10 game engine and round resolution

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
| Branch name | feature/10-game-engine-resolution |

---

## User Request

```
apex -a -b -pr -s -t -x Feature 10 game engine and round resolution
```

---

## Acceptance Criteria

- Game-engine exposes pure deterministic resolver interfaces, ranking helpers, and replay-stable hashing.
- MVP solo and duel score resolvers handle tie-breaks, missing inputs, winners count, and evidence.
- Round finalization loads official accepted actions, calls game-engine, persists `RoundResult`, outcomes, resolution log, and events in a Serializable transaction.
- Double finalization is idempotent; non-closed rounds are refused.
- Internal replay recomputes the resolver output from stored input snapshot and reports hash match/mismatch.
- Mandatory validations pass: Prisma validate/generate, typecheck, lint, test, build.

---

## Progress

| Step | Status | Timestamp |
|------|--------|-----------|
| 00-init | ✓ Complete | 2026-07-08T06:30:55Z |
| 01-analyze | ✓ Complete | 2026-07-08T06:30:55Z |
| 02-plan | ✓ Complete | 2026-07-08T06:30:55Z |
| 03-execute | ✓ Complete | 2026-07-08T06:30:55Z |
| 04-validate | ✓ Complete | 2026-07-08T06:30:55Z |
| 05-examine | ✓ Complete | 2026-07-08T06:30:55Z |
| 06-resolve | ✓ Complete | 2026-07-08T06:30:55Z |
| 07-tests | ✓ Complete | 2026-07-08T06:30:55Z |
| 08-run-tests | ✓ Complete | 2026-07-08T06:30:55Z |
| 09-finish | ✓ Complete | 2026-07-08T06:30:55Z |
