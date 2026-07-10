# Agent 09: docs Turborepo dev recursion

Role: explore-docs.

Task: Fetch current official/library docs for Turborepo dev tasks and the `recursive_turbo_invocations` error in the user log.

Use Context7 exactly:
1. `npx ctx7@latest library Turborepo "recursive_turbo_invocations turbo run dev root task package workspace scripts"`
2. Pick the best official `/org/project` match.
3. `npx ctx7@latest docs <libraryId> "recursive_turbo_invocations turbo run dev root task package workspace scripts"`

Report only documented facts:
1. Library ID used.
2. What causes recursive turbo invocations.
3. Current documented configuration guidance.
4. Any repo-relevant gotchas.

Write report target: `analysis/19-create-administration-routes/reports/09-docs-turborepo-dev.md`.
