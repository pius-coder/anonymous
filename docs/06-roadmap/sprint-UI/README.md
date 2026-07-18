# Sprint UI - Interface Strategy

Ce dossier definit les representations d'interface cible pour `apps/web`.
Il complete les fiches sprint sans les remplacer.

## Objectif

Transformer les user stories des sprints 00 a 19 en surfaces UI concretes:

- routes et layouts par acteur;
- inventaire des ecrans;
- wireframes Markdown basse fidelite;
- composants transverses;
- etats obligatoires: loading, empty, error, denied, stale, reconnecting, success;
- regles no-leak et RBAC visibles;
- mapping sprint -> user stories -> interfaces.

## Regles

- L'UI ne calcule pas les scores, ne valide pas les autorisations finales et ne lit jamais la DB directement.
- Les projections joueur, admin, observer, support et finance sont separees.
- Les scores provisoires, private states de mini-jeux, secrets provider et donnees paiement sensibles ne sont jamais visibles hors audience autorisee.
- Une notification, un timer ou un worker ne demarre jamais une partie active et ne publie jamais un score.
- Toute action admin sensible doit demander confirmation ou raison lorsque le sprint l'exige.

## Documents

| Fichier                                                                                | Role                                                                               |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [00-ui-foundation.md](00-ui-foundation.md)                                             | Principes generaux, acteurs, layouts, recherche UX appliquee.                      |
| [01-route-map.md](01-route-map.md)                                                     | Routes conceptuelles et garde d'acces par acteur.                                  |
| [02-screen-inventory.md](02-screen-inventory.md)                                       | Liste des ecrans `apps/web` a prevoir.                                             |
| [03-actor-journeys.md](03-actor-journeys.md)                                           | Parcours UI de bout en bout par acteur.                                            |
| [04-wireframes-player.md](04-wireframes-player.md)                                     | Representations joueur public, participation, paiement, lobby, live et resultats.  |
| [05-wireframes-admin.md](05-wireframes-admin.md)                                       | Representations command center, preparation, round, scoring et publication.        |
| [06-wireframes-observer-support-finance.md](06-wireframes-observer-support-finance.md) | Representations observer, support, compliance, audit, finance et notifications.    |
| [07-payments-finance-workers.md](07-payments-finance-workers.md)                       | Paiements, wallet, ledger, reconciliation, gains, workers et statuts de livraison. |
| [08-sprint-user-story-interface-matrix.md](08-sprint-user-story-interface-matrix.md)   | Mapping de tous les sprints vers les surfaces UI.                                  |
| [09-components-states-contracts.md](09-components-states-contracts.md)                 | Composants communs, etats, contrats/projections attendues.                         |
| [10-validation-checklist.md](10-validation-checklist.md)                               | Checklist avant implementation UI et avant recette.                                |

## Sources locales

- [sprint-plan.md](../sprint-plan.md)
- [use-case-coverage.md](../use-case-coverage.md)
- [actors-and-permissions.md](../../01-product/actors-and-permissions.md)
- [session-lifecycle.md](../../01-product/session-lifecycle.md)
- [player-journey.md](../../01-product/player-journey.md)
- [admin-journey.md](../../01-product/admin-journey.md)
- [readonly-observer.md](../../01-product/readonly-observer.md)
- [scoring-and-publication.md](../../01-product/scoring-and-publication.md)
- [information-architecture.md](../../02-ux/information-architecture.md)
- [screen-state-matrix.md](../../02-ux/screen-state-matrix.md)
- [player-web.md](../../04-layers/player-web.md)
- [admin-web.md](../../04-layers/admin-web.md)

## Sources de recherche externes

- [W3C WCAG 2.2 - Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html): statuts loading, success, retry, progress et erreurs annoncables sans changement de contexte.
- [W3C WCAG 2.2 - Error Identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html): erreurs de formulaires et commandes avec cause visible et correction possible.
- [GOV.UK Design System - Error message](https://design-system.service.gov.uk/components/error-message/): redaction d'erreurs courtes, situees pres du champ ou de l'action bloquee.
- [Stripe Payment Intents lifecycle](https://docs.stripe.com/payments/paymentintents/lifecycle): modelisation UI des etats paiement `pending`, `processing`, `succeeded`, `failed`, `requires_action`.
- [Stripe Security](https://docs.stripe.com/security): separation des donnees sensibles, roles limites, audit logs et restriction d'acces.
- [Dashboard Design Patterns](https://arxiv.org/abs/2205.00757): patterns de dashboards pour vues admin, finance, support et supervision live.
