# Step 02: Plan

## Strategy
1. Harden use-cases: server amount catalog, required idempotency, prize block, ACCESS_FEE vs TOP_UP settle
2. Provider adapter (Fapshi-compatible, offline default)
3. Export `payment-service.ts` Connect handlers without central router mount
4. REST schemas: required idempotencyKey; productCode; no trusted client amount for ACCESS_FEE
5. Web REST client `services/payment/payment-api.ts` (not rpcServices.ts)
6. Wire PaymentPanel, wallet, finance ledger/detail to server
7. Tests L3 (PG webhook/debit), L4 (REST RBAC/signature + Connect handlers), L5 (status mapping)

## Out of scope
- contracts, schema/migrations/seed
- worker reconciliation runner
- central RPC router / rpcServices.ts
- participation/lobby/scoring
