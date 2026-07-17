# 04 - Validate

## Checks

| Check | Result |
|-------|--------|
| `pnpm docs:check` | PASS |
| Six rulebooks `APPROVED` v1.0.0 + owner | PASS |
| Ratification `DEC-P-SEQ-01-RATIFY` traced | PASS |
| Commands/transitions/errors defined | PASS (per rulebook) |
| Audience matrix player/partner/admin/observer/support | PASS (`fairness-matrix.md`) |
| Latency/reconnect/crash/resume decidable | PASS (matrix + per game) |
| AC → L1/L3/L4/L5 | PASS (section 16 each) |
| No code/proto/DB | PASS |
| Atomic commit | `ac31f75` on `apex/p-seq-01` |

## Adversarial self-review (no-leak / fairness)

| Threat | Mitigation in docs |
|--------|-------------------|
| Client `clickedAtMs` | pure-reaction-duel rejects/ignores; server receive only |
| Client position as truth | danger-sweep `move_intent` only |
| silent-vote majority without roles | redesigned with VILLAGER/SABOTEUR camps |
| Role leak observer/admin/support | audience matrix + support exception procedure |
| Reconnect re-deal roles/sequence/signal | forbidden explicitly |
| Odd alliance / mutual team | trust-bridge UNPAIRED; team-relay mutual invite + incomplete |
| RTT compensation hidden | explicitly false v1 |

## Residual / non-blocking for P-SEQ-02

- Gain formulas financières exactes → finance / scoring lots
- Production WAVE-B fiches (`P-B-*`) not in git HEAD yet (untracked on main WIP); rulebooks are self-contained
- Numeric configs are versioned defaults, not wire freezes

## Open questions blocking P-SEQ-02

**None.**

## Commit

- Branch: `apex/p-seq-01`
- Base: `05272bc` (P-SEQ-00)
- HEAD: `ac31f75`
- Worktree: `/home/afreeserv/worktrees/anonymous/p-seq-01`
- Not pushed (integrator request required)
