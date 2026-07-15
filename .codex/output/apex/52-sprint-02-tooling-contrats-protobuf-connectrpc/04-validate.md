# Step 04: Validate

**Task:** sprint 02 - tooling contrats Protobuf et ConnectRPC
**Started:** 2026-07-15T08:49:35Z

---

## Validation Progress

## Targeted Checks

- `pnpm --filter @session-jeu/contracts typecheck`: passed.
- `pnpm --filter @session-jeu/contracts lint`: passed.
- `pnpm --filter @session-jeu/contracts test`: passed, 3 files / 56 tests.

## Global Gates

- `pnpm docs:check`: passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm test`: passed.
- `pnpm build`: passed.

## Acceptance Criteria Check

- AC-02-01: `ReconnectLive` and stable public errors are present in realtime/common proto anchors and covered by realtime golden fixture.
- AC-02-02: endpoint gate remains documented; no generated ConnectRPC runtime was introduced.
- AC-02-03: `JoinLive` exists as a proto anchor and realtime golden fixture.
- AC-02-04: readonly snapshot contracts exist and audience no-leak tests remain green.
- AC-02-05: support/audit descriptor remains draft-level; no support route added before owner sprint.
- AC-02-06: payment proto package remains separate; no gameplay coupling added.
- AC-02-07: `LiveCommandRejected` exists in realtime proto and golden fixture.

## Step Complete

**Status:** Complete
**Typecheck:** passed
**Lint:** passed
**Tests:** passed
**Build:** passed
**Next:** step-07-tests.md, then adversarial review
