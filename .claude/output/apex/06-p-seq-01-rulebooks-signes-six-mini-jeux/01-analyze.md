# 01 - Analyze: P-SEQ-01 Rulebooks signes des six mini-jeux

**Status:** complete  
**Mode:** economy (direct tools, no subagents)

## Environment

| Item | Value |
|------|-------|
| Worktree | `/home/afreeserv/worktrees/anonymous/p-seq-01` |
| Branch | `apex/p-seq-01` |
| Base | `05272bc` (Merge PR #35 P-SEQ-00) |
| origin/v0.1 | up to date with local v0.1 |
| Main checkout dirty | yes (unrelated WIP; worktree created via `git worktree add` after clean-check refused) |

## Prerequisites

- **P-SEQ-00 merged:** confirmed (`05272bc`).
- **Production task fiches:** present as untracked WIP on main checkout only; not in HEAD. Rulebooks will be self-contained under `docs/01-product/rulebooks/` so P-SEQ-02 is not blocked by missing production tree.
- **Catalog candidates:** six keys already listed as baseline in dirty main catalog and production gap analysis; clean HEAD catalog has the same six as RECETTE keys.

## Candidate keys (to ratify)

| Family | Key | Display title | Legacy proof |
|--------|-----|---------------|--------------|
| Solo | `memory-sequence` | Sequence memoire | runtime HEAD + RECETTE |
| Duel | `pure-reaction-duel` | Course au signal | runtime HEAD + RECETTE |
| Alliance | `trust-bridge` | Le pont fragile | catalogue tech + RECETTE |
| Team | `team-relay` | Relais de mini-defis | catalogue tech + RECETTE |
| Survival | `danger-sweep` | Le rayon balayeur | catalogue tech + RECETTE |
| Hidden role | `silent-vote` | Le saboteur | RECETTE only; **rules must not copy majority-vote legacy** |

## Key source docs (worktree)

- `docs/01-product/minigame-catalog.md`
- `docs/05-workflows/minigame-integration.md`
- `docs/01-product/scoring-and-publication.md`
- `docs/01-product/session-lifecycle.md`
- `docs/01-product/actors-and-permissions.md`
- `docs/02-ux/loading-error-reconnection.md`
- `docs/03-architecture/realtime-and-streaming.md`
- `docs/00-audit/head-forensic-audit.md`
- `docs/05-workflows/test-strategy.md` (L1/L3/L4/L5)

## Context7

- Library: Colyseus `/colyseus/docs`
- Findings: `allowReconnection(client, timeout)` in `onDrop`/`onLeave`; `onReconnect`; manual reject; consented leave vs drop; room continues clock while player disconnected.

## Gaps (what does NOT exist)

- No signed rulebooks under `docs/01-product/`
- No fairness/audience matrix
- No ADR freezing the six keys
- No executable command/error/transition tables per game
- Legacy runtimes deleted from tree (commit `2da3b3a` cleanup); cannot copy resolvers

## Forbidden (task)

- Do not treat legacy resolvers as final rules
- Do not accept client timestamp/position/score/victory as truth
- Do not ship silent-vote as plain majority vote without hidden roles

## Acceptance criteria (task)

1. Six rulebooks `APPROVED` + version + product owner
2. Traceable ratification per key/title
3. Every command/transition has server response + error
4. Audience matrix: player, partner/team, admin, observer, support
5. Latency/reconnect/room-crash/resume decidable
6. AC mapped to L1/L3/L4/L5
