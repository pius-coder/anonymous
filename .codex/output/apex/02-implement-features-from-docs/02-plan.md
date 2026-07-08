# Step 02: Plan

**Task:** read required docs and implement features sequentially
**Started:** 2026-07-08T00:07:42Z

---

## Planning Progress

Feature selected: `02-authentification-compte`, because Feature 01 files were already present in the worktree and the sprint order lists Feature 02 next.

Decisions:

- Implement Feature 02 API scope first, matching `docs/plan/02-authentification-compte.md`: schema auth, register, login/logout, RBAC middleware, `/v1/me`, and password reset endpoints from the PRD contract.
- Use server-side database sessions with opaque random cookie tokens; store only SHA-256 token hashes in DB.
- Use `__Host-session` cookie with `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`.
- Use Node `crypto.scrypt` for password hashing to avoid adding a native dependency; OWASP prefers Argon2id first but accepts slow password hashing families including scrypt when configured and salted.
- Add `User.sessionVersion` so privilege/password-reset changes can invalidate old sessions.
- Keep auth UI out of this pass because Feature 02 plan defines API stories and says Next.js docs are required only if the web reads the session.

Implementation areas:

- Prisma schema/migration/seed
- API auth helpers and routes
- API unit/integration/security tests
- DB smoke tests for new Prisma models
