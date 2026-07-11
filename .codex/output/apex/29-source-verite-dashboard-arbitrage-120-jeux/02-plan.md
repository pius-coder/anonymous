# Step 02: Plan

**Task:** Creer la source de verite produit et technique pour le dashboard d'administration/arbitrage couvrant 120 mini-jeux, edge cases, multi-admin, registre evenementiel et diagrammes
**Started:** 2026-07-11T06:52:57Z

---

## Planning Progress

_Implementation plan will be written here..._

## Implementation Plan

### Overview

Creer un dossier `docs/admin-arbitrage/` comme source de verite durable pour la refonte du dashboard d'administration/arbitrage. Les fichiers doivent etre assez explicites pour etre relus apres compaction et guider l'implementation APEX par sprints.

### File changes

#### `docs/admin-arbitrage/README.md` (new)

- Definir le statut de source de verite.
- Lister les fichiers a relire apres compaction.
- Lier les PRD et docs source existants.
- Poser les non-negociables.

#### `docs/admin-arbitrage/01-reglement-arbitrage.md` (new)

- Formaliser le reglement en cinq niveaux.
- Definir les neuf profils d'arbitrage P1-P9.
- Definir `qualificationMode`, `resultCardinality`, `winnersCountCompatibility`.
- Definir les regles par famille : Solo, Duel, Alliance, Equipe, Survie, Role cache.
- Formaliser multi-admin, `SessionControlLease`, double approbation.
- Formaliser registre evenementiel et resultats officiels.

#### `docs/admin-arbitrage/02-user-stories-dashboard.md` (new)

- Creer les epics A-K.
- Decrire user stories et criteres d'acceptation.
- Couvrir reglement, program builder, lobby, multi-admin, live control, panels par famille, incidents, replay, resultats, communication, observabilite.

#### `docs/admin-arbitrage/03-edge-cases.md` (new)

- Persist edge cases par categorie.
- Definir statuts incident, decisions possibles, gravite, politique par defaut.
- Couvrir creation session, identite, deconnexion, latence, qualification, familles, vote/chat, hasard, anti-cheat, multi-admin, journal, pause, arbitrage, publication.

#### `docs/admin-arbitrage/04-ui-jeux-dashboard.md` (new)

- Definir contrat UI dashboard et jeux.
- Cadrer Admin A, Admin B, Support, player monitor, round timeline.
- Cadrer UI par famille et copies interdites/recommandees.

#### `docs/admin-arbitrage/05-diagrammes.md` (new)

- Ajouter les 15 diagrammes demandes.
- Utiliser Mermaid quand adapte et ASCII pour wireframes.

#### `docs/admin-arbitrage/06-plan-apex-implementation.md` (new)

- Definir ordre de reprise apres compaction.
- Definir sprints d'implementation.
- Definir validations et Definition of Done.

### Validation strategy

- Verifier presence des fichiers.
- Verifier que les 15 diagrammes sont presents.
- Verifier les sections epics/user stories.
- Verifier `format:check` sur les Markdown crees si le formatter du repo l'accepte.

## Step complete

Status: Complete
