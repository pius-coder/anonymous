# Feature 04 - Plan Scrum - Creation et configuration des sessions admin

## Objectif sprint

Permettre a un admin de creer, configurer, simuler, publier et annuler une session de jeu autonome.

## Dependances

- Feature 02 auth/RBAC.
- Sprint 0 modeles DB.

## Gate documentaire obligatoire

Avant implementation :

1. Lire via Context7 Prisma pour OCC, transactions et migrations.
2. Lire la documentation PostgreSQL sur isolation/retry si `Serializable` est utilise.
3. Lire via Context7 Hono pour routes admin, validation et erreurs.
4. Lire via Context7 Next.js pour formulaires/admin UI selon architecture retenue.
5. Documenter les formules XAF/bps, contraintes DB et pattern de versioning avant de coder.

## User stories

### Story 4.1 - Schema session admin

Etapes :

1. Finaliser `GameSession`, `SessionConfig`, `PrizeConfig`, `RoundConfig`.
2. Ajouter `configVersion`.
3. Ajouter champs prix, capacite, visibilite, status, planning.
4. Ajouter migration.

Tests :

- Contraintes min/max.
- Valeurs entieres XAF.
- Version incrementable.

### Story 4.2 - Creation DRAFT

Etapes :

1. Creer `POST /v1/admin/sessions`.
2. Verifier role admin.
3. Valider champs minimum.
4. Creer session en `DRAFT`.
5. Ecrire audit.

Tests :

- Admin cree DRAFT.
- Player refuse.
- Audit present.

### Story 4.3 - Simulation financiere

Etapes :

1. Creer `GET /v1/admin/sessions/:id/simulation`.
2. Calculer collecte brute.
3. Calculer frais estimes.
4. Calculer net, prize pool, commission.
5. Afficher risques marge negative.

Tests :

- Calcul XAF entier.
- Bps correct.
- Somme winner split = 10000.

### Story 4.4 - Publication et verrouillage

Etapes :

1. Creer `PATCH /v1/admin/sessions/:id`.
2. Creer `POST /v1/admin/sessions/:id/publish`.
3. Refuser publication incoherente.
4. Bloquer modification sensible si inscriptions payees.
5. Utiliser OCC `configVersion`.

Tests :

- Publish OK.
- Publish invalide refuse.
- Modification concurrente refusee.
- Modification apres paid refusee.

## Definition of Done

- Criteres de tests a valider :
  - Tests unitaires formules XAF/bps.
  - Tests integration creation DRAFT, simulation, publication, cancel.
  - Tests RBAC admin.
  - Tests concurrence `configVersion`/OCC.
  - Tests audit before/after/reason.
  - Test E2E admin : creer -> simuler -> publier session.
- Admin peut creer, simuler et publier une session.
- Les invariants economiques sont testes.
- Les actions sensibles sont auditees.
- Feature 01 peut afficher sessions publiees.
