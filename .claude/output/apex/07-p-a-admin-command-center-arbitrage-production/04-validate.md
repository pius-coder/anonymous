# Step 04: Validate

## Checks

| Check | Result |
|-------|--------|
| typecheck api | pass |
| typecheck web | pass |
| lease + concurrency + AdminService L4 + RBAC L5 | 15/15 pass |
| preparation L4 + round routes | pass |
| no contracts/proto edits | confirmed |
| no schema migrations | confirmed |
| no routes.ts central mount | confirmed (export only) |
| atomic commit | `e39ce88` on `apex/p-a-admin` |

## AC

- [x] No auto-start party by timer/job (schedule/publish ≠ activate; worker close-only)
- [x] Multi-admin: lease + STALE_STATE
- [x] Refus with codes/messages
- [x] Player 403 on admin list
- [x] Ownership pages without hard-coded demo parties

## Residual risks

- AdminService not in production Connect router until SEQ mounts it
- Lease memory fallback if Redis down (multi-instance weaker)
- Six-manifest composition deferred to P-SEQ-06
- Finance/scores pages still out of ownership (may still have mocks)
