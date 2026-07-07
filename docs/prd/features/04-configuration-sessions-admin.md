# Feature 04 - Creation et configuration des sessions admin

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Permettre a l admin de creer une GameSession autonome, rentable, controlee, auditee et publiable.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Configurer prix, capacite, visibilite, planning, nombre de gagnants, repartition, commission, rounds et statut de publication. |
| Target users | admins, organisateurs internes, futurs organisateurs externes si marketplace ulterieure |
| Business value | Tres elevee: coeur de la monetisation, chaque session doit etre rentable independamment. |
| Technical complexity | Elevee: modele economique, regles de jeu, statuts, paiement, planning, audit et simulation financiere. |
| Risk level | Eleve: session non rentable, injuste, juridiquement risquee, impossible a executer ou modifiee apres paiements. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- CRUD admin GameSession en DRAFT.
- Configuration economique, capacite, visibilite et rounds.
- Simulation rentabilite avant publication.
- Publication/cancel avec audit et blocage des mutations sensibles apres paiement.

## Parcours et workflows

1. Admin cree DRAFT avec champs minimaux.
2. Admin configure rounds et gains; systeme valide invariants.
3. Simulation affiche collecte brute, frais, net, prize pool et commission.
4. Publication refusee si incoherence; apres inscriptions payees, changements sensibles bloques ou versionnes.

## Logiques metier et invariants

- Une session commence en DRAFT puis peut etre publiee et ouverte aux inscriptions.
- minPlayers >= 2 et maxPlayers >= minPlayers.
- entryFeeXaf >= minimum provider/payment amount.
- 0 <= prizePoolBps <= 10000 et sum(winnerSplitBps) = 10000.
- startsAt > now et registrationClosesAt <= startsAt.
- Toute modification sensible doit etre auditee.
- Une session publiee avec joueurs payes ne doit pas etre modifiee librement.

## Donnees principales

- `GameSession`
- `SessionConfig`
- `PrizeConfig`
- `RoundConfig`
- `MiniGameDefinition`
- `AuditLog`
- `configVersion`

## API et contrats

- `POST /v1/admin/sessions`
- `PATCH /v1/admin/sessions/:id`
- `POST /v1/admin/sessions/:id/publish`
- `POST /v1/admin/sessions/:id/open-registration`
- `POST /v1/admin/sessions/:id/cancel`
- `GET /v1/admin/sessions/:id/simulation`

Erreurs et cas limites a normaliser :

- `400_INVALID_CAPACITY`
- `400_INVALID_PRIZE_SPLIT`
- `409_CONFIG_VERSION_CONFLICT`
- `409_PAID_REGISTRATIONS_EXIST`
- `403_ADMIN_ROLE_REQUIRED`

## Evenements et jobs

- `session.draft-created`
- `session.config-updated`
- `session.published`
- `session.registration-opened`
- `session.cancelled`

## Securite, conformite et audit

- Admin RBAC strict.
- Audit before/after/reason pour champs sensibles.
- OCC via configVersion ou transaction Serializable.
- Ne pas publier si marge negative ou hasard/regle non validee.

## Criteres d acceptation

- Publication refusee si prix/capacite/repartition invalides.
- Simulation financiere correcte en XAF entiers et bps.
- Modification concurrente avec configVersion.
- Modification sensible bloquee apres inscription PAID.
- Audit obligatoire sur publish/cancel/economic changes.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `admin_session_created_count`
- `session_publish_failure_count`
- `negative_margin_blocked_count`
- `config_conflict_rate`
- `admin_change_without_reason_blocked`

## Dependances fonctionnelles

- Feature 01 catalogue public
- Feature 05 inscription
- Feature 10 game engine
- Feature 11 mini-jeux
- Feature 13 dashboard admin

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- deep-research-report.md invariants financiers XAF/bps
- BRAINSTORMING.md GameSession et statuts
- Prisma OCC/transactions
- PostgreSQL isolation

References officielles techniques :

- Next.js App Router, Authentication, Data Security, Metadata: https://nextjs.org/docs/llms.txt
- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt
- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt
- PostgreSQL transaction isolation and retry expectations: https://www.postgresql.org/docs/current/transaction-iso.html
- OWASP Authorization / API Security / Business Logic / Logging guidance: https://cheatsheetseries.owasp.org/

## Questions ouvertes

- Valeurs par defaut prix/commission/gagnants.
- Politique exacte de modification apres publication.
- Session templates necessaires en V1 ou post-MVP.
