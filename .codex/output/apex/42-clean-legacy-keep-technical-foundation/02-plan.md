# Step 02: Plan

**Task:** Nettoyer le legacy sur v0.1 en conservant uniquement le socle technique buildable et la documentation d architecture
**Started:** 2026-07-14T10:09:22Z

---

## Planning Progress

_Implementation plan will be written here..._

## Implementation Plan

1. Remove legacy business source folders while preserving workspace/package/config files.
2. Replace each app/package with a neutral foundation entrypoint and a minimal test.
3. Replace Prisma schema and seed with a minimal toolchain-only foundation.
4. Remove fragmented legacy docs and keep only the rebuilt v0.1 documentation.
5. Remove previous APEX/Claude work logs outside this current cleanup task.
6. Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`.
7. Remove generated build artifacts from the final working tree after validation.

## Acceptance Mapping

- Clean legacy: source and docs legacy removed.
- Keep technical foundation: manifests, package configs, workspace shape, toolchain and neutral entrypoints preserved.
- No business implementation: only foundation markers and tests remain.
- Validate: full pnpm checks pass.

## Step Complete

Status: complete.
