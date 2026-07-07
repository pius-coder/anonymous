# Feature 13 - Plan Scrum - Dashboard admin, audit et support

## Objectif sprint

Fournir les vues et actions admin/support/finance necessaires pour exploiter les sessions sans casser l integrite.

## Dependances

- Feature 02 RBAC.
- Features 04 a 12 selon vues activees.

## Gate documentaire obligatoire

Avant implementation :

1. Lire via Context7 Next.js pour architecture admin UI et data loading.
2. Lire via Context7 Hono pour middleware auth/role/requestId.
3. Lire via Context7 Prisma pour requetes admin, pagination et filtres audit.
4. Lire OWASP Authorization/Logging pour least privilege et audit.
5. Documenter la matrice de roles avant de coder les endpoints.

## User stories

### Story 13.1 - Dashboard admin

Etapes :

1. Creer `GET /v1/admin/dashboard`.
2. Ajouter KPIs sessions, paiements, inscriptions, live, incidents.
3. Creer page admin.
4. Filtrer selon role.

Tests :

- Admin voit dashboard.
- Support voit scope limite.
- Player refuse.

### Story 13.2 - Audit logs

Etapes :

1. Standardiser `AuditLog`.
2. Creer `GET /v1/admin/audit-logs`.
3. Filtrer par actor/action/target/requestId.
4. Interdire suppression audit.

Tests :

- Audit ecrit pour actions sensibles.
- Recherche par target.
- Suppression impossible.

### Story 13.3 - Support utilisateur

Etapes :

1. Creer `GET /v1/admin/support/users/:id`.
2. Afficher profil, registrations, paiements, wallet resume.
3. Masquer secrets provider.
4. Creer `SupportCase`.

Tests :

- Support voit donnees utiles.
- Secrets non visibles.
- Finance voit ledger sans controle gameplay.

### Story 13.4 - Actions sensibles

Etapes :

1. Creer workflow `admin.action-requested`.
2. Exiger role + reason.
3. Ajouter approval si action critique.
4. Ecrire before/after.

Tests :

- Reason obligatoire.
- Role insuffisant refuse.
- Audit complet.

## Definition of Done

- Criteres de tests a valider :
  - Tests RBAC par role admin/support/finance/super admin.
  - Tests integration dashboard et filtres audit.
  - Tests audit ecrit pour chaque action sensible.
  - Tests secrets provider masques.
  - Tests action sensible sans reason refusee.
  - Test E2E support : recherche utilisateur -> consultation sans fuite.
- Dashboard utilisable.
- Audit exploitable.
- Support peut aider sans secrets.
- Actions sensibles tracees.
