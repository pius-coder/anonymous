# Validate — A-REALTIME

## Commandes

| Commande | Résultat |
|---|---|
| `pnpm --filter @session-jeu/game-server test` | 26 unit + L4 transport OK |
| `pnpm --filter @session-jeu/game-server typecheck` | OK |
| `pnpm --filter @session-jeu/game-server lint` | OK |
| `pnpm --filter @session-jeu/game-server build` | OK |
| `pnpm --filter @session-jeu/web typecheck` | OK (après generate contracts local non commit) |
| `pnpm --filter @session-jeu/web exec vitest run src/__tests__/ui-system.test.ts` | 6 OK |

## AC

- [x] Timeout reconnect + max clients config serveur
- [x] Room charge round/status/deadline serveur
- [x] Nonce dup / late / role / stale refused/idempotent
- [x] Reconnexion dans fenêtre
- [x] Snapshots audience
- [x] Live smoke échoue sans Colyseus; room.spec hors E2E live
- [x] L3/L4 tests

## Hors scope / SEQ-03

- Montage central routeur / workers
- RPC GetPlayerState/Admin/Readonly complets (CreateLiveAccess existait)
- Observer routes (B-OBSERVER)
