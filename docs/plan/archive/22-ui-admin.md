# Feature 22 - UI admin operations

## Objectif sprint

Transformer le dashboard admin minimal en interface operations complete branchee sur les routes admin existantes.

## Gate documentaire obligatoire

1. Relire les contrats `apps/api/src/routes/admin-*`.
2. Context7 Next.js 16 pour formulaires admin, optimistic UI et revalidation.
3. Verifier RBAC et erreurs API par role.

## User stories

- Dashboard operations avec KPIs, incidents, support, paiements et wallets.
- Creation/configuration/simulation/publication de sessions.
- Live operations : pause, resume, finalize, audit.
- Support : recherche joueur, registrations, paiements, notifications.

## Definition of Done

Admin peut configurer, publier, superviser et auditer une session sans acces direct base de donnees. RBAC teste par role.
