# Step 01: Analyze

**Task:** Implementer Sprint 1 - Modele produit et domaine dans packages/game-engine
**Started:** 2026-07-14T11:29:58Z

---

## Context Discovery

### Codebase State

- `packages/game-engine/src/index.ts:1-14` — stub only: `RuntimeFoundationStatus` type + getter. No domain types, transitions, or errors.
- `packages/shared/src/index.ts:1-25` — foundation constants only.
- Legacy domain types deleted per `docs/00-audit/deletion-manifest.md`.
- No custom Error classes, enums, interfaces, or subdirectories in packages/.

### Key Documents

| Doc | Content |
|-----|---------|
| `docs/01-product/session-lifecycle.md:1-42` | Party lifecycle states + events table + forbidden transitions |
| `docs/03-architecture/uml.md:236-270` | 14-state party machine (Draft→Scheduled→PreparationOpen→PreparationLocked→RoundSetup→RoundBriefing→RoundActive→RoundClosing→Verification→ResultsPublished→Completed + Cancelled/Suspended/Failed) |
| `docs/03-architecture/uml.md:276-293` | 11-state participation machine (Invited→Registered→Paid→Present→Ready→InRoom→Playing→FinishedRound→WaitingReview→ResultsVisible→Completed + Disconnected/Abandoned) |
| `docs/03-architecture/data-model.md:1-28` | Target concepts: Party, PartyParticipation, Round, ProvisionalScore, PublishedScore, etc. |
| `docs/03-architecture/uml.md:117-226` | UML class diagram: 13 classes, GameParticipation as pivot |
| `docs/01-product/scoring-and-publication.md:1-22` | 6 score states, Provisional != Published |
| `docs/04-layers/domain.md:1-18` | Domain owns lifecycle, invariants, forbidden transitions |
| `docs/01-product/actors-and-permissions.md:1-18` | 5 actors, 5 sensitive permissions |
| `docs/01-product/glossary.md:1-19` | 18 defined terms |
| `docs/03-architecture/target-architecture.md:95-112` | GameParticipation replaces SessionRegistration |

### Key Architecture Decisions

1. **PartyParticipation replaces SessionRegistration** — `data-model.md:23`, `uml.md:228-229`
2. **All transitions to active states require admin** — `uml.md:260-263`
3. **No timer-driven Scheduled→RoundActive** — `uml.md:261-263`
4. **ProvisionalScore and PublishedScore distinct** — `target-architecture.md:200-202`, `scoring-and-publication.md:10-17`
5. **Domain = pure TS, zero framework deps** — `domain.md:1-18`, `game-engine/ARCHITECTURE.md:1-50`
6. **5 role archetypes: AdminPrimary, AdminAssistant, Support, Finance, ReadObserver** — `uml.md:478-497`

### Confirmed Patterns

- **Foundation marker**: Every package has `XFoundation` type + getter
- **Test pattern**: Vitest, `globals: true`, relative `../index.js` imports, Node env
- **Import**: `import { describe, expect, it } from "vitest"` (explicit despite globals)

## Inferred Acceptance Criteria

- [ ] Pure domain types (Party/Game, PartyParticipation/GameParticipation, Round, ProvisionalScore, PublishedScore, PlayerCommand, Announcement) in `packages/game-engine/src/types/`
- [ ] Party state machine with 14 states + all valid transitions
- [ ] Participation state machine with 11 states + all valid transitions
- [ ] Stable domain Error class/types
- [ ] Domain events enum (or equivalent pure type)
- [ ] No framework dependencies (Hono, Next.js, Prisma, Colyseus)
- [ ] No endpoints or DB models
- [ ] `Scheduled->RoundActive` by timer impossible by type design
- [ ] Exhaustive unit tests for all allowed state transitions
- [ ] Unit tests for participation lifecycle transitions
- [ ] Edge cases: no-show, abandon, reconnect, eliminated participant
- [ ] `packages/game-engine/src/index.ts` re-exports all public API
