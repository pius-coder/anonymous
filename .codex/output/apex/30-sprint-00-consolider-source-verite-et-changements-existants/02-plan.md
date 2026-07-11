# Step 02: Plan

**Task:** Consolider, valider, versionner et fusionner tous les changements existants avant le cycle des dix sprints du dashboard d'administration et d'arbitrage
**Started:** 2026-07-11T12:12:53Z

---

## Planning Progress

## Implementation Plan

### Overview

Consolider l'etat complet du worktree comme base fonctionnelle, corriger les incoherences directement introduites ou exposees par ce lot, verifier la migration et toutes les suites, puis pousser/fusionner cette branche avant de demarrer Sprint 1 depuis `main`.

### File Changes

#### `apps/web/e2e/feature-01-catalogue-public.spec.ts:58`

- Aligner la lecture catalogue sur le contrat courant `{ data: { sessions, total, page, limit } }`.
- Supprimer le skip involontaire du parcours detail provoque par l'ancien `data[]`.
- Conserver les assertions existantes de non-fuite des sessions privees et d'ouverture du detail.

#### `apps/web/src/app/(arena)/payments/[id]/status/page.tsx:34`

- Aligner le compte a rebours visible sur la reservation API de 15 minutes.
- Corriger le texte d'annulation afin de refleter le statut `CANCELLED` reel, sans promettre une inscription encore en attente.
- Conserver les etats retry provider et les contrats `payment`/`checkoutUrl` deja ajoutes.

#### `apps/web/src/app/(arena)/me/sessions/page.tsx:48`

- Terminer explicitement l'etat de chargement lorsqu'aucun utilisateur n'est authentifie.
- Rendre les categories deja declarees `cancelled` et `no-show` ou les normaliser vers les groupes visibles afin qu'aucune session ne disparaisse silencieusement.

#### `apps/web/src/app/(arena)/me/page.tsx:69`

- Terminer l'etat de chargement pour un visiteur non authentifie selon le meme pattern que l'historique.
- Ne pas modifier le contrat du profil authentifie.

#### `apps/web/src/services/sessions/types.ts:10`

- Aligner `CatalogueSession` avec la liste publique reelle en rendant le compteur coherent avec `registrationCount`/`registrationsCount`, sans imposer un champ absent.
- Reutiliser le champ officiel renvoye par l'API plutot que dupliquer un calcul client.

#### `apps/api/src/routes/public/sessions.ts:80`

- Exposer un compteur d'inscriptions nomme de facon identique au type web si le mapping existant ne le fait pas deja.
- Mettre a jour le test de contrat liste associe.

#### `apps/api/src/routes/__tests__/public-sessions.test.ts:39`

- Verifier l'enveloppe paginee et le compteur d'inscriptions du contrat public.
- Conserver les cas `PUBLIC`, `ACTIVE`, capacite et liste vide.

#### `apps/web/src/__tests__/payments.test.ts:1`

- Ajouter/ajuster les assertions statiques ou de logique sur la fenetre de 15 minutes et le texte d'annulation.

#### `apps/web/src/__tests__/pages.test.ts:1`

- Couvrir l'arret du loading pour les pages profil/historique sans session authentifiee.
- Verifier que les categories d'historique ne sont pas silencieusement ignorees.

#### `packages/db/prisma/migrations/20260710110000_extend_active_registration_unique/migration.sql:1`

- Conserver le SQL de l'index unique partiel et verifier son application apres toutes les migrations existantes sur une base PostgreSQL vide.
- Verifier que l'index final contient `CREATED`, `PAYMENT_PENDING`, `PAID`, `CHECKED_IN`, `IN_ROOM`.

#### `docs/admin-arbitrage/*`, `docs/plan/README.md`, `docs/prd/features/README.md`

- Conserver sans reduction la source de verite, les 15 diagrammes et le plan de dix sprints.
- Verifier formatage Markdown et liens relatifs.

#### `docs/audit-*` et anciens fichiers `audit-*` racine

- Preserver le deplacement bit a bit vers `docs/`.
- Ne pas restaurer les doublons a la racine.

#### `.codex/output/apex/25-*` a `.codex/output/apex/30-*`

- Versionner les journaux APEX et captures existants demandes par le workflow save.
- Exclure tout secret literal; le scan actuel n'en a trouve aucun.

### Validation Strategy

- `pnpm exec prettier --check` sur les fichiers touches et la source documentaire.
- `pnpm typecheck`.
- `pnpm lint` avec zero erreur; documenter les warnings historiques eventuels.
- `pnpm test`.
- `pnpm build`.
- Test Playwright catalogue avec services demarres, afin de confirmer que le detail n'est plus skippe.
- Validation de toutes les migrations depuis une base PostgreSQL vide isolee.
- `git diff --check` et scan de secrets avant indexation finale.

### Acceptance Criteria Mapping

- AC1 : indexation finale de tout le worktree, audits, docs, APEX et migration.
- AC2 : corrections E2E, paiement, loading anonyme et contrat catalogue dans les fichiers ci-dessus.
- AC3 : execution des migrations sur PostgreSQL vide et inspection de l'index partiel.
- AC4 : commandes typecheck/lint/test/build, format et Playwright.
- AC5 : commit, push, PR, checks/mergeabilite, merge, retour `main`, pull ff-only.
- AC6 : source de verite et plan APEX versionnes avant Sprint 1.

### Deferred To Owning Sprints

- `roundNum: 1`, pause/reprise room, control lease, event store, panels famille, review et result versions sont volontairement laisses aux Sprints 1-10, car ils demandent leurs propres migrations, contrats et tests.
- La route reset-password absente n'est pas creee dans ce lot: elle exige un workflow auth complet hors de la consolidation.

### Risks

- Le lot est large; les validations globales et l'examen adversarial sont obligatoires avant commit.
- Les APEX screenshots augmentent la taille de la PR mais font partie de la demande explicite de commit de tous les changements.
- L'E2E depend des services locaux; en cas de blocage d'infrastructure, le motif exact sera consigne et aucun skip artificiel ne sera ajoute.

---

## Step Complete

**Status:** Complete (auto-approved)
**Files planned:** 10 groupes de fichiers produit + documentation/APEX
**Tests planned:** API, web, Playwright, migration vide, validations globales
**Next:** step-03-execute.md
