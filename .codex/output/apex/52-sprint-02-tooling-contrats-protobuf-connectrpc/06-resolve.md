# Step 06: Resolve

**Task:** sprint 02 - tooling contrats Protobuf et ConnectRPC
**Started:** 2026-07-15T08:49:35Z

---

## Resolution Log

## Fixes Applied

- F1: Expanded ConnectRPC dependency/generator guards to scan root plus every `apps/*` and `packages/*` workspace manifest.
- F2: Replaced the permissive enum line scanner with enum-block extraction and strict first-value matching for `*_UNSPECIFIED = 0`.
- F3: Extended the endpoint gate with server input validation, server auth/RBAC for protected/sensitive actions, audit/security logs, denial tests, and rate-limit guidance.
- F4: Changed deprecated-generator assertions to compare a boolean with filename-scoped messages instead of asserting against raw file content.
- F5: Switched proto test names to relative paths, removed the misleading `package` field, and added root alignment with `getContractsFoundation()`.
- F6: Renamed the transport section to future target transport and made the documented Hono JSON adapter exception explicit.
- F7: Tightened proto3 syntax validation from substring matching to an anchored syntax declaration.

## Validation After Fixes

- `pnpm --filter @session-jeu/contracts typecheck`: passed after correcting NodeNext import extension to `../index.js`.
- `pnpm --filter @session-jeu/contracts lint`: passed.
- `pnpm --filter @session-jeu/contracts test`: passed, 3 files / 57 tests.
- `pnpm docs:check`: passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm test`: passed.
- `pnpm build`: passed.

## Step Complete

**Status:** Complete
**Findings fixed:** 7
**Findings skipped:** 0
**Validation:** Passed
