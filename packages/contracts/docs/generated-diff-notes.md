# Generated output notes — P-SEQ-02 production freeze

## Version

- `CONTRACTS_VERSION` / `PRODUCTION_CONTRACTS_VERSION` : `v0.2.0-production`
- Base SEQ-01 : 12 services / 57 RPC
- Production freeze : 12 services / 65 RPC

## Generation

```bash
pnpm --filter @session-jeu/contracts generate
# BUF_CACHE_DIR=../../.cache/buf buf generate
```

Plugin : `protoc-gen-es` → `src/gen/**/*_pb.ts` (`import_extension=js`).

## Descriptor hash

Recorded at freeze time in `docs/descriptor-hash.txt` (SHA-256 of `buf build` image).

Regenerate:

```bash
cd packages/contracts
BUF_CACHE_DIR=../../.cache/buf buf build -o /tmp/contracts.bin
sha256sum /tmp/contracts.bin | tee docs/descriptor-hash.txt
```

## Additive changes vs SEQ-01

- common: PageRequest/Response, IdempotencyKey, ContractVersion, TypedBytesEnvelope, ErrorEnvelope, new ErrorCodes
- minigame: six typed game protos + schema fields on envelopes (keys aligned with P-SEQ-01 rulebooks)
- payment: internal vs Fapshi wire statuses, webhook inbox, reconcile RPCs
- compliance: export, retention, support cases
- admin: GetSystemReadiness
- round: schema-bound payload fields

No field numbers reused or renumbered.
