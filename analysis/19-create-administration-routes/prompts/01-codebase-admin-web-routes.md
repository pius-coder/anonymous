# Agent 01: codebase admin web routes

Role: explore-codebase.

Task: Find what currently exists for the web administration area and why the dev server reports 404s for `/admin/live`, `/admin/payments`, `/admin/wallets`, `/admin/users`, `/admin/minigames`, `/admin/audit`, and `/admin/sessions/new`.

Read and reference:
- `apps/web/src/app/admin/**`
- `apps/web/src/components/admin/**`
- `apps/web/src/lib/**`
- relevant tests under `apps/web/src/__tests__` and `apps/web/e2e`
- any local docs under `docs/plan/` and `docs/prd/features/` that mention admin UI.

Report only facts:
1. Existing files with paths and line numbers.
2. Existing admin route structure and layout conventions.
3. Existing data-fetching/client API patterns used by admin pages.
4. Missing admin pages/routes visible from existing navigation or logs.
5. Relevant UI component conventions.

Write report target: `analysis/19-create-administration-routes/reports/01-codebase-admin-web-routes.md`.
