# Step 07: Tests

**Task:** sprint 02 - tooling contrats Protobuf et ConnectRPC
**Started:** 2026-07-15T08:49:35Z

---

## Test Analysis and Creation

## Existing Test Infrastructure

- Framework: Vitest in `packages/contracts`.
- Command: `pnpm --filter @session-jeu/contracts test`.
- Existing pattern: file-system based assertions in `packages/contracts/src/__tests__/conventions.test.ts`, `golden.test.ts`, and `audience.test.ts`.

## Tests Added

- Updated `packages/contracts/src/__tests__/conventions.test.ts`.
- Added guard that no `@connectrpc/*` packages are installed in root/contracts manifests before generation is wired.
- Added guard that `protoc-gen-connect-es` is absent from root/contracts manifests and `pnpm-lock.yaml`.

## Acceptance Criteria Mapping

- Sprint rule "`@connectrpc/*` reste non installe" is now executable.
- Sprint rule "ne pas utiliser `protoc-gen-connect-es`" is now executable.
- Existing enum/proto3/package/golden/audience tests continue to cover the contract foundation.

## Step Complete

**Status:** Complete
**Tests created:** 2 assertions in existing convention test file
**Next:** step-08-run-tests.md
