# Runtime Topology

## Runtimes

Dans ce depot, `runtimes` designe principalement les implementations server-side de mini-jeux dans `packages/game-engine/src/runtimes/*`.

## Modules

Pour v0.1, `modules` est defini comme la granularite workspace et couche:

- app web;
- app api;
- app game-server;
- app worker;
- db;
- game-engine;
- shared/contracts futurs.

## Socle conserve

pnpm, turbo, TypeScript, PostgreSQL/Prisma, Redis/BullMQ, Hono, Next.js, Colyseus ou transport realtime equivalent.

