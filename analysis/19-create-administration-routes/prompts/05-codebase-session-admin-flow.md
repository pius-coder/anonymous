# Agent 05: codebase session admin flow

Role: explore-codebase.

Task: Discover existing admin session management, creation, publication, start/cancel, lobby/live/result workflows, and tests.

Read and reference:
- `apps/web/src/app/admin/sessions/page.tsx`
- `apps/web/src/components/admin/ProgramBuilder.tsx`
- `apps/api/src/routes/admin/sessions.ts`
- `apps/api/src/routes/admin/lobby.ts`
- `apps/api/src/routes/admin/live.ts`
- `apps/api/src/routes/admin/results.ts`
- `apps/api/src/admin/sessionConfig.ts`
- related tests under `apps/api/src/routes/__tests__` and `apps/api/src/admin/__tests__`
- docs feature 04, 08, 09, 10, 12, and 13 where relevant.

Report only facts:
1. Existing session admin capabilities and line references.
2. Request/response shapes for session create/update/publish/start/cancel/result endpoints.
3. Current web session admin UI behavior.
4. Missing pieces indicated by 404 logs or docs.
5. Test coverage already present.

Write report target: `analysis/19-create-administration-routes/reports/05-codebase-session-admin-flow.md`.
