# Step 02: Plan

**Task:** Feature 14 notifications WhatsApp
**Started:** 2026-07-08T11:12:46Z

---

## Planning Progress

- Add Prisma enums/models and migration for notification preferences, templates, jobs, delivery logs, consent records, and outbound messages.
- Add a notification service module for preferences, in-app listing, idempotent enqueue, send processing, WhatsApp webhook logging, and private-safe share messages.
- Add Hono routes:
  - `GET/PATCH /v1/me/notification-preferences`
  - `GET /v1/me/notifications`
  - `POST /v1/admin/notifications/session/:id/share`
  - `POST /internal/notifications/send`
  - `POST /v1/webhooks/whatsapp`
- Add BullMQ reminder scheduling with stable `jobId`.
- Add worker processing for `notification.send`, including cancelled-session skip and WhatsApp opt-in/gateway-down handling.
- Wire best-effort notifications into registration, payment, check-in, and results workflows.
- Add a web notifications page and gateway placeholder status helpers.
- Add unit/integration tests for message privacy, preferences/in-app notifications, reminder dedupe, opt-in, non-blocking WhatsApp failure, webhook handling, and cancelled session reminders.
