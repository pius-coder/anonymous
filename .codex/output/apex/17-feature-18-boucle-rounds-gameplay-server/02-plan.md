# Step 02: Plan

**Task:** Feature 18 - Boucle de rounds complete et gameplay server-side
**Started:** 2026-07-09T05:50:00Z

---

## Implementation Plan: Boucle de rounds complete et gameplay server-side

### Overview

Connect the three disconnected systems: (A) Worker calls finalizeRound after deadline → publishes Redis event, (B) Room subscribes to events → orchestrates multi-round flow, (C) Game-engine runtimes compute scores server-side replacing client-provided scores. No schema migration needed; round config (maxRounds, winnersCount, seed) stored in existing RoundInstance.configJson.

### Prerequisites
- [x] finalizeRound exists in apps/api/src/rounds/roundResolution.ts
- [x] processRoundDeadline exists in apps/worker/src/roundDeadline.ts
- [x] resolveRound exists in packages/game-engine/src/index.ts
- [x] Colyseus 0.17 + RedisPresence installed
- [x] ioredis available in workspace

---

### File Changes

---

#### 1. `packages/game-engine/src/runtimes/types.ts` (NEW)

Define runtime interface for server-side mini-game execution.

```ts
export type RuntimeResolverInput = {
  roundId: string;
  participants: string[];
  actions: PlayerAction[];
  config: Record<string, unknown>;
  seed: string;
};

export interface GameRuntime {
  key: string;
  resolve(input: RuntimeResolverInput): ResolverOutput;
}
```

- Import `PlayerAction`, `ResolverOutput` from parent `index.ts`
- Pure types, no side effects

---

#### 2. `packages/game-engine/src/runtimes/memory-sequence.ts` (NEW)

Server-side runtime for "Séquence mémoire" (catalogue §1.1).

- `key: "memory-sequence"`
- Config: `{ sequenceLength: number, incrementPerRound: number, displaySpeedMs: number, maxRounds: number }`
- Seed-based PRNG generates sequence of integer tokens (0-5 for 6 colors)
- Actions: type `sequence-input`, payload: `{ roundIndex: number, reproduction: number[] }`
- Validation: for each accepted action, regenerate the sub-sequence for that roundIndex, compare element-by-element with reproduction
- Score per player = count of correctly reproduced rounds
- Tie-break = average reaction time (submittedAt - roundStartTime per round)
- Ranking: by score desc, then tie-break asc
- `resolve()` produces complete `ResolverOutput` including qualifiedIds/eliminatedIds based on winnersCount from config
- Seed log records each generated sub-sequence for audit

Key rules from catalogue:
- "Le serveur génère une séquence aléatoire (longueur initiale 3)" → seed-based PRNG
- "Seule la validation manche par manche est envoyée au client" → actions contain reproduction, not score
- "Classement par nombre de manches réussies ; en cas d'égalité, temps de réaction moyen"

---

#### 3. `packages/game-engine/src/runtimes/rapid-calculation.ts` (NEW)

Server-side runtime for "Calcul rapide" (catalogue §1.2).

- `key: "rapid-calculation"`
- Config: `{ durationSeconds: number, difficultyMin: number, difficultyMax: number, questionDelayMs: number }`
- Seed-based PRNG generates math questions (addition/subtraction, operands in difficulty range)
- Actions: type `answer`, payload: `{ questionIndex: number, answer: number, answeredAtMs: number }`
- Validation: regenerate question at that index, compare answer
- Score per player = count of correct answers
- Tie-break = cumulative response time (answeredAtMs - questionShownAtMs)
- Ranking: by score desc, then tie-break asc
- Seed log records generated questions for audit

Key rules from catalogue:
- "Questions générées server-side à la volée, jamais préchargées" → seed-based generation
- "Score = bonnes réponses, tie-break = temps cumulé"

---

#### 4. `packages/game-engine/src/runtimes/pure-reaction-duel.ts` (NEW)

Server-side runtime for "Course au signal" (catalogue §2.2).

- `key: "pure-reaction-duel"`
- Config: `{ roundsToWin: number, signalDelayRangeMs: [number, number], falseStartPenaltyMs: number }`
- Seed-based PRNG generates signal timing for each sub-round
- Actions: type `reaction-click`, payload: `{ roundIndex: number, clickedAtMs: number }`
- Validation per sub-round:
  - Both players submit click
  - Server signal timestamp = seed-derived delay
  - Click before signal = false start → automatic loss of that sub-round
  - Click after signal: reaction time = clickedAt - signalTimestamp
  - Fastest valid click wins the sub-round
- Score = sub-rounds won (first to roundsToWin)
- Produces complete ResolverOutput with qualified/eliminated
- Seed log records signal timestamps for audit

Key rules from catalogue:
- "Signal timestampé server-side"
- "Clic avant signal = faux départ = défaite immédiate"
- "Correction de latence individuelle par joueur"

---

#### 5. `packages/game-engine/src/runtimes/index.ts` (NEW)

Runtime registry.

- Import all 3 runtimes
- Export `const RUNTIMES: Record<string, GameRuntime>`
- Export `function getRuntime(key: string): GameRuntime | undefined`

---

#### 6. `packages/game-engine/src/index.ts` (UPDATE)

Current: 186 lines. Exports resolveRound, rankPlayers, applyWinnersCount, hashResolution, stableStringify.

Changes:
- Re-export runtime types: `RuntimeResolverInput`, `GameRuntime`
- Re-export `getRuntime`, `RUNTIMES` from `./runtimes/index.js`
- No changes to existing resolveRound/rankPlayers/applyWinnersCount (backward compatible)

---

#### 7. `packages/game-engine/src/runtimes/__tests__/memory-sequence.test.ts` (NEW)

Tests:
- Determinism: same seed + same actions → same output (hashResolution match)
- Score computation: correct reproductions counted, wrong ones not
- Sensitive data: sequence never appears in output scores/ranks fields
- Ranking: correct order by score then tie-break
- Missing actions: player with no actions gets score 0

---

#### 8. `packages/game-engine/src/runtimes/__tests__/rapid-calculation.test.ts` (NEW)

Tests:
- Determinism: same seed → same questions generated
- Score: correct answers counted
- Tie-break: cumulative response time
- Late answers (after question expired): not counted
- Missing actions: score 0

---

#### 9. `packages/game-engine/src/runtimes/__tests__/pure-reaction-duel.test.ts` (NEW)

Tests:
- Determinism: same seed → same signal timing
- False start detection: click before signal = loss
- Win counting: first to roundsToWin
- Reaction time calculation: accurate to ms

---

#### 10. `apps/api/src/rounds/roundResolution.ts` (UPDATE)

Current: 292 lines. `finalizeRound` takes explicit `config: ResolverConfig`.

Changes at `finalizeRound` (line 131):
- After loading round (line 142), check if `round.miniGameDefinitionId` exists
- If yes: load `MiniGameDefinition` via `tx.miniGameDefinition.findUnique`
- Derive `ResolverConfig` from `MiniGameDefinition.defaultConfig` (winnersCount) and resolverId
- If config param not provided by caller: use DB-derived config
- After `buildResolverInput`, check runtime availability:
  - Import `getRuntime` from `@session-jeu/game-engine`
  - If runtime found for `MiniGameDefinition.key`: call `runtime.resolve(runtimeInput)` instead of `resolveRound(resolverInput)`
  - `runtimeInput` uses same actions but includes `seed` from `round.configJson.seed` and `config` from MiniGameDefinition.defaultConfig
- If no runtime (generic game): keep existing `resolveRound(resolverInput)` path

This preserves backward compatibility: the HTTP route can still pass explicit config, but when called by worker without body params, it derives from DB.

Also update `buildResolverInput` to include `seed` field (currently empty string) for runtime use.

---

#### 11. `apps/api/src/routes/internal/rounds.ts` (UPDATE)

Current: 97 lines. finalizeRound body requires `family` + `winnersCount`.

Changes at finalizeRound route (line 34):
- Make `family` and `winnersCount` optional in the body schema
- When not provided: finalizeRound loads from DB (see change #10)
- Backward compatible: existing callers that pass body params still work

---

#### 12. `apps/worker/src/roundDeadline.ts` (UPDATE)

Current: 72 lines. Closes deadline + marks COMPLETED, returns result.

Changes after closing deadline (after line 65):
- Call `finalizeRound` via HTTP: `POST ${API_BASE_URL}/internal/rounds/${data.roundId}/finalize`
  - No body needed (config derived from DB)
  - Headers: `x-internal-api-key: ${INTERNAL_API_KEY}`
- On success: publish `round.resolved` event via Redis
- On failure: log error but don't fail the job (idempotent — room can retry via polling if needed)

---

#### 13. `apps/worker/src/redisNotify.ts` (NEW)

Redis publisher for round.resolved notification.

- ioredis singleton (lazy connect, same pattern as apps/api/src/lobby/presence.ts)
- `publishRoundResolved(sessionId, roundId, output: ResolverOutput)`:
  - Publish to channel `round:resolved:${sessionId}`
  - Payload: `{ roundId, sessionId, scores, ranks, qualifiedIds, eliminatedIds, tieGroups }`
  - Catch errors (log, don't throw — non-critical)
- `closeRedis()` for cleanup

---

#### 14. `apps/worker/package.json` (UPDATE)

Add dependencies:
- `"ioredis": "^5.4.0"` (same as apps/api)

---

#### 15. `apps/worker/src/__tests__/roundDeadline.test.ts` (UPDATE)

Current: 89 lines.

Add tests:
- Worker calls API finalize after deadline close (mock fetch)
- Redis notification published after successful finalize
- API failure: job still completes, error logged
- Already-closed deadline: no API call

---

#### 16. `apps/game-server/src/live/redisSubscribed.ts` (NEW)

Redis subscriber for round.resolved events.

- ioredis subscriber (lazy connect, dedicated subscriber connection)
- `subscribeToRoundResolved(sessionId, callback)`:
  - Subscribe to `round:resolved:${sessionId}`
  - Parse JSON payload, invoke callback
  - Return unsubscribe function
- `closeRedis()` for cleanup

---

#### 17. `apps/game-server/src/rooms/GameSessionRoom.ts` (UPDATE)

Current: 193 lines. Major changes needed.

**onCreate (line 40):**
- Load session config: `maxRounds` from `configJson.maxRounds` (default 3)
- Store `maxRounds` as instance property
- Subscribe to `round:resolved:${sessionId}` via redisSubscribed
- On round.resolved message: call `handleRoundResolved(output)`

**New method: handleRoundResolved(output):**
- Set `this.state.phase = "RESULTS"`
- Broadcast `round.resolved` to all clients: `{ scores, ranks, qualifiedIds, eliminatedIds, tieGroups }`
- Mark eliminated players in state: `player.isEliminated = true`
- Short delay (3s) for results display
- If `this.currentRoundNum < this.maxRounds`:
  - Call `this.beginRound(this.currentRoundNum + 1)`
- Else:
  - Broadcast `session.completed` message
  - Trigger finalization (Feature 12 existing flow)

**New message handler: eliminated-player action rejection:**
- In `messages.action` (line 157): before processing, check if player is eliminated
- If eliminated: send `action.rejected` with reason `"player-eliminated"`
- Don't persist the action

**beginRound (line 129):**
- After starting round, generate seed and store in round configJson
- Actually: seed generation should happen in startRound (sessionStore) — see #18

**Cleanup on room dispose:**
- Unsubscribe from Redis channel
- Close Redis connection

---

#### 18. `apps/game-server/src/live/sessionStore.ts` (UPDATE)

Current: 465 lines.

**startRound (line 168):**
- Generate seed: `createHash("sha256").update(round.id + ":" + input.sessionId).digest("hex")`
- Store seed in RoundInstance.configJson: `{ ...existingConfigJson, seed }`
- Update the upsert to include configJson with seed

**submitPlayerAction (line 269):**
- Add action type validation:
  - Load MiniGameDefinition for the current round (via round.miniGameDefinitionId)
  - Check if `actionType` is in `allowedActions` array
  - If not: return `{ type: "action-not-allowed" }`
- Add eliminated player check:
  - Load RoundOutcome for this player+round
  - If status is ELIMINATED: return `{ type: "eliminated" }`
- Both checks are NEW and don't break existing tests (they add early returns)

---

#### 19. `apps/game-server/src/rooms/schema/LiveState.ts` (UPDATE)

Current: 18 lines.

Add to `LivePlayer`:
```ts
@type("boolean") isEliminated: boolean = false;
```

Add to `LiveRoomState`:
```ts
@type("number") maxRounds: number = 3;
@type("string") sessionStatus: string = "PLAYING"; // PLAYING | COMPLETED
```

---

#### 20. `apps/game-server/package.json` (UPDATE)

Add dependencies:
- `"ioredis": "^5.4.0"` (same as apps/api)

---

#### 21. `apps/game-server/src/live/__tests__/sessionStore.test.ts` (UPDATE)

Current: 220 lines.

Add tests:
- submitPlayerAction rejects actionType not in allowedActions
- submitPlayerAction rejects eliminated player
- startRound stores seed in configJson

---

#### 22. `packages/db/prisma/seed.ts` (UPDATE)

Line 61: Change `memory-sequence` allowedActions:
```
- [{ type: "submit-score", ... }]
+ [{ type: "sequence-input", maxPerWindow: 3, windowMs: 1000, requiresNonce: true }]
```

Line 76: Change `rapid-calculation` allowedActions:
```
- [{ type: "submit-score", ... }]
+ [{ type: "answer", maxPerWindow: 4, windowMs: 1000, requiresNonce: true }]
```

`pure-reaction-duel` already uses `reaction-click` ✓

---

#### 23. `apps/api/src/minigames/catalogue.ts` (UPDATE)

Line 84: Same changes as seed for memory-sequence allowedActions
Line 99: Same changes as seed for rapid-calculation allowedActions

---

#### 24. `apps/api/src/minigames/__tests__/catalogue.test.ts` (UPDATE)

Line 55: Update test references from `"submit-score"` to `"sequence-input"` and `"answer"` as appropriate

---

#### 25. `packages/game-engine/src/__tests__/index.test.ts` (UPDATE)

Add test for runtime dispatch:
- `getRuntime("memory-sequence")` returns defined runtime
- `getRuntime("unknown")` returns undefined
- Runtime resolve produces valid ResolverOutput structure

---

### Testing Strategy

**Unit tests (packages/game-engine):**
- `runtimes/__tests__/memory-sequence.test.ts` - Determinism, score, sensitive data
- `runtimes/__tests__/rapid-calculation.test.ts` - Determinism, score, tie-break
- `runtimes/__tests__/pure-reaction-duel.test.ts` - Determinism, false start, win counting

**Unit tests (apps/worker):**
- `__tests__/roundDeadline.test.ts` - API call + Redis notification + error handling

**Unit tests (apps/game-server):**
- `live/__tests__/sessionStore.test.ts` - Action type validation, eliminated player, seed storage

**Unit tests (apps/api):**
- `minigames/__tests__/catalogue.test.ts` - Updated action type references
- `rounds/__tests__/roundResolution.test.ts` - Runtime dispatch, config loading from DB

---

### Acceptance Criteria Mapping

- [x] AC1: Worker → API finalizeRound (files #12, #13, #14)
- [x] AC2: Room round.resolved handler + multi-round orchestration (files #16, #17)
- [x] AC3: maxRounds from configJson + last round triggers finalization (file #17)
- [x] AC4: Eliminated player action rejection (files #18, #17, #19)
- [x] AC5: 3 runtimes created (files #2, #3, #4, #5)
- [x] AC6: Client never submits score; runtimes compute from inputs (files #2, #3, #4, #10)
- [x] AC7: Sensitive data not in state sync (runtimes produce ResolverOutput, not raw answers)
- [x] AC8: submit-score replaced in seed/catalogue (files #22, #23)
- [x] AC9: Double submit + late input already handled + eliminated check added (file #18)
- [x] AC10: Seed logged, replay deterministic (files #7, #8, #9, #18)
- [x] AC11: Integration test (manual verification with existing test patterns)

---

### Risks & Considerations

1. **Risk**: Worker HTTP call to API adds latency to round closure
   - Mitigation: Non-blocking — finalizeRound is idempotent, room handles missing notification via polling fallback

2. **Risk**: Redis pubsub message lost if room not subscribed
   - Mitigation: Room subscribes in onCreate before any round starts; GameEvent table serves as durable outbox for polling fallback

3. **Risk**: Runtime determinism across Node versions
   - Mitigation: Use same PRNG algorithm (mulberry32), same seed encoding; tests verify hashResolution equality

4. **Risk**: Schema change for LivePlayer (isEliminated) requires Colyseus state migration
   - Mitigation: New field with default `false`, backward compatible with existing clients (they just ignore unknown fields)

---
## Step Complete
**Status:** ✓ Complete
**Files planned:** 25 (7 new, 18 updates)
**Tests planned:** 8 new test files, 4 test updates
**Next:** step-03-execute.md
**Timestamp:** 2026-07-09T05:55:00Z
