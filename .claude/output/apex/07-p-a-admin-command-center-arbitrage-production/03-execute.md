# Step 03: Execute

**Branch:** `apex/p-a-admin`  
**Worktree:** `/home/afreeserv/worktrees/anonymous/p-a-admin`  
**Base:** `61d8622` (v0.1 / p-seq-03)

## Done

- Control lease (`admin-control-lease.ts`) Redis + memory fallback
- Party use-cases: fee/capacity/list/cancel/complete/version/audit timeline
- Admin read use-case + `adminService` Connect export (not mounted in routes.ts)
- REST: list, cancel, complete, lease, audit; lease on publish/confirm-start/round cmds
- Web ownership UI without hardcodes + lease panel
- Tests L1 lease, L3 concurrency, L4 AdminService, L5 RBAC
- Runbook `docs/05-workflows/admin-arbitrage-runbook.md`
- Atomic commit on `apex/p-a-admin`

## Gates run

- `pnpm --filter @session-jeu/api typecheck` ✓
- `pnpm --filter @session-jeu/web typecheck` ✓
- New admin tests 15/15 ✓
- preparation-routes.l4 + round.test ✓

## Handoff SEQ

Mount `adminService` in central `rpc/routes.ts` when integration allows:
`router.service(AdminV1.AdminService, adminService)`.
