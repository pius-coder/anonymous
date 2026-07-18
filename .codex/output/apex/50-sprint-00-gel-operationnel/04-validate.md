# Step 04: Validate

**Task:** sprint 00 - gel operationnel
**Started:** 2026-07-15T08:27:06Z

---

## Validation Progress

_Validation results will be appended here..._

## Commands

### Standard sprint 00 commands

- `pnpm docs:check` -> passed.
- `pnpm typecheck` -> passed.
- `pnpm lint` -> passed.
- `pnpm test` -> passed.
- `pnpm build` -> passed.

### Cache-bypass verification

- `pnpm typecheck --force` -> passed via Turbo cache bypass.
- `pnpm lint --force` -> passed via Turbo cache bypass.
- `pnpm test --force` -> failed because pnpm treated `--force` as a pnpm/test option, not a Turbo option.
- `pnpm run test -- --force` -> failed because Vitest received unsupported `--force`.
- `pnpm exec turbo run test --force` -> passed via Turbo cache bypass.
- `pnpm exec turbo run build --force` -> passed via Turbo cache bypass.

### Acceptance Criteria

- AC-00-01: Launch/publication guardrails documented by canonical lifecycle and state-machine forbidden transitions.
- AC-00-02: Publication without verification remains forbidden by `ROUND_RESOLVING -> RESULTS_PUBLISHED` block.
- AC-00-03: Live access remains bound to participation in docs and sprint 09 exception notes.
- AC-00-04: Observer readonly remains documented; no runtime command added in sprint 00.
- AC-00-05: Support readonly remains documented; no admin/player control added.
- AC-00-06: Timer cannot start `ACTIVE_ROUND`; lifecycle and sprint docs use canonical wording.

### Residual Risks

- The worktree remains intentionally dirty because pre-existing sprint 05-07 and sprint 09 changes were not reverted.
- Sprint 09 implementation risks remain documented for later sprint review: live token persistence, reconnect deadline, state-view filtering, and Hono JSON transitory adapter.
- Several untracked future sprint files 10-19 remain outside the requested sprint 00-09 implementation window.

---
## Step Complete
**Status:** ✓ Complete
**Typecheck:** ✓
**Lint:** ✓
**Tests:** ✓
**Build:** ✓
**Docs:** ✓
**Next:** step-07-tests.md
**Timestamp:** 2026-07-15T09:42:00Z
