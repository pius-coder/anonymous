# 02 - Plan: P-SEQ-01

## Decision

**Ratify all six candidate keys** (same family, best legacy evidence). No replacement.

`silent-vote` keeps key for wire stability but product title is **Le saboteur** with real hidden roles.

## Files to create

| Path | Purpose |
|------|---------|
| `docs/01-product/rulebooks/README.md` | Index, ratification table, freeze notice |
| `docs/01-product/rulebooks/fairness-matrix.md` | Common fairness + audience matrix |
| `docs/01-product/rulebooks/memory-sequence.md` | Solo rulebook APPROVED |
| `docs/01-product/rulebooks/pure-reaction-duel.md` | Duel rulebook APPROVED |
| `docs/01-product/rulebooks/trust-bridge.md` | Alliance rulebook APPROVED |
| `docs/01-product/rulebooks/team-relay.md` | Team rulebook APPROVED |
| `docs/01-product/rulebooks/danger-sweep.md` | Survival rulebook APPROVED |
| `docs/01-product/rulebooks/silent-vote.md` | Hidden-role rulebook APPROVED |
| `docs/03-architecture/decisions/0003-six-minigame-rulebook-freeze.md` | ADR freeze |
| `docs/02-ux/minigames/six-games-audience.md` | UX audience / info architecture pointer |

## Files to update

| Path | Change |
|------|--------|
| `docs/01-product/minigame-catalog.md` | Ratification section; close open decisions for six keys |
| `docs/05-workflows/minigame-integration.md` | Point to rulebooks as required input |
| `docs/README.md` | Index rulebooks + ADR |
| `docs/06-roadmap/risks-and-open-decisions.md` | Close six-key decision; list residual blockers for P-SEQ-02 |
| `docs/06-roadmap/apex-tasks/wave-b/B-MINIGAME-memory-sequence.md` | Link signed rulebook |

## Out of scope

- Code, proto, DB, runtime
- Full production plan tree import (ownership separate; rulebooks self-contained)
- Implicit key replacement after freeze

## Validation

- `scripts/worktree-run pnpm docs:check`
- Internal link scan
- Self adversarial review: no-leak + fairness
- Documentary atomic commit on `apex/p-seq-01`

## Open questions policy

Any unresolved product question is named with decideur and **blocks P-SEQ-02**. Prefer closing decisions in rulebooks rather than leaving open.
