# Step 01: Analyze

**Task:** Feature 18 - Boucle de rounds complete et gameplay server-side
**Started:** 2026-07-09T05:34:37Z

---

## Context Discovery

## Files Analyzed

### packages/game-engine
- `src/index.ts` (186 lines): Core resolver types (ResolverInput/Output, PlayerAction, ResolverConfig), `resolveRound` dispatch, `rankPlayers`, `applyWinnersCount`, `hashResolution`, `stableStringify`
- `src/__tests__/index.test.ts` (101 lines): Unit tests for ranking, winners count, solo/duel resolution, dispatch
- `package.json`: v0.0.1, no runtime dependencies, vitest + typescript devDeps

### apps/game-server (Colyseus)
- `src/rooms/GameSessionRoom.ts` (193 lines): Room class, `onCreate` loads state then `beginRound(1)` after BRIEFING, `messages.action` handler calls `submitPlayerAction`, `beginRound` sets phase RESOLVING via setTimeout but never resolves or chains next round
- `src/rooms/schema/LiveState.ts` (18 lines): `LivePlayer` (userId, displayName, connectionStatus, submittedAction), `LiveRoomState` (sessionId, phase, roomId, currentRoundId, roundNum, deadlineEpochMs, players)
- `src/live/sessionStore.ts` (465 lines): `consumeLiveReservation`, `loadInitialLiveState`, `startRound` (creates RoundInstance + RoundDeadline + LiveSessionState, schedules BullMQ job), `submitPlayerAction` (accepts ANY actionType/payload — no routing)
- `src/live/roundDeadlineQueue.ts` (41 lines): BullMQ Queue `session-jeu`, job `round.delay`, `scheduleRoundDeadline` with delay
- `src/index.ts` (13 lines): `defineServer` with single room `game_session`
- `package.json`: colyseus 0.17, @colyseus/schema 4.0.27, bullmq 5.79.3, @session-jeu/db workspace

### apps/worker
- `src/index.ts` (58 lines): BullMQ Worker on queue `session-jeu`, dispatches `round.deadline` → `processRoundDeadline`
- `src/roundDeadline.ts` (72 lines): Closes deadline (closedAt), marks round COMPLETED, sets phase RESOLVING — does NOT call finalizeRound
- `src/__tests__/roundDeadline.test.ts` (89 lines): Tests deadline-not-reached and close+phase-transition
- `package.json`: @session-jeu/db workspace, bullmq ^5.30.0 — no @session-jeu/game-engine, no ioredis

### apps/api
- `src/rounds/roundResolution.ts` (292 lines): `finalizeRound` (idempotent via resolutionLog.findUnique, Serializable tx, persists RoundResult+RoundOutcome+ResolutionLog+GameEvent, audit), `replayRound`, `buildResolverInput` (takes payload.score from actions)
- `src/routes/internal/rounds.ts` (97 lines): HTTP internal routes `/rounds/:id/finalize` (POST, requires body.family+winnersCount), `/rounds/:id/replay`
- `src/minigames/catalogue.ts` (235 lines): MVP_MINIGAME_DEFINITIONS (5 games), `validateMiniGameConfig`, `validateMiniGameAction`, `findMiniGameDefinition`
- `src/lobby/presence.ts`: Redis pubsub via ioredis for lobby presence

### packages/db
- `schema.prisma` (1247 lines): All models confirmed. RoundInstance(configJson, miniGameDefinitionId, status), RoundResult(roundId,playerId,score,rank,metadata @@unique), RoundOutcome(roundId,userId,status,reason @@unique), ResolutionLog(roundId unique, inputHash, outputHash, inputSnapshot, outputSnapshot, evidence, seedLog), GameEvent(eventType, payload), MiniGameDefinition(key, resolverId, allowedActions, configSchema, defaultConfig, antiCheatPolicy, clientStateSchema)
- `prisma/seed.ts`: Seeds 5 minigames. memory-sequence: allowedActions=[submit-score], rapid-calculation: allowedActions=[submit-score], pure-reaction-duel: allowedActions=[reaction-click]

### docs
- `docs/plan/18-boucle-rounds-gameplay-serveur.md`: Sprint plan with 3 stories
- `docs/prd/features/10-game-engine-resolution-rounds.md`: PRD for game-engine + resolution
- `docs/plan/10-game-engine-resolution-rounds.md`: Plan for feature 10 (partially implemented)
- `docs/catalogue-mini-jeux.md`: MVP rules — 1.1 Séquence mémoire, 1.2 Calcul rapide, 2.2 Course au signal

## Key Gaps Identified

### Gap A: Worker does not call finalizeRound
- `processRoundDeadline` (apps/worker/src/roundDeadline.ts:31-65) closes round + sets phase RESOLVING
- Does NOT call `finalizeRound` (apps/api/src/rounds/roundResolution.ts:131)
- Worker cannot import from apps/api (separate deployable)

### Gap B: No round.resolved event handling in room
- `GameSessionRoom` (apps/game-server/src/rooms/GameSessionRoom.ts) has NO subscription to external events
- beginRound (line 129) never chains to next round
- No broadcast of scores/qualifies/eliminés after resolution
- No phase RESULTS transition

### Gap C: resolveRound takes client-provided score
- `resolveRound` (packages/game-engine/src/index.ts:182) reads `action.payload.score` directly
- `submitPlayerAction` (apps/game-server/src/live/sessionStore.ts:269) stores raw payload without validation
- No server-side computation of score from inputs

### Gap D: No server-side runtimes for MVP mini-games
- No `packages/game-engine/src/runtimes/` directory exists
- No memory-sequence runtime (generate sequence, validate reproduction)
- No rapid-calculation runtime (generate questions, validate answers)
- No pure-reaction-duel runtime (signal timestamp, calculate reaction time)
- MiniGameDefinition.allowedActions for memory-sequence and rapid-calculation still have `submit-score`

### Gap E: RoundInstance.config not loaded during resolution
- `finalizeRound` (apps/api/src/rounds/roundResolution.ts:131) takes config as HTTP body parameter
- Should load from RoundInstance.configJson + MiniGameDefinition to get resolverId and winnersCount
- Currently, the internal API route requires caller to pass family/winnersCount

## Patterns Observed

1. **Transaction pattern**: Prisma $transaction with Serializable isolation + withSerializableRetry
2. **BullMQ pattern**: Queue `session-jeu`, delayed jobs with jobId for dedup, Worker in apps/worker
3. **Idempotency**: resolutionLog.findUnique check, createMany skipDuplicates, unique constraints
4. **Testing**: vitest + vi.hoisted + vi.mock for Prisma, mock return values, assertion on specific fields
5. **Event outbox**: GameEvent table used as outbox (eventType: "round.resolved", "player.qualified", "player.eliminated")
6. **Redis pubsub**: ioredis already used in apps/api/src/lobby/presence.ts, pattern: lazyConnect, getRedis singleton

## Library Context

- **Colyseus 0.17**: `this.presence.subscribe/publish` for inter-room pubsub, `matchMaker.presence` from external process. RedisPresence + RedisDriver for multi-process.
- **BullMQ 5.79**: Worker processes jobs, QueueEvents for cross-process completion events
- **Prisma 6.19**: Serializable transactions, createMany skipDuplicates, unique constraints for idempotency
- **ioredis 5.10**: Already in apps/api; needed in game-server for pubsub subscription

## Context7 IDs Used
- `/colyseus/docs` — presence pubsub, broadcast, inter-room communication
- `/taskforcesh/bullmq` — QueueEvents, worker completion events

## Versions Verified
- colyseus: 0.17.10 (game-server/package.json)
- @colyseus/schema: 4.0.27
- bullmq: 5.79.3 (game-server) / 5.30.0 (worker)
- prisma: 6.19.3
- ioredis: 5.10.1
- vitest: 2.1.0
