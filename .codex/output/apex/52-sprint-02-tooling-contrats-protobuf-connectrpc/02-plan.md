# Step 02: Plan

**Task:** sprint 02 - tooling contrats Protobuf et ConnectRPC
**Started:** 2026-07-15T08:49:35Z

---

## Planning Progress

## Implementation Plan

### Overview

Sprint 02 already has the proto package, golden fixtures, and basic convention tests. The remaining work is to align the architecture strategy document with the actual contract roots and add a test guard for the Connect ES v2 tooling rule.

### File Changes

#### `docs/03-architecture/protobuf-contract-strategy.md`

- Add `/protocolbuffers/protocolbuffers.github.io` to the Context7 source list.
- Replace the stale organisation block at `lines 19-29` with the twelve package roots exported by `packages/contracts/src/index.ts:12-25`.
- Keep the Hono/ConnectRPC exception and Connect ES v2 `protoc-gen-es` rule unchanged.

#### `packages/contracts/src/__tests__/conventions.test.ts`

- Extend imports to read root/package manifests and scan text files.
- Add a conventions test that asserts no `@connectrpc/*` dependency is installed in root or contracts manifests.
- Add a conventions test that asserts `protoc-gen-connect-es` is not present in package manifests or lockfile text.
- Keep existing proto3/package/enum tests unchanged.

### Testing Strategy

- Run `pnpm --filter @session-jeu/contracts test` for the new guard.
- Run `pnpm --filter @session-jeu/contracts typecheck` and `pnpm --filter @session-jeu/contracts lint`.
- Run global gates required by the sprint plan: `pnpm docs:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.

### Acceptance Criteria Mapping

- AC-02-01, AC-02-03, AC-02-04, AC-02-07: covered by existing realtime proto and golden/audience tests, plus convention guard.
- AC-02-02: covered by documented endpoint gate and absence of generated ConnectRPC integration.
- AC-02-05: support/audit remains bounded as documented; no route added in this sprint.
- AC-02-06: payment package remains separate and no ConnectRPC dependency is installed.

### Risks

- Proto syntax lint/generation is still future work because sprint 02 explicitly defers generation.
- Several proto messages are draft-level anchors for later sprints and must not be treated as final implementation contracts until their owner sprint validates them.

## Step Complete

**Status:** Complete
