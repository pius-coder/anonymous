# Execute — A-REALTIME

## Fichiers principaux

- `apps/game-server/src/config.ts` — getters env autoritaires
- `apps/game-server/src/rooms/GameRoom.ts` — ignore options client, charge DB, async inputs
- `apps/game-server/src/rooms/server-round-source.ts` + `round-status.ts`
- `apps/game-server/src/handlers/round-handler.ts` — nonce idempotent + PlayerAction
- `apps/game-server/src/create-server.ts` — factory pour boot testing
- `apps/web/src/components/game/live-room-facade.ts` — join sans politique client
- L3/L4 tests + e2e room hors live explicit

## Context7

- Library ID: `/colyseus/docs`
- Sujets: allowReconnection, maxClients, @colyseus/testing boot/createRoom/connectTo
