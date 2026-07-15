# Step 02: Plan

**Task:** batch sprints 04-09 - auth acquisition participation finance preparation realtime
**Started:** 2026-07-15T09:11:25Z

---

## Planning Progress

1. Keep existing sprint 04 auth/RBAC design because it already matches the documented opaque-cookie server
   guard approach.
2. Close the sprint 05/06 draft registration gap by rejecting `DRAFT` in `registerForParty`.
3. Add a shared opaque-token hash primitive, persist only live token hashes, and make the game-server
   authenticate by hashing the presented token before DB lookup.
4. Rename Prisma `RealtimeConnection.accessToken` to `tokenHash` via migration and regenerate Prisma.
5. Move wallet debit and provider webhook settlement into Prisma serializable transactions.
6. Require `overrideReason` when locking preparation with `REGISTERED` or `PAID` absents.
7. Add focused tests for token hash, finance idempotency/atomicity, draft registration rejection, and
   absent confirmation.
8. Run targeted package validations, DB empty-schema validation, then global docs/typecheck/lint/test/build.
