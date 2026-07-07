# Feature 11 - Plan Scrum - Catalogue mini-jeux configurables

## Objectif sprint

Transformer le catalogue de mini-jeux en definitions parametrables par famille, sans implementer 120 systemes isoles.

## Dependances

- Feature 10 game-engine.
- Feature 04 configuration sessions.

## User stories

### Story 11.1 - Modele MiniGameDefinition

Etapes :

1. Creer `MiniGameDefinition`.
2. Ajouter `key`, `family`, `playerMode`, `enabled`, `version`.
3. Ajouter `configSchema`, `allowedActions`, `antiCheatPolicy`.
4. Ajouter migration et seed MVP.

Tests :

- Seed definitions.
- Version unique.
- Schema present.

### Story 11.2 - Admin mini-jeux

Etapes :

1. Creer `GET /v1/admin/minigames`.
2. Creer `POST /v1/admin/minigames/:id/enable`.
3. Creer `POST /v1/admin/minigames/validate-config`.
4. Brancher dans configuration rounds.

Tests :

- Admin liste.
- Player refuse.
- Config invalide refusee.

### Story 11.3 - Runtime validation

Etapes :

1. Creer `validateMiniGameAction`.
2. Verifier action autorisee.
3. Verifier deadline.
4. Verifier nonce/double submit.
5. Verifier rate cap par mini-jeu.

Tests :

- Action autorisee OK.
- Action interdite refusee.
- Double submit refuse.
- Auto-click signale.

### Story 11.4 - MVP mini-jeux

Etapes :

1. Choisir 3 a 5 mini-jeux a faible hasard.
2. Implementer schemas config.
3. Implementer state minimal.
4. Connecter resolvers Feature 10.
5. Documenter regles UI simples.

Tests :

- Chaque jeu a schema/actions/resolver.
- Pas de reponse sensible exposee.
- RNG loguee si utilisee.

## Definition of Done

- Catalogue configurable.
- MVP mini-jeux jouable/testable.
- Anti-cheat minimum branche.
- Aucun hasard dominant non valide.

