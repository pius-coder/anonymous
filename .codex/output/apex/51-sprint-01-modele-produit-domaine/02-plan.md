# Step 02: Plan

**Task:** sprint 01 - modele produit et domaine
**Started:** 2026-07-15T08:41:21Z

---

## Planning Progress

_Implementation plan will be written here..._

## Implementation Plan: sprint 01 - modele produit et domaine

### Overview

Completer le domaine pur sans toucher UI/API/DB: ajouter les transitions de manche, durcir le scoring pour
interdire la publication avant verification, et conserver la compatibilite des enums deja consommees par
les changements existants.

### File Changes

#### `packages/game-engine/src/types/round.ts`
- Ajouter `RoundStatus.Verified` si necessaire pour separer resolution et publication.

#### `packages/game-engine/src/transitions/round.ts` (NEW)
- Ajouter `ROUND_TRANSITIONS`.
- Ajouter `canTransitionRound`, `transitionRound`, `startRoundBriefing`, `activateRound`, `closeRoundForResolution`, `markRoundResolved`, `markRoundVerified`, `publishRound`.
- Utiliser `InvalidTransitionError`.

#### `packages/game-engine/src/transitions/index.ts`
- Exporter les transitions de manche.

#### `packages/game-engine/src/index.ts`
- Exporter les transitions de manche depuis l'API publique du package.

#### `packages/game-engine/src/types/score.ts`
- Ajouter `ScoreStatus.Verified` entre correction/review et publication.

#### `packages/game-engine/src/transitions/score.ts`
- Retirer `Provisional -> Published`.
- Ajouter `verifyScore`.
- Faire `publishScore` refuser les scores non verifies avec `ScoreNotVerifiedError`.

#### `packages/game-engine/src/errors.ts`
- Ajouter `ScoreNotVerifiedError` avec code stable `SCORE_NOT_VERIFIED`.
- Conserver `ScoreNotPublishableError` pour les autres transitions impossibles.

#### Tests
- Ajouter `packages/game-engine/src/__tests__/round-transitions.test.ts`.
- Ajouter/mettre a jour tests scoring et erreurs.
- Mettre a jour tests d'exports.

### Acceptance Criteria Mapping

- AC-01-01/02: transitions partie existantes restent couvertes.
- AC-01-03/04: participation existante reste couverte.
- AC-01-06: nouvelles transitions de manche prouvent `Active -> Closing`.
- AC-01-07: `publishScore` refuse un score non verifie avec `SCORE_NOT_VERIFIED`.

---
## Step Complete
**Status:** ✓ Complete
**Files planned:** 8
**Tests planned:** 3 files
**Next:** step-03-execute.md
**Timestamp:** 2026-07-15T10:06:00Z
