# APEX Task: 01-seq-00-socle-integration-ci

**Created:** 2026-07-16T11:42:42Z
**Task:** SEQ-00 - Installer le socle d'integration et CI

---

## Configuration

| Flag | Value |
|------|-------|
| Auto mode (`-a`) | true |
| Save mode (`-s`) | true |
| Economy mode (`-e`) | false |
| Branch mode (`-b`) | true |
| Interactive mode (`-i`) | false |
| Branch name | v0.1 |

---

## User Request

```
/apex -a -b -s -x -t # SEQ-00 - Installer le socle d'integration et CI
```

---

## Acceptance Criteria

- [x] Root scripts `test:unit`, `test:integration`, `test:e2e`, `test:all` are distinct
- [x] Disposable PG/Redis per WORKTREE_ID with teardown after failure
- [x] Unique API/game-server/web/worker ports per WORKTREE_ID
- [x] Playwright `webServer[]` starts API, game-server, web
- [x] Harness L3 PG, L4 Connect/Hono, L4 Colyseus, L5 live smoke (fails without Colyseus)
- [x] CI frozen install → generate → empty DB → unit → integration → e2e → quality
- [x] Docs: commands, timeouts, artifacts, diagnostics; no secrets in logs
- [x] Validation gates green on this host (local backend)

---

## Progress

| Step | Status | Timestamp |
|------|--------|-----------|
| 00-init | ⏸ Pending | |
| 01-analyze | ✓ Complete | 2026-07-16T11:50:33Z |
| 02-plan | ✓ Complete | 2026-07-16T11:50:56Z |
| 03-execute | ✓ Complete | 2026-07-16T12:20:26Z |
| 04-validate | ✓ Complete | 2026-07-16T12:20:26Z |
