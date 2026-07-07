# Feature 12 - Resultats, gains et distribution

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Enregistrer les resultats officiels, determiner les gagnants, calculer les credits internes et publier le recap.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Cloturer une session avec un point officiel unique et une distribution idempotente, comprehensible et auditable. |
| Target users | joueurs, gagnants, admins, support, finance |
| Business value | Critique: moment de confiance ou joueurs comprennent victoire, defaite, elimination et credits. |
| Technical complexity | Tres elevee: calcul financier, ledger, audit, idempotence, litiges, correction post-session. |
| Risk level | Tres eleve: mauvais calcul, double credit, distribution prematuree, litige financier/legal. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Finalisation officielle session.
- Calcul GameResult et PrizeDistribution.
- Credit wallet interne via ledger.
- Publication resultats joueur/admin.
- Correction post-session via workflow audite.

## Parcours et workflows

1. Game-engine finalise derniers rounds et produit classement officiel.
2. Admin/systeme appelle finalize: session FINISHED, results computed, outbox distribution.
3. Worker credite chaque gagnant avec idempotencyKey session:winner:prize.
4. Publication recap apres distribution ou statut contestable selon policy.
5. Correction demande role + raison + audit; pas de modification silencieuse.

## Logiques metier et invariants

- Resultats calcules par game-engine puis persistés.
- Gains credites seulement apres finalisation officielle.
- Credit wallet et ledger atomiques.
- Commission organisation tracee.
- Distribution idempotente.
- Correction post-session via audit/support.
- Aucun cash-out V1.
- winnerSplitBps somme 10000; reliquat de division entiere selon politique documentee.

## Donnees principales

- `GameResult`
- `RoundResult`
- `PrizeDistribution`
- `LedgerEntry`
- `Wallet`
- `CommissionRecord`
- `DisputeWindow`
- `AuditLog`

## API et contrats

- `POST /v1/admin/sessions/:id/finalize`
- `GET /v1/sessions/:id/results`
- `GET /v1/admin/sessions/:id/results`
- `POST /v1/admin/sessions/:id/correction-request`

Erreurs et cas limites a normaliser :

- `409_SESSION_NOT_READY_TO_FINALIZE`
- `409_RESULTS_ALREADY_FINALIZED`
- `409_DISTRIBUTION_ALREADY_DONE`
- `422_TIE_POLICY_REQUIRED`
- `403_CORRECTION_ROLE_REQUIRED`

## Evenements et jobs

- `session.finished`
- `results.computed`
- `credits.distribution-started`
- `credits.distributed`
- `results.published`

## Securite, conformite et audit

- Idempotency per distribution.
- Ledger required for every credit.
- Finalized results immutable except correction workflow.
- Audit corrections and admin actions.
- Cash-out disabled in V1.

## Criteres d acceptation

- Distribution repetee ne double pas credits.
- Resultats figes apres finalisation.
- Correction necessite role + raison + audit.
- Rounding remainder policy stable.
- Worker crash entre gagnants reprend sans double credit.
- No cash-out V1.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `session_finalize_ms`
- `prize_credit_jobs`
- `ledger_entries_per_finalize`
- `credit_retry_count`
- `duplicate_prize_prevented_count`
- `result_dispute_count`

## Dependances fonctionnelles

- Feature 10 game engine
- Feature 07 wallet/ledger
- Feature 13 admin/support
- Feature 15 compliance

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- deep-research-report.md formulas XAF/bps and distribution
- BRAINSTORMING.md PrizeDistribution/GameResult
- Prisma/PostgreSQL transactions
- BullMQ jobId deduplication

References officielles techniques :

- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt
- PostgreSQL transaction isolation and retry expectations: https://www.postgresql.org/docs/current/transaction-iso.html
- BullMQ jobs, delayed jobs, retries and jobId deduplication: https://docs.bullmq.io/readme.md
- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt
- OWASP Authorization / API Security / Business Logic / Logging guidance: https://cheatsheetseries.owasp.org/

## Questions ouvertes

- Tie-break default.
- Dispute window duration.
- Rounding remainder allocation.
- When to publish if distribution partially delayed.
