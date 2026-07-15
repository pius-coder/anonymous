# Step 05: Examine

**Task:** batch sprints 04-09 - auth acquisition participation finance preparation realtime
**Started:** 2026-07-15T09:11:25Z

---

## Hostile Review

### Findings Checked

- Live raw token is no longer persisted. API returns `connectionToken` once and DB stores `tokenHash`.
- Game-server hashes the presented token before `findByTokenHash`.
- `PlayerState` schema decorates only session id, connection status and connected flag; `userId`,
  `participationId`, `role` and token data are not synchronized through Colyseus schema.
- Wallet payment now creates payment transaction, balance decrement and ledger entry inside one Prisma
  transaction and refuses insufficient balance before creating a transaction.
- Provider webhook settlement now updates transaction, wallet and ledger inside one Prisma transaction,
  and terminal replay returns without writing a second ledger.
- `confirmStart` no longer locks preparation with absent participants unless a reason is supplied.
- Direct registration on `DRAFT` is rejected.

### Residual Risks

- Finance transactions use `Serializable` isolation but do not yet implement retry for serialization
  conflicts under heavy concurrent load.
- Public/API routes are still transitional Hono JSON routes; ConnectRPC endpoint generation remains a
  later roadmap step after contract freeze.
- This batch keeps existing UI scope minimal; no new frontend flows were added.
