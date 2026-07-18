# APEX Task: 07-p-a-admin-command-center-arbitrage-production

**Created:** 2026-07-17T09:32:58Z
**Task:** P-A-ADMIN - Command center et arbitrage production: remplacer shells admin par command center (creation/config partie, preparation, annonce, lancement manuel, supervision, pause/reprise, arbitrage, fin). Ownership Admin use-cases + UI /admin /admin/parties/** /admin/minigames. Interdit: contracts/DB, montage central, controle client joueur, demarrage auto timer, mutation finance, score publie sans commande, donnees hardcodees.

---

## Configuration

| Flag | Value |
|------|-------|
| Auto mode (`-a`) | true |
| Save mode (`-s`) | true |
| Economy mode (`-e`) | false (`-E` applied 2026-07-17) |
| Branch mode (`-b`) | true |
| Interactive mode (`-i`) | false |
| Branch name |  |

---

## User Request

```
/apex P-A-ADMIN -a -s -b -pr -x -t -e
```

---

## Acceptance Criteria

- [ ] AC1: aucune horloge/job ne lance une partie active
- [ ] AC2: deux admins concurrents n'ecrasent pas silencieusement une commande (lease + version)
- [ ] AC3: chaque action refusee explique precondition/permission sans fuite
- [ ] AC4: joueur/observer ne peuvent appeler une commande admin
- [ ] AC5: pages ownership sans donnees hardcodees (loading/empty/error/stale/reconnect)

## Blockers

- Principal checkout dirty → `pnpm worktree:create` refused (worktree convention obligatoire)
- Flags ignores: -pr -x -t (non definis dans skill APEX)

## Branch / worktree (target)

- task-id: `p-a-admin`
- branch: `apex/p-a-admin`
- path: `/home/afreeserv/worktrees/anonymous/p-a-admin`

---

## Progress

| Step | Status | Timestamp |
|------|--------|-----------|
| 00-init | ⏸ Pending | |
| 01-analyze | ✓ Complete | 2026-07-17T09:43:41Z |
| 02-plan | ✓ Complete | 2026-07-17T09:47:22Z |
| 03-execute | ✓ Complete | 2026-07-17T10:29:06Z |
| 04-validate | ✓ Complete | 2026-07-17T10:31:02Z |
