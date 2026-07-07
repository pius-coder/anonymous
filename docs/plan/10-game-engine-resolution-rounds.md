# Feature 10 - Plan Scrum - Game engine et resolution des rounds

## Objectif sprint

Creer un moteur de jeu separe de Colyseus, deterministe, testable et rejouable.

## Dependances

- Feature 09 live.
- Feature 11 definitions mini-jeux peut etre en parallele.

## User stories

### Story 10.1 - Structure game-engine

Etapes :

1. Creer `packages/game-engine`.
2. Definir interfaces `ResolverInput`, `ResolverOutput`, `PlayerAction`, `ResolutionEvidence`.
3. Definir convention `scores`, `ranks`, `qualifiedIds`, `eliminatedIds`, `tieGroups`, `seedLog`.
4. Exporter helpers de ranking.

Tests :

- Types compile.
- Helpers ranking unitaires.

### Story 10.2 - Resolver MVP

Etapes :

1. Implementer 1 resolver solo simple.
2. Implementer 1 resolver duel simple.
3. Gerer tie-break.
4. Gerer late/missing actions.
5. Produire evidence.

Tests :

- Fixtures deterministes.
- Egalites.
- Missing inputs.

### Story 10.3 - Finalisation round

Etapes :

1. Creer service `finalizeRound`.
2. Charger round, config, actions valides.
3. Appeler resolver.
4. Persister `RoundResult`, qualifications, eliminations en transaction.
5. Emettre events.

Tests :

- Finalisation idempotente.
- Double close refuse.
- Transaction rollback si erreur.

### Story 10.4 - Replay litige

Etapes :

1. Creer `POST /internal/rounds/:id/replay`.
2. Recharger config, inputs, seedLog.
3. Comparer output au resultat persiste.
4. Signaler mismatch.

Tests :

- Replay identique.
- Mismatch detecte.

## Definition of Done

- Game-engine hors Colyseus.
- Resolvers purs.
- Meme input = meme output.
- Finalisation transactionnelle testee.

