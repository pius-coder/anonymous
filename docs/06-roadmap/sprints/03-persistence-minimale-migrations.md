# Sprint 03 - Persistence minimale et migrations

## Objectif

Recomposer le schema durable par domaines valides au lieu de restaurer le schema massif HEAD. Hors scope:
exposer Prisma comme contrat reseau.

## User Stories Produit

| ID | Role | User story | Valeur produit | Priorite |
|---|---|---|---|---|
| US-03-01 | Admin | En tant qu'admin, je veux retrouver mes brouillons et configurations apres refresh, afin de preparer une partie sans perte. | Les decisions admin sont persistantes. | Must |
| US-03-02 | Joueur | En tant que joueur, je veux que mon inscription soit unique et durable, afin de ne pas perdre ma place. | La participation est fiable. | Must |
| US-03-03 | Finance | En tant que finance, je veux un ledger coherent, afin de tracer chaque mouvement d'argent. | Les soldes sont auditables. | Must |
| US-03-04 | Observateur | En tant qu'observateur, je veux une projection sans donnees sensibles, afin de suivre sans fuite. | Les read models filtrent par audience. | Must |
| US-03-05 | Worker/Systeme | En tant que systeme, je veux revendiquer un job une seule fois, afin d'eviter les doublons de notification ou paiement. | Les jobs sont concurrents et idempotents. | Should |

## Scenarios D'Acceptation Atomiques

| ID | Story | Surface | Given | When | Then | UML liee | Contrat/Test |
|---|---|---|---|---|---|---|---|
| AC-03-01 | US-03-01 | Admin parties | Role admin, DB vide possible | L'admin clique `Creer une partie` | Partie durable creee avec audit | [domains](../../03-architecture/uml/domains.md) | Integration DB |
| AC-03-02 | US-03-01 | Configuration partie | Brouillon modifie | L'admin clique `Enregistrer le brouillon` | Donnees relues sans perte apres refresh | [data flow](../../03-architecture/uml/data-flow.md) | Repository integration |
| AC-03-03 | US-03-02 | Detail partie | Partie ouverte, capacite disponible | Le joueur clique `S'inscrire` | Participation unique joueur/partie, visible apres refresh | [domains](../../03-architecture/uml/domains.md) | Test contrainte unique |
| AC-03-04 | US-03-03 | Paiement wallet | Transaction idempotency key nouvelle | La finance clique `Valider le debit wallet` | Ledger coherent avec balance | [data flow](../../03-architecture/uml/data-flow.md) | Test idempotence |
| AC-03-05 | US-03-04 | Page observer | Permission observer | L'observateur clique `Observer la partie` | Projection sans fields paiement/email | [realtime flow](../../03-architecture/uml/realtime-flow.md) | Test no-leak |
| AC-03-06 | US-03-05 | File de jobs | Job pending | Le systeme revendique `Prochain job notification` | Un seul worker obtient le job | [data flow](../../03-architecture/uml/data-flow.md) | Test concurrence |
| AC-03-07 | US-03-01 | Commande sensible | Action sensible | L'admin clique `Publier la partie` | Actor, entity, reason, correlationId persistés | [permissions](../../03-architecture/uml/permissions.md) | Test audit |

## Sources Docs Obligatoires

- Produit: [lifecycle](../../01-product/session-lifecycle.md), [scoring](../../01-product/scoring-and-publication.md)
- UX: [screen states](../../02-ux/screen-state-matrix.md), [admin command center](../../02-ux/admin-command-center.md)
- Architecture/UML: [data model](../../03-architecture/data-model.md), [domaines UML](../../03-architecture/uml/domains.md), [data flow](../../03-architecture/uml/data-flow.md)
- Couches: [persistence](../../04-layers/persistence.md), [application use cases](../../04-layers/application-use-cases.md)
- Workflow: [pipeline agentique](../../05-workflows/agentic-feature-pipeline.md), [database change](../../05-workflows/database-change.md)
- Tests: [strategie de test](../../05-workflows/test-strategy.md)

## Preuves Legacy

- `HEAD:packages/db/prisma/schema.prisma` couvrait identity, live, rounds, payments, wallet, support, audit et anti-cheat.
- Le probleme etait le melange de concepts, pas l'ambition du modele.

## UML Concernee

- Lire [domaines](../../03-architecture/uml/domains.md) et [data flow](../../03-architecture/uml/data-flow.md).
- Modifier si les cardinalites durables changent.

## Pipeline Par Couche

- Web: aucun acces DB.
- API/ConnectRPC: use cases appellent repositories, jamais Prisma direct dans contrats.
- Game-server: persistence minimale live, avec validation domaine.
- Domaine: invariants independants de Prisma.
- DB: schema par modules, migrations depuis DB vide, repositories.
- Worker: jobs idempotents sur transactions durables.
- Notifications: `NotificationJob` et `DeliveryLog` seulement si scope confirme.
- Observabilite: audit log pour actions sensibles.

## Contrats Protobuf Et ConnectRPC

Les contrats existent avant les repositories publics. Les read models DB ne deviennent pas messages reseau.

## Data

Modules cibles: identity, game planning, participation, realtime, rounds, scoring, audit, notifications,
payments. Seeds minimaux non destructifs.

Le sprint 03 ne livre pas les comportements complets de tous ces domaines. Il pose le socle durable et les
repositories necessaires aux sprints 04 a 09, avec contraintes d'unicite, audit et migrations depuis DB
vide. Les regles metier paiement, notifications, realtime et scoring restent livrees dans leurs sprints
proprietaires; toute table creee avant ces sprints doit etre justifiee comme support minimal, testee, et
non exposee comme contrat reseau.

## UI States

Les read models doivent supporter empty, denied, stale, payment pending, review pending et published.

## Permissions

Contraintes DB ne remplacent pas RBAC serveur. Support/finance lisent seulement leur perimetre.

## Erreurs Observabilite

Erreurs persistence mappees vers erreurs publiques stables, logs sans tokens ni payloads sensibles.

## Tests Attendus

- Migration DB vide.
- Tests integration repositories.
- Contraintes uniques et index critiques.
- Seeds sans paiement orphelin ni ledger incoherent.

## Definition Of Done

- `schema.prisma` ne contient pas de contrats reseau publics.
- Aucune migration modifiee sans test et justification.
- Rollback ou strategie de correction documentee.

## Interdictions Specifiques

- Ne pas recopier tout le schema HEAD.
- Ne pas supprimer audit/compliance/support/ledger/anti-cheat sans decision.
