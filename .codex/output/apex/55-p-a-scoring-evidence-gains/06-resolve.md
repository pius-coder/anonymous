# Step 06: Resolve

**Task:** P-A-SCORING - Preuves, publication et gains atomiques
**Started:** 2026-07-18T01:23:48Z

---

## Resolution Log

- Fixed API lint regression caused by an unused `ScoreVerificationRow` alias in `scoring.use-case.ts`.
- Fixed web lint warnings by removing an unused import/function and simplifying selected-row derivation in `AdminScoresPanel`.
- Updated the existing L5 flow test to target the new atomic publication path with evidence hash, wallet lookup and published-only player projection assertions.
- Resolved local L3 test execution by running it against the active local Postgres socket URL instead of the stale generated TCP test URL.
