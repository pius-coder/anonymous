# Sprint 12 - Admin command center

## Objectif

Remplacer les surfaces admin fragmentees par un centre de controle separe du parcours joueur. Hors scope:
controle direct du client joueur.

## User Stories Produit

| ID | Role | User story | Valeur produit | Priorite |
|---|---|---|---|---|
| US-12-01 | Admin | En tant qu'admin, je veux superviser participants, connexions, round et incidents, afin de prendre les bonnes decisions. | Command center exploitable. | Must |
| US-12-02 | Admin | En tant qu'admin, je veux executer les commandes sensibles avec confirmation, afin d'eviter les actions accidentelles. | Decisions explicites. | Must |
| US-12-03 | Support | En tant que support, je veux lire timeline et snapshots autorises, afin d'aider sans publier ni lancer. | Support read-only. | Must |
| US-12-04 | Joueur | En tant que joueur, je veux que l'admin ne puisse pas cliquer a ma place, afin de garder l'equite du jeu. | Pas de controle direct joueur. | Must |

## Scenarios D'Acceptation Atomiques

| ID | Story | Surface | Given | When | Then | UML liee | Contrat/Test |
|---|---|---|---|---|---|---|---|
| AC-12-01 | US-12-01 | Command center | Partie en preparation | L'admin clique `Participants` | Readiness, presence et anomalies visibles | [data flow](../../03-architecture/uml/data-flow.md) | `GetAdminGameState` |
| AC-12-02 | US-12-01 | Command center | Round actif | L'admin clique `Connexions` | Rejets, reconnect et desync visibles | [realtime flow](../../03-architecture/uml/realtime-flow.md) | Admin state test |
| AC-12-03 | US-12-02 | Command center | Absents detectes | L'admin clique `Lancer malgre absents` | Modal demande raison; action auditee | [permissions](../../03-architecture/uml/permissions.md) | `ExecuteAdminCommand` |
| AC-12-04 | US-12-02 | Verification scores | Scores verifies | L'admin clique `Publier les resultats` | Publication seulement si permission et confirmation | [scoring publication](../../03-architecture/uml/scoring-publication.md) | RBAC publish |
| AC-12-05 | US-12-03 | Timeline support | Role support | Le support clique `Voir timeline` | Evenements lisibles, boutons lancer/publier absents | [permissions](../../03-architecture/uml/permissions.md) | Support no-command |
| AC-12-06 | US-12-04 | Snapshot joueur | Admin consulte un joueur | L'admin clique `Voir joueur` | Vue lecture seule; aucun bouton `Jouer a sa place` | [sequences](../../03-architecture/uml/sequences.md) | No direct control |

## Sources Docs Obligatoires

- Produit: [admin journey](../../01-product/admin-journey.md), [actors](../../01-product/actors-and-permissions.md), [scoring](../../01-product/scoring-and-publication.md)
- UX: [admin command center](../../02-ux/admin-command-center.md), [screen states](../../02-ux/screen-state-matrix.md)
- Architecture/UML: [permissions](../../03-architecture/uml/permissions.md), [sequences](../../03-architecture/uml/sequences.md), [scoring publication](../../03-architecture/uml/scoring-publication.md)
- Couches: [admin web](../../04-layers/admin-web.md), [application use cases](../../04-layers/application-use-cases.md), [observability](../../04-layers/observability.md)
- Workflow: [pipeline agentique](../../05-workflows/agentic-feature-pipeline.md), [layer canvas](../../05-workflows/layer-change-canvas.md)
- Tests: [strategie de test](../../05-workflows/test-strategy.md)

## Preuves Legacy

- `admin/sessions.ts`, `admin/live.ts`, `admin/results.ts`, `admin/operations.ts` etaient separes mais couples.
- `HEAD:docs/admin-arbitrage/05-diagrammes.md` decrivait Admin A, Admin B, Support, leases et decisions.

## UML Concernee

- Lire [permissions](../../03-architecture/uml/permissions.md), [sequences](../../03-architecture/uml/sequences.md) et [scoring publication](../../03-architecture/uml/scoring-publication.md).
- Modifier si roles, leases ou commandes admin changent.

## Pipeline Par Couche

- Web: vue globale, participants, connexions, timeline, incidents, commandes.
- API/ConnectRPC: services admin separes des services joueur.
- Game-server: supervision state views, aucune commande UI directe vers joueur.
- Domaine: policies admin/support/finance.
- DB: audit commands, events timeline.
- Worker: expose job statuses si pertinent.
- Notifications: annonce via service dedie.
- Observabilite: audit obligatoire, metrics commandes/refus.

## Contrats Protobuf Et ConnectRPC

`GetAdminGameState`, `ListAdminEvents`, `AcquireAdminControlLease`, `ExecuteAdminCommand`,
`GetPlayerReadonlySnapshot`, erreurs `ADMIN_LEASE_REQUIRED`, `COMMAND_FORBIDDEN`, `STALE_STATE`.

## Data

Timeline, audit log, command records, snapshots individuels filtres.

## UI States

Loading, donnees obsoletes, perte live, lease absent, confirmation absents, publication bloquee par anomalies.

## Permissions

Admin principal commande/publie. Assistant/support limites selon decision. Finance separee.

## Erreurs Observabilite

Commande refusee, role insuffisant, stale state, audit avec acteur/raison/resultat.

## Tests Attendus

- RBAC admin/support/finance.
- Commande refusee sans role.
- Timeline alimentee.
- Observer individuel sans controle client.
- Audit log cree.

## Definition Of Done

- Supervision, decision et publication ont des contrats separes.
- L'admin ne controle jamais directement le client joueur.

## Interdictions Specifiques

- Ne pas refaire un composant admin live massif.
- Ne pas donner au support une commande de publication sans decision RBAC.
