# Step 07: Tests

**Task:** continue sequential implementation with Feature 04 admin session configuration
**Started:** 2026-07-08T00:33:44Z

---

## Test Analysis and Creation

Tests added:
- `apps/api/src/admin/__tests__/sessionConfig.test.ts`
  - Financial formula with integer XAF/bps.
  - Invalid capacity and invalid winner split rejection.
  - Invalid timing rejection.
  - Update schema requires reason and expected config version.
  - Session code generation.
- `apps/api/src/routes/__tests__/admin-sessions.test.ts`
  - Admin create draft and audit.
  - Player forbidden from admin routes.
  - Financial simulation uses confirmed registrations as temporary paid state.
  - Config update with OCC and audit.
  - Config version conflict.
  - Sensitive change blocked after confirmed registration.
  - Publish valid session and audit.
  - Reject invalid publish.
  - Open registration for published session.
  - Cancel session with reason and audit.
