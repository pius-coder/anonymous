# APEX Task: 04-a-realtime-round-sync-reconnect

**Created:** 2026-07-16T14:12:21Z
**Task:** A-REALTIME - Sync round, reconnexion et snapshots. Chemin realtime reel et autoritaire: config serveur reconnect/max clients, room round/status/deadline, persistence inputs, refus nonce/tardif/role/stale, reconnexion, snapshots audience, tests L3/L4/L5 Colyseus.

---

## Configuration

| Flag | Value |
|------|-------|
| Auto mode (`-a`) | true |
| Save mode (`-s`) | true |
| Economy mode (`-e`) | false (disabled by user `-E`) |
| Branch mode (`-b`) | true |
| Interactive mode (`-i`) | true |
| Test mode (`-t`) | true |
| Examine mode (`-x`) | true |
| PR mode (`-pr`) | true |
| Branch name | apex/a-realtime |
| Worktree | /home/afreeserv/worktrees/anonymous/a-realtime |
| Base commit | 00f0694 |

---

## User Request

```
/apex -a -s -e -b -i -t -x -pr A-REALTIME round sync reconnect
# then user: -E (disable economy)
```

---

## Acceptance Criteria

- [ ] AC1: Timeout reconnect et max clients viennent de config serveur, pas des options client
- [ ] AC2: Room charge round/status/deadline depuis source serveur et persiste les inputs acceptes
- [ ] AC3: Nonce duplique, input tardif, role interdit et sequence stale refuses/idempotents
- [ ] AC4: Reconnexion restaure etat autorise dans fenetre et refuse apres expiration
- [ ] AC5: Snapshots joueur/admin/readonly respectent audience et sont consommables sur transport
- [ ] AC6: Test live echoue si Colyseus indisponible; apercu local explicitement hors E2E
- [ ] AC7: Tests L3 persistence, L4 @colyseus/testing, L5 navigateur room reelle

---

## Progress

| Step | Status | Timestamp |
|------|--------|-----------|
| 00-init | ✅ Complete | 2026-07-16T14:12:21Z |
| 01-analyze | ⏳ In Progress | 2026-07-16T14:16:31Z |
| 02-plan | ⏸ Pending | |
| 03-execute | ⏸ Pending | |
| 04-validate | ⏸ Pending | |

---

## Ownership

- Allowed: `apps/game-server/**`, RealtimeAccess impl, web `/room` facade/components, live tests
- Forbidden: contracts, Prisma/migrations/seed, root tooling, central router, `rpcServices.ts`, observer/admin scoring UI, workers
- Observer routes: B-OBSERVER; scoring/minigame: out of scope
