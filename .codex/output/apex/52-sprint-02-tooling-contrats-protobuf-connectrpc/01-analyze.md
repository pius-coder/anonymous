# Step 01: Analyze

**Task:** sprint 02 - tooling contrats Protobuf et ConnectRPC
**Started:** 2026-07-15T08:49:35Z

---

## Context Discovery

## Mandatory Inspection

- `pwd`: `/home/afreeserv/anonymous`
- Branch: `v0.1`
- Worktree: dirty before sprint 02; changes from sprint 00/01 and pre-existing runtime/API/DB work remain present and must not be reverted.
- Root manifest: `package.json` exposes `docs:check`, `typecheck`, `lint`, `test`, `build` through pnpm/turbo.
- Contracts manifest: `packages/contracts/package.json` keeps `dependencies` empty and has only TypeScript/Vitest dev dependencies (`lines 14-19`).

## Docs Read

- `docs/06-roadmap/sprints/02-tooling-contrats-protobuf-connectrpc.md`
- `docs/03-architecture/protobuf-contract-strategy.md`
- `docs/03-architecture/realtime-and-streaming.md`
- `docs/03-architecture/uml/data-flow.md`
- `docs/03-architecture/uml/realtime-flow.md`
- `docs/03-architecture/uml/scoring-publication.md`
- `docs/04-layers/contracts.md`
- `docs/04-layers/transports.md`
- `docs/05-workflows/protobuf-change.md`
- `docs/05-workflows/test-strategy.md`
- `packages/contracts/ARCHITECTURE.md`

## Context7 Evidence

- `/connectrpc/connect-es`: Connect ES v2 uses Protobuf-ES v2 descriptors generated with `protoc-gen-es`; `protoc-gen-connect-es` is not part of the v2 generation model.
- `/protocolbuffers/protocolbuffers.github.io`: proto3 enum first value must be zero; official guidance uses `UNSPECIFIED`/`UNKNOWN` for the zero value, and deleted enum values/names should be reserved.

## Existing Contract Surface

- `packages/contracts/src/index.ts:12-25` exports the expected package roots: `common/v1`, `identity/v1`, `session/v1`, `participation/v1`, `preparation/v1`, `realtime/v1`, `round/v1`, `minigame/v1`, `scoring/v1`, `admin/v1`, `notification/v1`, `payment/v1`.
- Existing proto files are present under `packages/contracts/proto/*/v1/*.proto`, including common errors/shared types, identity, session, participation, preparation, realtime, round, minigame, scoring, admin, notification, and payment.
- Golden fixtures exist for common, session, scoring, preparation, admin, and realtime messages. `packages/contracts/src/__tests__/golden.test.ts` loads them and checks required top-level keys.
- Audience tests exist in `packages/contracts/src/__tests__/audience.test.ts`; they scan player-visible proto files for sensitive field names such as `password_hash`, `token_hash`, `internal_token`, `secret`, and `api_key`.
- Convention tests exist in `packages/contracts/src/__tests__/conventions.test.ts:31-80`; they verify proto discovery, proto3 syntax, package declarations, and `UNSPECIFIED = 0` as the first enum value.

## Gaps Found

- `docs/03-architecture/protobuf-contract-strategy.md:19-29` is stale: it lists only seven proto roots, includes `lobby/v1`, and omits several roots that already exist and are declared in `packages/contracts/src/index.ts`.
- `docs/03-architecture/protobuf-contract-strategy.md:3-5` references only `/connectrpc/connect-es`; it does not record the Protobuf Context7 source used for enum/reserved-field compatibility rules.
- `packages/contracts/src/__tests__/conventions.test.ts` does not yet enforce the sprint-02 rule that `@connectrpc/*` and `protoc-gen-connect-es` remain absent until generation/integration is explicitly added.

## Step Complete

**Status:** Complete
