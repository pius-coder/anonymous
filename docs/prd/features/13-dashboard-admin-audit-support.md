# Feature 13 - Dashboard admin live, audit et support operations

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Permettre aux admins/support/finance de surveiller, auditer et operer sans casser l integrite financiere ou gameplay.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Donner les vues et actions minimales pour exploiter sessions, paiements, joueurs, incidents, resultats, wallet et audit. |
| Target users | admins, support, operations, finance, super admin |
| Business value | Tres elevee: indispensable pour paiements, litiges, live et operations. |
| Technical complexity | Elevee: nombreux etats, roles, filtres, actions sensibles et journaux. |
| Risk level | Eleve: abus de privileges, erreurs support, action admin non tracee, fuite de secrets provider. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Dashboard sessions/live/paiements/registrations/wallet/resultats.
- Recherche utilisateur/support.
- AuditLog consultable.
- Actions sensibles avec role + reason + audit.
- Workflow approval pour operations critiques.

## Parcours et workflows

1. Support lit profil, registrations, paiements sans secrets provider.
2. Finance reconcilie paiement/refund selon workflow audite.
3. Admin publie/cancel/pause session avec reason.
4. Super admin execute corrections exceptionnelles avec before/after et approval si necessaire.

## Logiques metier et invariants

- Actions sensibles exigent role, raison et audit.
- Admins voient sessions, inscrits, paiements, statuts, resultats, rentabilite.
- Operations manuelles limitees et tracees.
- Resultats/gains non modifiables sans workflow correction.
- Vues support suffisantes sans fuite de secrets.
- Finance voit paiements/ledger mais pas controle gameplay.

## Donnees principales

- `AdminView`
- `AuditLog`
- `SupportCase`
- `PaymentTransaction`
- `WalletLedgerView`
- `IncidentLog`
- `AdminActionApproval`

## API et contrats

- `GET /v1/admin/dashboard`
- `GET /v1/admin/audit-logs`
- `GET /v1/admin/support/users/:id`
- `POST /v1/admin/incidents`
- `POST /v1/admin/actions/:id/approve`
- `POST /v1/admin/payments/:id/reconcile`

Erreurs et cas limites a normaliser :

- `403_ROLE_REQUIRED`
- `400_REASON_REQUIRED`
- `409_ACTION_NOT_APPROVABLE`
- `403_SECRET_NOT_VISIBLE`
- `409_RESULT_FINALIZED`

## Evenements et jobs

- `admin.action-requested`
- `admin.action-approved`
- `support.case-created`
- `audit.log-written`
- `incident.created`

## Securite, conformite et audit

- Least privilege and deny by default.
- Per-action authorization server-side.
- Audit includes actor/action/target/before/after/reason/IP/user-agent/requestId.
- Never expose api keys, webhook secrets or provider raw secrets.
- No direct balance overwrite.

## Criteres d acceptation

- Role matrix positive/negative.
- Every sensitive action writes AuditLog.
- Support cannot see provider secrets.
- Finance cannot pause gameplay unless role allows.
- Audit search by target/requestId.
- Repeated admin action idempotent or rejected.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `admin_mutation_count_by_role`
- `manual_reconciliation_count`
- `refund_volume_xaf`
- `audit_write_failure`
- `support_case_count`
- `admin_action_denied_count`

## Dependances fonctionnelles

- Feature 02 RBAC
- Feature 04 admin sessions
- Feature 06 payments
- Feature 07 wallet
- Feature 09 live
- Feature 12 results
- Feature 15 compliance

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- OWASP least privilege/authorization/logging
- Hono requestId middleware
- Next.js server-only data access
- deep-research-report.md admin operations

References officielles techniques :

- Next.js App Router, Authentication, Data Security, Metadata: https://nextjs.org/docs/llms.txt
- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt
- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt
- PostgreSQL transaction isolation and retry expectations: https://www.postgresql.org/docs/current/transaction-iso.html
- OWASP Authorization / API Security / Business Logic / Logging guidance: https://cheatsheetseries.owasp.org/

## Questions ouvertes

- Exact role matrix V1.
- Which actions require approval vs direct execution.
- Support SLA and incident taxonomy.
- Retention duration for audit logs.
