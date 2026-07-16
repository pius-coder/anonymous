# Notes de generation SEQ-01 (diff genere)

**Date :** 2026-07-16
**Commande reproductible :**

```bash
pnpm --filter @session-jeu/contracts lint:proto
pnpm --filter @session-jeu/contracts generate
pnpm --filter @session-jeu/contracts build
```

Cache Buf : `BUF_CACHE_DIR=.cache/buf` (racine monorepo).

## Pourquoi le diff

1. **Nouveaux ErrorCode** (`common/v1/errors_pb.ts`) : codes 20–29 documentes sprints 02/09/13/14/17/18.
2. **Minigame** : messages `MiniGameCommand`, `Public/PrivateState`, `ServerEvent`, `ScoreEvidence`.
3. **Notification** : champs job/ack + `AcknowledgeNotification` RPC + events delivery.
4. **Scoring** : champ `audience` sur reponses + message `ScoreWaitingReviewView`.
5. **Compliance** : nouveau package `compliance/v1` + `compliance_pb.ts` (6 RPC sprint 18).
6. Imports inutilises retires (admin, identity, session) — non breaking FILE.

## Determinisme

- Plugin unique `protoc-gen-es` (`target=ts`, `import_extension=js`).
- `buf.gen.yaml` : `clean: true` (sortie `src/gen` regeneratee integralement).
- Pas de `protoc-gen-connect-es` (Connect ES v2 lit les descriptors Protobuf-ES).

## Verification

```bash
pnpm --filter @session-jeu/contracts test
pnpm --filter @session-jeu/contracts breaking   # vs HEAD git
git diff -- packages/contracts/src/gen
```
