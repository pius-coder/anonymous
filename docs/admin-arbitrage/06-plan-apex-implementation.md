# Plan APEX d'implementation

Task APEX : `29-source-verite-dashboard-arbitrage-120-jeux`

## Objectif

Transformer le dashboard actuel en cockpit d'exploitation et d'arbitrage couvrant les 120 mini-jeux par familles/profils, avec reglement versionne, multi-admin, feuille de match, incidents, resultats provisoires/officiels et publication.

## Regle de reprise

Apres compaction, relire dans cet ordre :

1. `docs/admin-arbitrage/README.md`
2. `docs/admin-arbitrage/01-reglement-arbitrage.md`
3. `docs/admin-arbitrage/02-user-stories-dashboard.md`
4. `docs/admin-arbitrage/03-edge-cases.md`
5. `docs/admin-arbitrage/04-ui-jeux-dashboard.md`
6. `docs/admin-arbitrage/05-diagrammes.md`
7. `docs/admin-arbitrage/06-plan-apex-implementation.md`
8. PRD 09, 10, 11, 12, 13, 15
9. `docs/catalogue-mini-jeux.md`

## Sprint 1 - Modeles reglementaires

Objectif : rendre les regles representables.

Livrables :

- `MiniGameRulesVersion`
- `SessionRulesSnapshot`
- enums `ArbitrationProfile`, `QualificationMode`, `ResultCardinality`
- politiques JSON versionnees : disconnect, latency, ordering, RNG, vote, replay, publication
- validation officielle "mini-jeu jouable en session officielle"

Tests :

- un mini-jeu sans fiche complete est bloque ;
- `winnersCount` incompatible est bloque ;
- modification de regle cree une nouvelle version ;
- session verrouillee garde son snapshot.

## Sprint 2 - Event store / feuille de match

Objectif : reconstruire une partie sans video.

Livrables :

- event append-only avec sequenceNumber ;
- previousEventHash / state hashes ;
- categories `SESSION.*`, `ROUND.*`, `INPUT.*`, `RESULT.*`, `DECISION.*`, etc. ;
- gap detection ;
- integrityHash.

Tests :

- sequence duplicate/gap bloque publication ;
- correction ajoute evenement sans supprimer ;
- replay peut reconstruire un round simple.

## Sprint 3 - Multi-admin et permissions

Objectif : separer Admin A, Admin B, Support, Finance.

Livrables :

- `SessionControlLease`
- `AdminActionRequest`
- `AdminApproval`
- permission matrix server-side ;
- reason obligatoire ;
- commandId/sessionVersion/controlLeaseId sur actions critiques.

Tests :

- deux admins ne lancent pas deux transitions ;
- Support ne peut pas muter gameplay ;
- correction critique exige deux approbations ;
- admin ayant consulte secret ne peut pas trancher seul.

## Sprint 4 - Ops state API

Objectif : donner au dashboard un etat complet.

Contrat principal :

```text
AdminCompetitionState
session
rulesSnapshot
program
controlLease
adminsOnline
readiness
liveState
currentRound
matchPanel
players
teams
duels
incidents
reviewQueue
eventTimeline
resultState
notifications
systemHealth
permissions
availableActions
blockingReasons
```

Tests :

- readiness visible ;
- player row inclut connexion/submission/reconnectUntil ;
- actions disponibles changent selon permission et phase ;
- blockingReasons explicites.

## Sprint 5 - Pause/reprise reelles

Objectif : pause DB + room + UI joueur/admin.

Livrables :

- commandes `pause-live` et `resume-live` publiees a Colyseus ;
- room passe PAUSED selon policy ;
- timers gelables geres ;
- jeux non gelables appliquent politique ;
- UI joueur pause.

Tests :

- pause refletee DB, room, UI admin, UI joueur ;
- reprise idempotente ;
- action joueur pendant pause rejetee ou queue selon policy ;
- reason obligatoire.

## Sprint 6 - Cockpit dashboard v1

Objectif : remplacer la console live statique.

Livrables :

- `AdminCompetitionConsole`
- header live ;
- readiness/lobby ;
- player monitor ;
- round timeline ;
- actions avec reason ;
- incident queue ;
- event feed ;
- result status.

Tests :

- admin opere sans switch compte joueur ;
- bouton start disabled si minPlayers non atteint ;
- "Forcer live" absent ;
- reason vide bloque action ;
- secrets absents DOM support/admin non autorise.

## Sprint 7 - Panels par famille

Objectif : couvrir les 6 familles et 9 profils.

Livrables :

- Solo Panel ;
- Duel Panel ;
- Alliance Panel ;
- Equipe Panel ;
- Survie Panel ;
- Role Cache Panel ;
- widgets P1-P9.

Tests :

- role cache ne revele pas secret ;
- duel conserve choix secret apres deconnexion ;
- survie groupe incidents par vague ;
- equipe separe teamResult/individualContribution ;
- alliance ne signale pas trahison autorisee comme incident.

## Sprint 8 - Incidents, revisions, replay

Objectif : arbitrer comme une feuille de match.

Livrables :

- incident detection ;
- review dossier ;
- Admin B recommendation ;
- Admin A decision ;
- replay evenementiel ;
- recalculation compare ;
- appeal window.

Tests :

- incident MAJOR met resultat en revision ;
- CRITICAL bloque publication ;
- correction score exige double approbation ;
- appel impactant qualification bloque round suivant ;
- decision remplace l'ancienne par version.

## Sprint 9 - Resultats officiels et credits

Objectif : publier sans casser les credits.

Livrables :

- result statuses ;
- result versions ;
- integrityHash ;
- blocking incidents ;
- distribution gate ;
- correction post-publication.

Tests :

- publication refusee si incident bloquant ;
- resultVersion unique ;
- double publication idempotente ;
- credits non distribues si winners contestables ;
- correction post-publication cree nouvelle version.

## Sprint 10 - UI des jeux

Objectif : refaire les UIs de mini-jeux par famille/profil.

Livrables :

- contrats UI joueur par famille ;
- surfaces spectator/readOnly ;
- etats loading/error/pause/reconnect/provisional ;
- affichage server timer ;
- anti-secret leak tests.

Tests :

- aucun jeu n'utilise timestamp client comme preuve principale ;
- timer serveur affiche ;
- pause overlay visible ;
- reconnect overlay visible ;
- result provisional/officiel separe ;
- secrets role cache absents du state client non autorise.

## Validations globales

Avant de declarer un sprint termine :

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- tests API integration ;
- tests game-server ;
- tests UI ;
- tests E2E admin/player ;
- verification migrations depuis DB vide si Prisma modifie.

## Definition of Done globale

Le dashboard est fini seulement si :

- les 6 familles et 9 profils sont couverts ;
- les mini-jeux sans fiche complete sont bloques ;
- le dashboard expose readiness, live, rounds, incidents, preuves, resultats ;
- Admin A/Admin B/Support sont separes ;
- les commandes concurrentes sont refusees ;
- pause/reprise sont visibles aux joueurs ;
- les resultats ont provisoire/officiel/published/final ;
- la feuille de match reconstruit une decision sans video ;
- chaque edge case majeur a une politique ;
- les tests critiques passent.
