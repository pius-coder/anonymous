# Step 02: Plan

**Task:** continue sequential implementation with Feature 05 session registration
**Started:** 2026-07-08T04:22:59Z

---

## Planning Progress

Implementation plan:
1. Replace registration placeholder statuses with `CREATED`, `PAYMENT_PENDING`, `PAID`, `CANCELLED`, `REFUNDED`, `EXPIRED`.
2. Add deadline/cancel fields and a raw SQL migration with active-only uniqueness.
3. Update seed data and existing capacity/paid-lock logic to use `PAYMENT_PENDING` and `PAID`.
4. Add BullMQ expiration queue helper in the API.
5. Add registration business helpers for serializable transaction registration, active status policy, and serialization.
6. Add Hono routes:
   - `POST /v1/sessions/:id/register`
   - `GET /v1/sessions/:id/registration`
   - `POST /v1/registrations/:id/cancel`
7. Add worker processor for `registration.expire`.
8. Add unit, route, and worker tests, then run full validation.
