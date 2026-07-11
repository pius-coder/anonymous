# Step 07: Tests

**Task:** review and fix payment status, phone validation, realtime refresh, server ping, and game UI organization
**Started:** 2026-07-11T00:48:52Z

---

## Test Analysis and Creation

### Added/Updated Coverage

- API auth validation tests:
  - blank optional phone is omitted;
  - blank optional name is omitted;
  - valid phone is trimmed;
  - short non-empty phone is rejected.
- API payment route test:
  - Fapshi provider unavailability returns structured `502 PROVIDER_UNAVAILABLE`.
- Web live source test:
  - lobby refresh interval exists;
  - server health hook is used;
  - health state is passed to the live shell.
- Web payment source tests:
  - payment unavailable state handles `INITIATE_FAILED`;
  - countdown uses persisted `createdAt`;
  - API client preserves backend error codes.
