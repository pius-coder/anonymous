# Feature 11 - Catalogue de mini-jeux configurables

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Transformer le catalogue de 120 idees en definitions parametrables par familles, exploitables par game-engine et Colyseus.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Eviter 120 implementations isolees en normalisant chaque jeu par family, schema de config, actions, resolver et anti-cheat policy. |
| Target users | joueurs, admins configurant les rounds, developpeurs gameplay |
| Business value | Elevee: contenu rejouable et differenciation produit. |
| Technical complexity | Tres elevee pour 120 jeux; moyenne a elevee pour MVP limite a quelques familles. |
| Risk level | Eleve: sur-scope, triche, bugs, hasard dominant, mauvaise comprehension joueur. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Catalogue technique MiniGameDefinition.
- Familles: Solo, Duel 1v1, Alliance forcee, Equipe libre, Survie collective, Role cache.
- Config schemas, allowedActions, stateFactory, resolver, antiCheatPolicy.
- MVP 3 a 5 jeux a faible hasard et auditables.

## Parcours et workflows

1. Admin selectionne mini-jeu active et config validee.
2. Game-server charge definition/version et initialise state.
3. Client affiche uniquement state autorise; actions passent par validateMiniGameAction.
4. Resolver produit ranking/status; session applique winnersCount.

## Logiques metier et invariants

- Chaque mini-jeu declare family, playerMode, configSchema, allowedActions, resolver, antiCheatPolicy.
- Tous les timers sont serveur-side.
- Reponses sensibles non envoyees avant resolution.
- RNG serveur-side et loguee si elle influence le resultat.
- MVP priorise jeux a faible hasard, faciles a expliquer et verifier.
- winnersCount reste parametre externe applique par la couche session.

## Donnees principales

- `MiniGameDefinition`
- `MiniGameVersion`
- `MiniGameFamily`
- `ConfigSchema`
- `AllowedAction`
- `AntiCheatPolicy`
- `RngSeedLog`
- `Round.configJson`

## API et contrats

- `GET /v1/admin/minigames`
- `POST /v1/admin/minigames/:id/enable`
- `POST /v1/admin/minigames/validate-config`
- `GET /v1/minigames/:id/schema`
- `internal: validateMiniGameAction(action)`

Erreurs et cas limites a normaliser :

- `400_INVALID_MINIGAME_CONFIG`
- `409_MINIGAME_DISABLED`
- `422_ACTION_NOT_ALLOWED`
- `409_ACTION_TOO_LATE`

## Evenements et jobs

- `minigame.enabled`
- `minigame.config-validated`
- `minigame.action-accepted`
- `minigame.action-rejected`
- `minigame.runtime-exception`

## Securite, conformite et audit

- No answer leak in state/schema.
- Server-side validation of every action.
- Action rate caps per game.
- RNG seedLog if any randomness.
- Exclude hasard-dominant games until legal review.

## Criteres d acceptation

- Every game exposes schema/config/actions/resolver.
- Config validation rejects invalid params.
- Sensitive answers never sent before resolution.
- RNG server logged and replayable.
- Auto-click/double submit blocked.
- MVP games explainable by UI copy.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `minigame_runtime_exception`
- `answer_leak_detected`
- `abnormal_client_action_rate`
- `rng_family_usage_count`
- `invalid_action_count`

## Dependances fonctionnelles

- Feature 04 session config
- Feature 09 live
- Feature 10 game engine
- Feature 15 anti-cheat/legal

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- catalogue-mini-jeux.md 120 jeux et conventions communes
- BRAINSTORMING.md Mini-jeux catalogue existant sans recopier la liste
- deep-research-report.md familles techniques parametrables
- Colyseus Schema/state sync

References officielles techniques :

- Colyseus rooms, schema, presence, clock/timers, reconnection, matchmaking: https://docs.colyseus.io/llms.txt
- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt
- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt
- OWASP Authorization / API Security / Business Logic / Logging guidance: https://cheatsheetseries.owasp.org/

## Questions ouvertes

- Liste exacte des 3 a 5 jeux MVP.
- Politique de hasard acceptable.
- Assets audio/visuels minimum.
- Versioning des definitions de jeux.
