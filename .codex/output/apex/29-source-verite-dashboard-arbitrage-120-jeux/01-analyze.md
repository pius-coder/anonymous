# Step 01: Analyze

**Task:** Creer la source de verite produit et technique pour le dashboard d'administration/arbitrage couvrant 120 mini-jeux, edge cases, multi-admin, registre evenementiel et diagrammes
**Started:** 2026-07-11T06:52:57Z

---

## Context Discovery

_Findings will be appended here as exploration progresses..._

## Sources locales verifiees

| Source                                                      | Lignes  | Constats                                                                                                                          |
| ----------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `docs/catalogue-mini-jeux.md`                               | 1-8     | 120 mini-jeux, 6 familles, timers serveur, `winnersCount` externe, rooms Colyseus                                                 |
| `docs/catalogue-mini-jeux.md`                               | 891     | Generalisation par familles parametrables plutot que 120 implementations isolees                                                  |
| `docs/prd/features/11-catalogue-mini-jeux-configurables.md` | 31-43   | MiniGameDefinition, state autorise, validateMiniGameAction, resolver, antiCheatPolicy                                             |
| `docs/prd/features/10-game-engine-resolution-rounds.md`     | 24-46   | Resolvers purs, evidence, seedLog, replay, Colyseus orchestre mais ne resout pas finance                                          |
| `docs/prd/features/09-session-live-temps-reel.md`           | 24-46   | Room par session, phases live, DB deadline, reconnexion, pause admin auditee                                                      |
| `docs/prd/features/13-dashboard-admin-audit-support.md`     | 24-44   | Dashboard admin/support/finance, role + reason + audit                                                                            |
| `docs/prd/features/12-resultats-gains-distribution.md`      | 32-47   | Resultats officiels, corrections auditees, credits idempotents                                                                    |
| `docs/prd/features/15-securite-anti-triche-conformite.md`   | 33-48   | Authz server-side, client jamais source de verite critique, anti-cheat                                                            |
| `docs/plan/19-phase3-operateur-lancement.md`                | 222-236 | Live control admin prevu mais trop limite pour arbitrage complet                                                                  |
| `packages/db/prisma/schema.prisma`                          | 25-85   | Statuts session/registration/round/live existants                                                                                 |
| `packages/db/prisma/schema.prisma`                          | 511-577 | LiveSessionState, LiveReservation, PlayerConnection existent                                                                      |
| `packages/db/prisma/schema.prisma`                          | 673-925 | RoundInstance, MiniGameDefinition, RoundParticipant, PlayerAction, AntiCheatEvent, RoundResult, ResolutionLog, GameEvent existent |

## Documentation actuelle consultee

- Context7 library lookup: Colyseus -> `/colyseus/docs`
- Context7 docs: reconnection lifecycle using `onDrop`, `allowReconnection`, `onReconnect`, `onLeave`

## Constats

- Le repo possede deja beaucoup de primitives techniques, mais pas la source de verite produit reliant 120 mini-jeux, arbitrage, multi-admin, edge cases et dashboard.
- Le PRD Feature 11 normalise les mini-jeux par famille/action/resolver, mais ne detaille pas encore le reglement d'arbitrage par profil P1-P9.
- Le PRD Feature 13 couvre admin/audit/support, mais pas une feuille de match interactive avec dossiers de revision, replay et resultats provisoires/officiels.
- Les modeles Prisma existants permettent une partie du socle, mais il manque encore les concepts cible : fiches reglementaires versionnees, resultVersion, controlLease, admin approvals, event sequence/hash complet, incidents/reviews dedies.

## Acceptance Criteria inferes

- [ ] AC1: Les documents source de verite sont crees dans `docs/admin-arbitrage/`.
- [ ] AC2: La source couvre les 6 familles, 9 profils, fiche mini-jeu, multi-admin, event store, resultats et edge cases.
- [ ] AC3: Les 15 diagrammes demandes sont persistés.
- [ ] AC4: Une regle de reprise apres compaction indique quels documents relire.
- [ ] AC5: Un plan APEX par sprints permet de transformer ces documents en implementation.
- [ ] AC6: Les fichiers crees sont verifies par CLI.

## Step complete

Status: Complete
