# Step 07: Tests

**Task:** continue sequential implementation with Feature 05 session registration
**Started:** 2026-07-08T04:22:59Z

---

## Test Analysis and Creation

Tests added/updated:
- `apps/api/src/registrations/__tests__/sessionRegistration.test.ts`
  - Active/capacity status policy.
  - Serializable retry on `P2034`.
- `apps/api/src/routes/__tests__/registrations.test.ts`
  - Successful registration creates `PAYMENT_PENDING`, writes audit, schedules expiration.
  - Duplicate active registration is refused.
  - Full and closed sessions are refused.
  - Player can read only own active registration.
  - Pending cancellation works.
  - Cancelling another player's registration is forbidden.
  - Paid registration cannot be cancelled through pending cancel route.
- `apps/worker/src/__tests__/registrationExpiration.test.ts`
  - Expiration after deadline.
  - Paid/non-pending registration is ignored.
  - Future deadline is ignored.
- Updated public/admin route tests for new status names.
