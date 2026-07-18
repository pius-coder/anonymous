# Sprint 05 - Acquisition publique et planification

## Objectif

Reconstruire l'acquisition publique et la configuration admin sans demarrer le live. Hors scope: inscription
joueur, paiement et round actif.

## User Stories Produit

| ID | Role | User story | Valeur produit | Priorite |
|---|---|---|---|---|
| US-05-01 | Joueur | En tant que joueur, je veux consulter les parties publiees et leur detail, afin de choisir ou m'inscrire. | Acquisition publique claire. | Must |
| US-05-02 | Admin | En tant qu'admin, je veux creer, configurer, publier et planifier une partie, afin de preparer le jeu sans le demarrer. | Planification sans live automatique. | Must |
| US-05-03 | Worker/Systeme | En tant que systeme, je veux rappeler une preparation planifiee, afin d'aider l'organisation sans lancer la partie. | Timers non competitifs. | Should |

## Scenarios D'Acceptation Atomiques

| ID | Story | Surface | Given | When | Then | UML liee | Contrat/Test |
|---|---|---|---|---|---|---|---|
| AC-05-01 | US-05-01 | Catalogue public | Au moins une partie publiee | Le joueur clique `Voir les parties` | Liste cartes partie avec CTA par etat | [state machines](../../03-architecture/uml/state-machines.md) | `ListPublicParties` UI/integration |
| AC-05-02 | US-05-01 | Carte partie | Partie visible par code | Le joueur clique `Voir details` | Detail public sans champs admin | [data flow](../../03-architecture/uml/data-flow.md) | `GetPublicParty` no-leak |
| AC-05-03 | US-05-01 | Detail partie | Participation pas encore livree | Le joueur clique `S'inscrire` | CTA dirige vers feature participation ou affiche indisponible | [state machines](../../03-architecture/uml/state-machines.md) | Test CTA gated |
| AC-05-04 | US-05-02 | Admin parties | Role admin | L'admin clique `Creer une partie` | Brouillon `DRAFT` cree | [state machines](../../03-architecture/uml/state-machines.md) | `CreatePartyDraft` |
| AC-05-05 | US-05-02 | Form configuration | Champs capacite/prix/programme remplis | L'admin clique `Valider la configuration` | Configuration validee ou erreurs par champ | [domains](../../03-architecture/uml/domains.md) | `ValidatePartyConfig` |
| AC-05-06 | US-05-02 | Ecran publication | Gates compliance OK | L'admin clique `Publier` | Partie visible public, audit cree | [permissions](../../03-architecture/uml/permissions.md) | `PublishParty` + RBAC |
| AC-05-07 | US-05-02 | Ecran publication | Gate compliance bloque | L'admin clique `Publier` | Publication refusee avec message exploitable | [permissions](../../03-architecture/uml/permissions.md) | Test compliance blocked |
| AC-05-08 | US-05-02 | Planification | Partie validee | L'admin clique `Planifier` | Transition `DRAFT/SCHEDULED`, aucun round actif | [state machines](../../03-architecture/uml/state-machines.md) | `ScheduleParty` no auto start |
| AC-05-09 | US-05-03 | Scheduler | Heure planifiee atteinte | Le systeme declenche `Rappel preparation` | Rappel seulement, pas `ACTIVE_ROUND` | [state machines](../../03-architecture/uml/state-machines.md) | Test timer interdit |

## Sources Docs Obligatoires

- Produit: [admin journey](../../01-product/admin-journey.md), [use cases](../../01-product/use-cases.md), [lifecycle](../../01-product/session-lifecycle.md)
- UX: [information architecture](../../02-ux/information-architecture.md), [screen states](../../02-ux/screen-state-matrix.md)
- Architecture/UML: [target architecture](../../03-architecture/target-architecture.md), [state machines](../../03-architecture/uml/state-machines.md), [permissions](../../03-architecture/uml/permissions.md)
- Couches: [player web](../../04-layers/player-web.md), [admin web](../../04-layers/admin-web.md), [application use cases](../../04-layers/application-use-cases.md)
- Workflow: [pipeline agentique](../../05-workflows/agentic-feature-pipeline.md), [protobuf change](../../05-workflows/protobuf-change.md)
- Tests: [strategie de test](../../05-workflows/test-strategy.md)

## Preuves Legacy

- Routes publiques legacy: `/v1/public/sessions`, `/session/[code]`, catalogue.
- Routes admin sessions trop chargees: creation, publication, ouverture, simulation, lancement.
- Compliance gates pouvaient bloquer la publication sans workflow exploitable.

## UML Concernee

- Lire [state machines](../../03-architecture/uml/state-machines.md) et [sequences](../../03-architecture/uml/sequences.md).
- Modifier si publication ou planification change une transition lifecycle.

## Pipeline Par Couche

- Web: catalogue public, detail partie, etats loading/empty/error/inaccessible.
- API/ConnectRPC: commands/queries minces separees public/admin.
- Game-server: aucun demarrage ni room live.
- Domaine: transitions `DRAFT -> SCHEDULED`, publication et gates.
- DB: `Party`, configuration, visibilite, audit publication.
- Worker: rappels de preparation seulement.
- Notifications: aucune annonce preparation avant Sprint 08.
- Observabilite: audit creation, validation, publication, schedule.

## Contrats Protobuf Et ConnectRPC

`ListPublicParties`, `GetPublicParty`, `CreatePartyDraft`, `ValidatePartyConfig`, `PublishParty`,
`ScheduleParty`, erreurs `PARTY_NOT_VISIBLE`, `COMPLIANCE_BLOCKED`, `INVALID_CONFIG`.

## Data

Read models publics separes des read models admin. La capacite, le prix et le programme restent
configures sans creer de participation.

Compliance minimale avant sprint 18: sprint 05 ne livre pas le workflow support/compliance complet. Il doit
se limiter a un gate exploitable (`OK`, `BLOCKED`, `WAIVED` si decision explicite), une raison publique
stable, et un audit de publication/refus. Les incidents, escalades et politiques avancees restent sprint 18.

## UI States

Catalogue empty, partie inaccessible, brouillon invalide, publication bloquee, schedule confirme.

## Permissions

Public lit seulement les parties publiees. Admin publie/planifie. Support lit sans publier.

## Erreurs Observabilite

Messages exploitables pour gates compliance, code/id introuvable, configuration incomplete.

## Tests Attendus

- Catalogue/detail public.
- Creation/validation/publication admin.
- Compliance bloque avec message exploitable.
- Route code/id resolue sans confusion.
- Anti-regression: planifier ne demarre pas `ACTIVE_ROUND`.

## Definition Of Done

- Le joueur peut decouvrir une partie publiee.
- L'admin peut planifier sans lancer une manche active.
- Les contrats existent avant les endpoints.

## Interdictions Specifiques

- Ne pas reintroduire `GameSessionStatus` legacy sans mapping v0.1.
- Ne pas hardcoder des champs admin `durationMs: 0` ou `policy: null`.
