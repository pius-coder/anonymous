# Feature 10 - Game engine et resolution des rounds

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Isoler les regles de jeu dans un moteur deterministe, testable, rejouable et auditable.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Centraliser eligibilite, scoring, classement, qualifications, eliminations, winnersCount, transitions et resultats hors Colyseus. |
| Target users | developpeurs, game-server, admins indirectement via configuration |
| Business value | Tres elevee: permet d ajouter des mini-jeux sans casser le live et protege gains/eliminations. |
| Technical complexity | Tres elevee: modelisation generique de familles de mini-jeux, determinisme, replay, tests et audit. |
| Risk level | Tres eleve: erreur de resolution impacte eliminations, resultats, gains et litiges. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Package separe packages/game-engine.
- Resolvers purs par famille/mini-jeu.
- Inputs valides, config, seedLog et evidence.
- Ranking/statuts produits par mini-jeu; session applique winnersCount/elimination policy.
- Replay technique pour litige.

## Parcours et workflows

1. Round active collecte inputs valides.
2. Deadline close: game-server/worker appelle resolver avec snapshot officiel.
3. Resolver retourne scores, ranks, qualifiedIds, eliminatedIds, tieGroups, evidence, seedLog.
4. Transaction persiste RoundResult, Elimination/Qualification et outbox events.
5. Replay compare output attendu avec resultat officiel.

## Logiques metier et invariants

- Colyseus orchestre le live; game-engine resout les regles.
- Un mini-jeu produit score/classement/statuts; la session applique qualification/elimination.
- Resolvers deterministes et auditables.
- Resultats persistables et rejouables pour litige.
- Tests game-engine prioritaires.
- Meme input + meme config + meme seedLog = meme output.
- Colyseus ne contient pas la logique financiere.

## Donnees principales

- `GameEngineResolver`
- `RoundResult`
- `Elimination`
- `Qualification`
- `ResolutionLog`
- `GameEvent/OutboxEvent`

## API et contrats

- `internal: resolveRound(input)`
- `internal: computeRanking(result)`
- `internal: applyWinnersCount(ranking, config)`
- `internal: finalizeRound(roundId)`
- `POST /internal/rounds/:id/replay`

Erreurs et cas limites a normaliser :

- `409_ROUND_NOT_LOCKED`
- `409_RESOLUTION_ALREADY_DONE`
- `422_INVALID_ROUND_INPUT`
- `500_RESOLVER_FAILED`

## Evenements et jobs

- `round.resolution-requested`
- `round.resolved`
- `player.eliminated`
- `player.qualified`
- `round.replay-requested`

## Securite, conformite et audit

- Reject late/double inputs.
- Server-side RNG and seedLog.
- Do not expose answer keys before resolution.
- Evidence stored for dispute.
- Transaction boundary around finalizeRound.

## Criteres d acceptation

- Resolvers pure functions tested by fixtures.
- Property tests ranking invariants.
- Same input gives same output.
- RNG replay stable.
- Timer close racing with last input.
- Result persisted and replayable for dispute.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `round_resolve_duration_ms`
- `tie_rate`
- `replay_mismatch_count`
- `late_input_rejected_count`
- `resolver_exception_count`

## Dependances fonctionnelles

- Feature 09 live orchestration
- Feature 11 mini-jeux
- Feature 12 resultats/gains
- Feature 15 anti-triche

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- BRAINSTORMING.md packages/game-engine
- catalogue-mini-jeux.md resolver/winnersCount convention
- deep-research-report.md deterministic resolution
- Prisma/PostgreSQL finalisation transactionnelle

References officielles techniques :

- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt
- PostgreSQL transaction isolation and retry expectations: https://www.postgresql.org/docs/current/transaction-iso.html
- Colyseus rooms, schema, presence, clock/timers, reconnection, matchmaking: https://docs.colyseus.io/llms.txt
- OWASP Authorization / API Security / Business Logic / Logging guidance: https://cheatsheetseries.owasp.org/

## Questions ouvertes

- Tie-break policies par famille.
- Format evidence minimal pour support/litige.
- Nombre de mini-jeux MVP couverts par resolvers generiques.
