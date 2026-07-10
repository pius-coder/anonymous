# APEX Task: 17-feature-18-boucle-rounds-gameplay-server

**Created:** 2026-07-09T05:34:37Z
**Task:** Feature 18 - Boucle de rounds complete et gameplay server-side

---

## Configuration

| Flag | Value |
|------|-------|
| Auto mode (`-a`) | true |
| Examine mode (`-x`) | true |
| Save mode (`-s`) | true |
| Test mode (`-t`) | true |
| Economy mode (`-e`) | false |
| Branch mode (`-b`) | true |
| PR mode (`-pr`) | true |
| Interactive mode (`-i`) | false |
| Branch name | apex/feature-18-boucle-rounds-gameplay-server |

---

## User Request

```
-a -s -x -t -e # Feature 18 - Boucle de rounds complete et gameplay server-side
```

---

## Acceptance Criteria

- [ ] AC1: Worker `round.deadline` appelle `finalizeRound` (idempotent) après fermeture du round
- [ ] AC2: Room reçoit event `round.resolved`, broadcast scores/qualifies/eliminés, phase RESULTS courte, puis lance round suivant
- [ ] AC3: Nombre de rounds lu depuis config session/RoundConfig; dernier round déclenche finalisation/distribution (Feature 12)
- [ ] AC4: Joueurs éliminés restent spectateurs, reçoivent `you.eliminated`, ne peuvent plus soumettre d'actions (rejet serveur)
- [ ] AC5: Runtimes server-side pour memory-sequence, rapid-calculation, pure-reaction-duel; génèrent épreuve, valident inputs, calculent score
- [ ] AC6: Client ne soumet JAMAIS un score; soumet inputs; serveur calcule score
- [ ] AC7: Données sensibles (séquence, bonne réponse, position cible) absentes du state sync et des messages avant resolution
- [ ] AC8: `submit-score` supprimé/désactivé des definitions seedées; remplacé par actions réelles
- [ ] AC9: Double submit et late input toujours détectés
- [ ] AC10: Seed logguée, replay runtime déterministe
- [ ] AC11: Session 2+ rounds, 3+ joueurs simules se joue en test intégration

---

## Progress

| Step | Status | Timestamp |
|------|--------|-----------|
| 00-init | ✅ Complete | 2026-07-09T05:34:37Z |
| 01-analyze | ✓ Complete | 2026-07-09T05:49:34Z |
| 02-plan | ✓ Complete | 2026-07-09T05:53:06Z |
| 03-execute | ⏳ In Progress | 2026-07-09T05:53:06Z |
| 04-validate | ⏸ Pending | |
| 05-examine | ⏸ Pending | |
| 06-resolve | ⏸ Pending | |
| 07-tests | ⏸ Pending | |
| 08-run-tests | ⏸ Pending | |
| 09-finish | ⏸ Pending | |
