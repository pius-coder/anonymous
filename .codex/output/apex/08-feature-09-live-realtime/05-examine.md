# Step 05: Examine

**Task:** Feature 09 live realtime session orchestration
**Started:** 2026-07-08T05:53:43Z

---

## Adversarial Review

- API does not trust Colyseus for payment/check-in; reservation requires a valid short join token tied to the authenticated user/session.
- Live reservation tokens are hashed at rest and consumed once by the room.
- Room state excludes answers/payloads and exposes only player display/connection/submission, phase, round id, and deadline timestamp.
- Official deadlines are in Postgres; Colyseus clock is only the perceived timer.
- Player actions are stored with `@@unique([roundId, userId, actionNonce])` for replay prevention.
- Admin pause/resume creates audit entries with reason for pause.
