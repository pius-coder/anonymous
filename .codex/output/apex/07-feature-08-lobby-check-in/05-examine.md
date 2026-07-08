# Step 05: Examine

**Task:** Feature 08 lobby check-in preparation
**Started:** 2026-07-08T05:35:40Z

---

## Adversarial Review

- Verified DB remains source of truth for `CHECKED_IN` and `NO_SHOW`; Redis presence failures are caught and do not block lobby access.
- Verified check-in is idempotent and rejects non-paid, cancelled, and late players.
- Verified join tokens are hashed at rest, expire, and can be consumed only once.
- Verified admin start does not use volatile presence and requires checked-in players to meet `minPlayers`.
- Residual integration point: game-server consumption endpoint is intentionally not wired in this feature; service-level `consumeJoinToken` exists for Feature 09.
