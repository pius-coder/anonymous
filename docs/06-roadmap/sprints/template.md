# Sprint NN - Titre

Ce template est obligatoire pour toute nouvelle fiche sprint. Une fiche incomplete bloque
l'implementation.

## Objectif

- Decrire l'increment verifiable et l'acteur principal.
- Dire explicitement ce qui est hors scope.

## User Stories Produit

Une user story de sprint decrit la valeur pour un role produit/app, pas une tache technique. Format attendu:
`En tant que <role>, je veux <capacite>, afin de <valeur observable>.`

Roles autorises: Joueur, Admin, Observateur, Support, Finance, Worker/Systeme. Ne pas utiliser `Agent`,
`API`, `Game-server`, `Repository`, `Prisma`, `ConnectRPC` ou un outil de developpement comme role de story.
Ces elements vont dans les scenarios d'acceptation, les contrats, les tests ou la Definition of Done.

| ID | Role | User story | Valeur produit | Priorite |
|---|---|---|---|---|
| US-NN-01 | Joueur | En tant que joueur, je veux ... afin de ... | Comportement observable | Must |
| US-NN-02 | Admin | En tant qu'admin, je veux ... afin de ... | Comportement observable | Must |

## Scenarios D'Acceptation Atomiques

Chaque user story doit etre couverte par des scenarios atomiques. Pour une UI, nommer le bouton,
l'onglet, le champ, le menu, le toggle ou le lien. Pour une action systeme, nommer l'evenement metier vu
par l'utilisateur ou l'operation planifiee. Chaque scenario doit etre lie a une UML et a un test.

| ID | Story | Surface | Given | When | Then | UML liee | Contrat/Test |
|---|---|---|---|---|---|---|---|
| AC-NN-01 | US-NN-01 | Ecran exact | Etat initial exact | L'utilisateur clique `Nom du bouton` | Resultat visible ou transition exacte | Diagramme + etat/sequence | Message + test |
| AC-NN-02 | US-NN-01 | Ecran exact | Etat interdit exact | L'utilisateur clique `Nom du bouton` | Bouton disabled ou erreur publique exacte | Diagramme + etat/sequence | Message + test |

Scenarios obligatoires par story:

- happy path;
- permission refusee ou bouton absent/disabled;
- etat stale/reconnexion si la surface est live;
- doublon/idempotence si l'action peut etre relancee;
- transition interdite si l'action touche le lifecycle;
- no-leak si l'action affiche une projection par audience.

## Sources Docs Obligatoires

- Produit: lien vers `../../01-product/...`
- UX: lien vers `../../02-ux/...`
- Architecture/UML: lien vers `../../03-architecture/...` et `../../03-architecture/uml/...`
- Couches: lien vers `../../04-layers/...`
- Workflow: lien vers `../../05-workflows/agentic-feature-pipeline.md`
- Tests: lien vers `../../05-workflows/test-strategy.md`

## Preuves Legacy

- Fichiers `HEAD:` ou audits locaux a lire avant implementation.

## UML Concernee

- Diagrammes a lire avant code.
- Diagrammes a modifier si le sprint change les transitions, flux, permissions ou data flow.

## Pipeline Par Couche

- Web:
- API/ConnectRPC:
- Game-server:
- Domaine:
- DB:
- Worker:
- Notifications:
- Observabilite:

## Contrats Protobuf Et ConnectRPC

- Messages `.proto`.
- Services ConnectRPC futurs.
- Evenements realtime.
- Erreurs publiques.

## Data

- Modeles durables, migrations, seeds et retention.

## UI States

- Loading, empty, error, stale, reconnect, denied et succes.

## Permissions

- Roles, permissions serveur et interdictions de controle client.

## Erreurs Observabilite

- Erreurs publiques, logs, metrics, audit et correlation ids.

## Tests Attendus

- Unitaires domaine.
- Contrats/golden fixtures.
- Integration API/DB.
- Realtime.
- UI states.
- RBAC.
- No-leak.
- Anti-regression.

## Definition Of Done

- Commandes a lancer.
- Preuves attendues.
- Documentation mise a jour.

## Interdictions Specifiques

- Ce que l'agent ne doit pas reconstruire, supposer ou coupler pendant ce sprint.
