# APEX Task: 56-p-a-notifications-outbox-et-provider-reel

**Created:** 2026-07-18T03:32:47Z
**Task:** P-A-NOTIFICATIONS - Outbox et provider reel

---

## Configuration

| Flag | Value |
|------|-------|
| Auto mode (`-a`) | true |
| Examine mode (`-x`) | false |
| Save mode (`-s`) | true |
| Test mode (`-t`) | true |
| Economy mode (`-e`) | false |
| Branch mode (`-b`) | true |
| PR mode (`-pr`) | true |
| Interactive mode (`-i`) | false |
| Branch name | v0.1 |

---

## User Request

```
-a -s -t -b -pr # P-A-NOTIFICATIONS - Outbox et provider reel
```

---

## Acceptance Criteria

- [ ] AC1: Outbox pattern — NotificationJob created in business transaction + enqueued idempotently to BullMQ
- [ ] AC2: Real provider — `@great-detail/whatsapp` integrated as `ProductionWhatsAppProvider` with sandbox/live
- [ ] AC3: Templates — versioned template storage with language support and rendering
- [ ] AC4: Consent — opt-out applied before delivery, RBAC support
- [ ] AC5: Retries/DLQ — transient errors retry (exponential backoff), permanent errors go to DLQ
- [ ] AC6: Crash safety — crash before/after send produces no undetected duplicates
- [ ] AC7: Scheduler — periodic scan for pending/abandoned delivery jobs
- [ ] AC8: Metriques — queue age, retry, failure metrics; runbooks provider/secret

---

## Progress

| Step | Status | Timestamp |
|------|--------|-----------|
| 00-init | ✓ Complete | 2026-07-18T03:33:12Z |
| 01-analyze | ✓ Complete | 2026-07-18T04:00:36Z |
| 02-plan | ✓ Complete | 2026-07-18T04:06:48Z |
| 03-execute | ⏳ In Progress | 2026-07-18T04:08:33Z |
| 04-validate | ⏸ Pending | |
| 05-examine | ⏭ Skip | |
| 06-resolve | ⏭ Skip | |
| 07-tests | ⏸ Pending | |
| 08-run-tests | ⏸ Pending | |
| 09-finish | ⏸ Pending | |
