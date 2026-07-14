# Step 02: Plan

**Task:** Implementer Sprint 1 — Modèle produit et domaine dans packages/game-engine

## Implementation Plan

### Overview

Créer le modèle domaine pur dans `packages/game-engine/src/` avec types, états, transitions, erreurs et événements. Aucune dépendance framework. Aucun endpoint. Aucun modèle DB.

---

### File Changes

#### 1. `packages/game-engine/src/errors.ts` (NEW)
- Base class `DomainError extends Error` with `readonly code: string`
- Specific subclasses: `InvalidTransitionError`, `InvalidRoleError`, `ParticipationNotFoundError`, `ScoreNotPublishableError`
- Each error has stable error code string for future Protobuf mapping

#### 2. `packages/game-engine/src/types/party.ts` (NEW)
- `GameStatus` enum with 14 states matching `uml.md:237-258`:
  `Draft, Scheduled, PreparationOpen, PreparationLocked, RoundSetup, RoundBriefing, RoundActive, RoundClosing, Verification, ResultsPublished, Completed, Cancelled, Suspended, Failed`
- `GameStatus` includes `UNSPECIFIED = 0` per Protobuf convention
- `Game` interface: `id: string, status: GameStatus, scheduledAt?: Date, visibility: string`
- Helper type `GameEventType` for party-level events

#### 3. `packages/game-engine/src/types/participation.ts` (NEW)
- `ParticipationStatus` enum with 13 states matching `uml.md:277-293`:
  `Invited, Registered, Paid, Present, Ready, InRoom, Playing, FinishedRound, Disconnected, WaitingReview, ResultsVisible, Completed, Abandoned`
- `UNSPECIFIED = 0`
- `GameParticipation` interface: `id, gameId, userId, role, readinessState, connectionState, rights`
- `ReadinessState` type: `"offline" | "connected" | "present" | "ready" | "noResponse"`
- `ConnectionState` type: `"disconnected" | "connecting" | "connected" | "reconnecting" | "expired"`
- `ParticipationRole` type: `"player" | "adminPrimary" | "adminAssistant" | "support" | "finance" | "readObserver"`
- `ParticipationRights` interface: `canStart: boolean, canVerify: boolean, canPublish: boolean, canObserve: boolean`

#### 4. `packages/game-engine/src/types/round.ts` (NEW)
- `RoundStatus` enum: `Setup, Briefing, Active, Closing, Resolved, Published`
- `UNSPECIFIED = 0`
- `Round` interface: `id, gameId, number, status, miniGameKey`

#### 5. `packages/game-engine/src/types/score.ts` (NEW)
- `ScoreStatus` enum matching `scoring-and-publication.md:12-17`:
  `Pending, Provisional, UnderReview, Corrected, Published, Voided`
- `UNSPECIFIED = 0`
- `ProvisionalScore` interface: `roundId, participationId, score, rank, evidenceHash`
- `PublishedScore` interface: `roundId, participationId, score, rank, publishedAt`

#### 6. `packages/game-engine/src/types/events.ts` (NEW)
- `DomainEvent` discriminated union type
- Event types matching `session-lifecycle.md:16-30`:
  `GameScheduled, PreparationOpened, PreparationLocked, RoundSetup, RoundBriefed, RoundStarted, RoundClosed, ScoreVerified, ResultsPublished, NextRoundPrepared, GameCompleted, GameCancelled, ParticipationRegistered, PaymentConfirmed, CheckedIn, PlayerReady, PlayerConnected, PlayerDisconnected, PlayerReconnected, PlayerAbandoned, PlayerFinishedRound`
- Each event carries: `type` discriminant, `timestamp`, and domain-specific payload

#### 7. `packages/game-engine/src/types/index.ts` (NEW)
- Barrel file re-exporting all types from party, participation, round, score, events

#### 8. `packages/game-engine/src/transitions/party.ts` (NEW)
- Pure transition functions following `uml.md:236-270`
- Each function: `(game: Game) => Game | [Game, DomainEvent]` or throws `DomainError`
- Transition map as const record: `PARTY_TRANSITIONS`
- `validatePartyTransition(current: GameStatus, target: GameStatus): boolean`
- `schedule(game)` — `Draft → Scheduled`
- `openPreparation(game)` — `Scheduled → PreparationOpen`
- `lockPreparation(game)` — `PreparationOpen → PreparationLocked`
- `cancel(game)` — `Draft|Scheduled|PreparationOpen → Cancelled`
- `prepareRound(game)` — `PreparationLocked → RoundSetup`
- `startBriefing(game)` — `RoundSetup → RoundBriefing`
- `startRound(game)` — `RoundBriefing → RoundActive`
- `closeRound(game)` — `RoundActive → RoundClosing`
- `computeProvisionalScores(game)` — `RoundClosing → Verification`
- `publishResults(game)` — `Verification → ResultsPublished`
- `requestCorrection(game)` — `Verification → RoundSetup`
- `prepareNextRound(game)` — `ResultsPublished → RoundSetup`
- `completeGame(game)` — `ResultsPublished → Completed`
- `pause(game)` — `RoundActive → Suspended`
- `resume(game)` — `Suspended → RoundActive`
- `fail(game)` — `Suspended → Failed`
- `recover(game)` — `Failed → PreparationOpen`
- **Forbidden transition impossible**: No function allows `Scheduled → RoundActive`. Structural guarantee.
- All transitions return either new `Game` object (immutable update) or throw `InvalidTransitionError`

#### 9. `packages/game-engine/src/transitions/participation.ts` (NEW)
- Pure transition functions following `uml.md:277-293`
- `validateParticipationTransition(current: ParticipationStatus, target: ParticipationStatus): boolean`
- `acceptInvitation(p)` — `Invited → Registered`
- `confirmPayment(p)` — `Registered → Paid`
- `checkIn(p)` — `Paid → Present`
- `markReady(p)` — `Present → Ready`
- `connectRealtime(p)` — `Ready → InRoom`
- `startRoundForPlayer(p)` — `InRoom → Playing`
- `finishPlayerRound(p)` — `Playing → FinishedRound`
- `disconnectPlayer(p)` — `Playing → Disconnected`
- `reconnectPlayer(p)` — `Disconnected → Playing`
- `abandonPlayer(p)` — `Disconnected → Abandoned`
- `closePlayerRound(p)` — `FinishedRound → WaitingReview`
- `publishPlayerResults(p)` — `WaitingReview → ResultsVisible`
- `prepareNextRoundForPlayer(p)` — `ResultsVisible → Ready`
- `completePlayerParticipation(p)` — `ResultsVisible → Completed`

#### 10. `packages/game-engine/src/transitions/score.ts` (NEW)
- Score status transitions
- `setProvisional(s)` — `Pending → Provisional`
- `flagForReview(s)` — `Provisional → UnderReview`
- `correctScore(s)` — `UnderReview → Corrected`
- `publishScore(s)` — `Provisional|Corrected → Published`
- `voidScore(s)` — `Pending|Provisional|UnderReview → Voided`

#### 11. `packages/game-engine/src/transitions/index.ts` (NEW)
- Barrel re-exporting all transition functions

#### 12. `packages/game-engine/src/index.ts` (MODIFY)
- Remove legacy `RuntimeFoundationStatus` + getter (or keep as internal)
- Re-export public API from `./types` and `./transitions` and `./errors`

#### 13. `packages/game-engine/src/__tests__/party-transitions.test.ts` (NEW)
- Test ALL valid party state transitions (at least one test per transition)
- Test ALL forbidden transitions (at least for Scheduled→RoundActive)
- Test error cases: invalid transition throws `InvalidTransitionError`
- Test edge cases: cancel from multiple states, pause/resume cycle, fail/recover cycle
- Test that `Game` object is never mutated (immutable update)

#### 14. `packages/game-engine/src/__tests__/participation-transitions.test.ts` (NEW)
- Test ALL valid participation transitions
- Test disconnect→reconnect→abandon flow
- Test edge cases: reconnect after deadline, finish without disconnect

#### 15. `packages/game-engine/src/__tests__/errors.test.ts` (NEW)
- Test DomainError class hierarchy
- Test error codes are stable strings

#### 16. `packages/game-engine/src/__tests__/index.test.ts` (MODIFY)
- Update existing test for new public API exports
- Test that all expected exports are accessible

---

### Testing Strategy

| Test File | What It Tests |
|-----------|---------------|
| `__tests__/party-transitions.test.ts` | ALL party transitions, forbidden transitions, immutability |
| `__tests__/participation-transitions.test.ts` | ALL participation transitions, disconnect/reconnect flow, edge cases |
| `__tests__/errors.test.ts` | Error class hierarchy, stable codes |
| `__tests__/index.test.ts` | Public API exports |

---

### Acceptance Criteria Mapping

- [ ] AC1 (pure domain types): Files 1-7 create all types with no framework deps
- [ ] AC2 (party state machine): File 8 implements all 14 states + 18 transitions
- [ ] AC3 (participation state machine): File 9 implements all 13 states + 14 transitions
- [ ] AC4 (domain errors): File 1 defines DomainError hierarchy
- [ ] AC5 (domain events): File 6 defines DomainEvent discriminated union
- [ ] AC6 (no framework deps): Files 1-12 use only TypeScript stdlib, package.json has zero new deps
- [ ] AC7 (no endpoints/DB): No route, schema, Prisma, or Hono files created
- [ ] AC8 (Scheduled→RoundActive impossible): No transition function for this pair exists; test proves it
- [ ] AC9 (exhaustive tests): Files 13-15 cover all transitions
- [ ] AC10 (edge cases): Test disconnect/reconnect, cancel from multiple states, pause/resume, fail/recover



---

## Step Complete
**Status:** ✓ Complete
**Files to create:** 15 (13 new + 2 modify)
**Tests:** 4 test files
**Next:** step-03-execute.md
