# Sprint 06 - Participation et admission joueur

## Objectif

Replacer l'inscription autour d'une participation explicite et verifiable. Hors scope: paiement effectif,
presence preparation et connexion realtime complete.

## User Stories Produit

| ID | Role | User story | Valeur produit | Priorite |
|---|---|---|---|---|
| US-06-01 | Joueur | En tant que joueur, je veux m'inscrire, consulter et annuler ma participation, afin de controler mon entree dans une partie. | Participation explicite et visible. | Must |
| US-06-02 | Admin | En tant qu'admin, je veux suivre les participations et la capacite, afin de preparer une partie avec les bons joueurs. | Admission maitrisée. | Must |
| US-06-03 | Support | En tant que support, je veux consulter une participation sans forcer l'admission, afin d'aider sans modifier le jeu. | Support borne. | Should |
| US-06-04 | Worker/Systeme | En tant que systeme, je veux expirer les participations selon regle, afin de liberer ou bloquer proprement les places. | Expiration idempotente. | Should |

## Scenarios D'Acceptation Atomiques

| ID | Story | Surface | Given | When | Then | UML liee | Contrat/Test |
|---|---|---|---|---|---|---|---|
| AC-06-01 | US-06-01 | Detail partie | Partie ouverte, capacite disponible | Le joueur clique `S'inscrire` | Participation `REGISTERED` creee | [state machines](../../03-architecture/uml/state-machines.md) | `RegisterForParty` |
| AC-06-02 | US-06-01 | Detail partie | Joueur deja inscrit | Le joueur clique `S'inscrire` | Aucun doublon, message `deja inscrit` | [domains](../../03-architecture/uml/domains.md) | Test idempotence |
| AC-06-03 | US-06-01 | Mes parties | Annulation autorisee | Le joueur clique `Annuler ma participation` | Statut `CANCELLED`, place liberee si regle | [state machines](../../03-architecture/uml/state-machines.md) | `CancelParticipation` |
| AC-06-04 | US-06-01 | Mes parties | Participation existante | Le joueur clique `Voir mon statut` | Statut paiement/presence/connexion separes | [domains](../../03-architecture/uml/domains.md) | `GetMyParticipation` no mix |
| AC-06-05 | US-06-02 | Liste participants | Role admin | L'admin clique `Rafraichir la liste` | Participants, capacite et statuts coherents | [data flow](../../03-architecture/uml/data-flow.md) | `ListPartyParticipations` |
| AC-06-06 | US-06-03 | Dossier participant | Role support | Le support clique `Voir participation` | Lecture sans bouton d'admission forcee | [permissions](../../03-architecture/uml/permissions.md) | RBAC support |
| AC-06-07 | US-06-04 | Job expiration | Deadline atteinte, statut expirant | Le systeme declenche `Expiration participation` | Participation expiree idempotente | [state machines](../../03-architecture/uml/state-machines.md) | Test expiration |
| AC-06-08 | US-06-01 | Lobby/live cible | Participation absente ou annulee | Le joueur clique `Entrer dans le live` | Connexion live refusee | [permissions](../../03-architecture/uml/permissions.md) | Test live admission |

## Sources Docs Obligatoires

- Produit: [player journey](../../01-product/player-journey.md), [actors](../../01-product/actors-and-permissions.md), [lifecycle](../../01-product/session-lifecycle.md)
- UX: [player states](../../02-ux/player-states.md), [loading/error/reconnect](../../02-ux/loading-error-reconnection.md)
- Architecture/UML: [data model](../../03-architecture/data-model.md), [domaines](../../03-architecture/uml/domains.md), [state machines](../../03-architecture/uml/state-machines.md)
- Couches: [domain](../../04-layers/domain.md), [persistence](../../04-layers/persistence.md), [transports](../../04-layers/transports.md)
- Workflow: [pipeline agentique](../../05-workflows/agentic-feature-pipeline.md), [layer canvas](../../05-workflows/layer-change-canvas.md)
- Tests: [strategie de test](../../05-workflows/test-strategy.md)

## Preuves Legacy

- `SessionRegistrationStatus` melangeait `CREATED`, `PAYMENT_PENDING`, `PAID`, `CHECKED_IN`, `IN_ROOM`, `NO_SHOW`.
- Les flows code/id etaient fragiles dans lobby et live.

## UML Concernee

- Lire [domaines](../../03-architecture/uml/domains.md), [state machines](../../03-architecture/uml/state-machines.md) et [permissions](../../03-architecture/uml/permissions.md).
- Modifier si un statut participation regroupe paiement, presence ou connexion.

## Pipeline Par Couche

- Web: CTA inscription/annulation/statut, erreurs actionnables.
- API/ConnectRPC: `RegisterForParty`, `CancelParticipation`, lectures joueur/admin.
- Game-server: ne lit qu'une participation active pour admission future.
- Domaine: capacite, idempotence, transitions participation.
- DB: `PartyParticipation`, contraintes utilisateur/partie, expiration.
- Worker: expiration idempotente si regle validee.
- Notifications: aucune admission implicite.
- Observabilite: audit inscription/annulation/expiration.

## Contrats Protobuf Et ConnectRPC

`RegisterForParty`, `CancelParticipation`, `GetMyParticipation`, `ListPartyParticipations`,
`ParticipationStatusChanged`, erreurs `ALREADY_REGISTERED`, `CAPACITY_FULL`, `PARTICIPATION_EXPIRED`.

## Data

`PartyParticipation` separe droit de participer, paiement attendu, readiness, admission round et connexion.

## UI States

Non inscrit, inscrit, complet, paiement requis, annulation possible/interdite, participation expiree.

## Permissions

Joueur gere sa participation. Admin lit la liste. Support lit selon permission. Aucun role ne force paiement.

## Erreurs Observabilite

Capacite atteinte, deja inscrit, partie non ouverte, idempotency conflict, logs sans donnees paiement.

## Tests Attendus

- Capacite min/max.
- Deja inscrit.
- Expiration.
- Annulation.
- Participation requise pour toute entree live future.
- Code/id resolus de maniere stable.

## Definition Of Done

- Un joueur ne peut pas entrer dans le live sans participation active.
- Aucun statut paiement ne signifie "connecte a la room".
- Compteurs admin et joueur utilisent le meme filtre metier.

## Interdictions Specifiques

- Ne pas reconstruire `SessionRegistration` sous un nouveau nom.
- Ne pas confondre observateur et participant.
