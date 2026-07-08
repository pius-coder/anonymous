# Plan

1. Add a typed release-readiness matrix in `@session-jeu/shared`.
2. Add tests that prove:
   - all installed production technologies are represented in the documentary gate,
   - all five final recette journeys are tracked,
   - controlled sandbox recette is allowed,
   - live launch remains blocked until external gates are approved.
3. Add `docs/recette/final-release-report.md` with versions, doc sources, test commands, E2E status, go/no-go decision, and unresolved external gates.
4. Harden local Redis compose baseline with append-only persistence for queue durability.
5. Run Prisma validation/generation, monorepo typecheck/lint/test/build, and Playwright E2E smoke.
