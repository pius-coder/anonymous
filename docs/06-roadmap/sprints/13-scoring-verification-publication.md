# Sprint 13 - Scoring verification publication

## Objectif

Formaliser score provisoire, verification admin, correction et publication explicite. Hors scope:
distribution financiere automatique non validee.

## User Stories Produit

| ID | Role | User story | Valeur produit | Priorite |
|---|---|---|---|---|
| US-13-01 | Joueur | En tant que joueur, je veux attendre la verification puis voir les resultats publies, afin de ne pas recevoir un score non officiel. | Separation provisoire/public. | Must |
| US-13-02 | Admin | En tant qu'admin, je veux verifier, corriger et publier les scores avec raison, afin de rendre les resultats officiels. | Publication explicite. | Must |
| US-13-03 | Observateur | En tant qu'observateur, je veux voir uniquement les resultats publics, afin de ne pas connaitre les scores provisoires. | No-leak scoring. | Must |
| US-13-04 | Finance | En tant que finance, je veux que les gains partent seulement apres publication validee, afin d'eviter des paiements injustifies. | Finance post-publication. | Should |

## Scenarios D'Acceptation Atomiques

| ID | Story | Surface | Given | When | Then | UML liee | Contrat/Test |
|---|---|---|---|---|---|---|---|
| AC-13-01 | US-13-01 | Attente joueur | Round termine, scores provisoires calcules | Le joueur clique `Voir mes resultats` | Message attente verification, aucun score visible | [scoring publication](../../03-architecture/uml/scoring-publication.md) | No provisional leak |
| AC-13-02 | US-13-02 | Table provisoire admin | Scores provisoires disponibles | L'admin clique `Voir scores provisoires` | Liste avec anomalies/evidence | [scoring publication](../../03-architecture/uml/scoring-publication.md) | `ListProvisionalScores` |
| AC-13-03 | US-13-02 | Correction score | Anomalie detectee | L'admin clique `Corriger le score` | Modal demande nouvelle valeur et raison | [sequences](../../03-architecture/uml/sequences.md) | `CorrectProvisionalScore` |
| AC-13-04 | US-13-02 | Correction score | Raison vide | L'admin clique `Valider correction` | Refus `AUDIT_REASON_REQUIRED` | [permissions](../../03-architecture/uml/permissions.md) | Audit test |
| AC-13-05 | US-13-02 | Publication | Scores verifies | L'admin clique `Publier les resultats` | `RESULTS_PUBLISHED`, scores visibles joueur | [state machines](../../03-architecture/uml/state-machines.md) | `PublishResults` |
| AC-13-06 | US-13-03 | Page observer | Resultats non publies | L'observateur clique `Voir resultats` | Resultats masques jusqu'a publication | [scoring publication](../../03-architecture/uml/scoring-publication.md) | Observer no-leak |
| AC-13-07 | US-13-04 | Job gains | Resultats non publies | Le systeme tente `Distribuer gains` | Job refuse ou en attente | [data flow](../../03-architecture/uml/data-flow.md) | Finance gate |

## Sources Docs Obligatoires

- Produit: [scoring](../../01-product/scoring-and-publication.md), [lifecycle](../../01-product/session-lifecycle.md)
- UX: [screen states](../../02-ux/screen-state-matrix.md), [admin command center](../../02-ux/admin-command-center.md)
- Architecture/UML: [scoring publication](../../03-architecture/uml/scoring-publication.md), [sequences](../../03-architecture/uml/sequences.md), [data flow](../../03-architecture/uml/data-flow.md)
- Couches: [domain](../../04-layers/domain.md), [persistence](../../04-layers/persistence.md), [observability](../../04-layers/observability.md)
- Workflow: [pipeline agentique](../../05-workflows/agentic-feature-pipeline.md), [protobuf change](../../05-workflows/protobuf-change.md)
- Tests: [strategie de test](../../05-workflows/test-strategy.md)

## Preuves Legacy

- `apps/api/src/results/results.ts` melangeait resultats, distribution et disputes.
- `handleRoundResolved` diffusait scores/ranks trop tot.
- Les docs exigent verification et publication explicite.

## UML Concernee

- Lire [scoring publication](../../03-architecture/uml/scoring-publication.md) et [state machines](../../03-architecture/uml/state-machines.md).
- Modifier si provisoire/publication/gains changent.

## Pipeline Par Couche

- Web: attente joueur, review admin, resultats publies.
- API/ConnectRPC: scoring review/publish commands.
- Game-server: produit score provisoire/evidence, ne publie pas officiel seul.
- Domaine: provisional, anomaly, correction, published version.
- DB: `ProvisionalScore`, `ScoreReview`, `PublishedScore`, `ResultVersion`.
- Worker: rewards seulement apres publication si decide.
- Notifications: resultats publies seulement.
- Observabilite: audit correction/publication, evidence hash.

## Contrats Protobuf Et ConnectRPC

`ProvisionalScoreReady`, `ListProvisionalScores`, `CorrectProvisionalScore`, `PublishResults`,
`ResultsPublished`, `GetPublishedResults`, erreurs `SCORE_NOT_VERIFIED`, `PUBLICATION_FORBIDDEN`.

## Data

Scores provisoires caches par audience, corrections versionnees, publication idempotente ou versionnee selon ADR.

## UI States

Waiting review, provisional table admin, anomaly, correction pending, published, publication blocked.

## Permissions

Admin autorise verifie/publie. Joueur lit apres publication. Support read-only sauf decision explicite.

## Erreurs Observabilite

Correction sans raison refusee, double publication, evidence missing, audit obligatoire.

## Tests Attendus

- Score provisoire invisible joueur.
- Correction auditee.
- Publication idempotente.
- Re-publication versionnee ou refusee selon decision.
- Resultats joueur apres publication seulement.

## Definition Of Done

- `ROUND_VERIFICATION -> RESULTS_PUBLISHED` passe uniquement par commande admin autorisee.
- Les gains ne sont pas distribues avant publication valide.

## Interdictions Specifiques

- Ne pas confondre finalisation technique de round et resultat officiel.
- Ne pas publier des rangs depuis le game-server sans couche review.
