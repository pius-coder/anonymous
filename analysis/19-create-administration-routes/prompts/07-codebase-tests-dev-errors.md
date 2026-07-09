# Agent 07: codebase tests and dev errors

Role: explore-codebase.

Task: Analyze test scripts, dev scripts, known failing routes, and the Turborepo recursive invocation/persisting errors shown in the user log.

Read and reference:
- root `package.json`
- `turbo.json`
- package `package.json` files under `apps/*` and `packages/*`
- `apps/web/next.config.ts`
- `apps/web/playwright.config.ts`
- `apps/web/test-results/**` and `apps/web/playwright-report/**` if relevant
- docs plan files that define mandatory validations.

Report only facts:
1. Script definitions and package manager versions.
2. Turbo task definitions and whether root-task recursion risk is visible.
3. Existing test setup for web/api and admin coverage.
4. Evidence related to Next/Turbopack cache persistence failures.
5. Validation commands required by docs and scripts.

Write report target: `analysis/19-create-administration-routes/reports/07-codebase-tests-dev-errors.md`.
