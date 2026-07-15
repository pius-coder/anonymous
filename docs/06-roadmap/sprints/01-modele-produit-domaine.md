# Sprint 01 - Modele produit et domaine

## Objectif

Stabiliser le vocabulaire et les invariants purs: partie, participation, preparation, manche, mini-jeu,
score provisoire et score publie. Hors scope: endpoint, table UI-first ou generation client.

## User Stories Produit

| ID | Role | User story | Valeur produit | Priorite |
|---|---|---|---|---|
| US-01-01 | Admin | En tant qu'admin, je veux planifier une partie puis lancer les phases seulement dans l'ordre autorise, afin de garder le controle du jeu. | Les transitions partie sont previsibles et auditables. | Must |
| US-01-02 | Joueur | En tant que joueur, je veux signaler mon etat de preparation, afin que l'admin sache si je peux jouer. | La readiness joueur est distincte de la connexion live. | Must |
| US-01-03 | Joueur | En tant que joueur, je veux etre bloque si je n'ai pas de participation active, afin que le live reste equitable. | L'admission live depend du droit de participer. | Must |
| US-01-04 | Observateur | En tant qu'observateur, je veux voir une projection filtree, afin de suivre sans voir les informations privees. | Les audiences sont separees. | Must |
| US-01-05 | Worker/Systeme | En tant que systeme, je veux fermer une manche arrivee a deadline, afin de terminer une phase active sans publier les scores. | Le systeme peut fermer, pas publier. | Should |

## Scenarios D'Acceptation Atomiques

| ID | Story | Surface | Given | When | Then | UML liee | Contrat/Test |
|---|---|---|---|---|---|---|---|
| AC-01-01 | US-01-01 | Planification partie | Partie `DRAFT`, config minimale valide | L'admin clique `Planifier` | Transition `DRAFT -> SCHEDULED` | [state machines](../../03-architecture/uml/state-machines.md) | Test transition partie |
| AC-01-02 | US-01-01 | Command center | Partie `SCHEDULED` sans preparation | L'admin clique `Lancer la manche` | Refus `INVALID_PHASE`; bouton disabled ou API refuse | [state machines](../../03-architecture/uml/state-machines.md) | Test transition interdite |
| AC-01-03 | US-01-02 | Lobby preparation | Participation active, preparation ouverte | Le joueur clique `Je suis pret` | Readiness joueur passe a `READY` | [state machines](../../03-architecture/uml/state-machines.md) | Test participation |
| AC-01-04 | US-01-03 | Lobby/live | Participation absente | Le joueur clique `Entrer dans le live` | Refus `PARTICIPATION_REQUIRED` | [permissions](../../03-architecture/uml/permissions.md) | Test permission domaine |
| AC-01-05 | US-01-04 | Page observer | Permission lecture seule | L'observateur clique `Observer la partie` | Projection sans champs prives joueur | [realtime flow](../../03-architecture/uml/realtime-flow.md) | Test no-leak |
| AC-01-06 | US-01-05 | Deadline round | Round actif, deadline atteinte | Le systeme declenche `deadline atteinte` | Transition `ACTIVE_ROUND -> ROUND_RESOLVING` | [state machines](../../03-architecture/uml/state-machines.md) | Test deadline |
| AC-01-07 | US-01-01 | Verification scores | Scores non verifies | L'admin clique `Publier les resultats` | Refus `SCORE_NOT_VERIFIED` | [scoring publication](../../03-architecture/uml/scoring-publication.md) | Test publication |

## Sources Docs Obligatoires

- Produit: [lifecycle](../../01-product/session-lifecycle.md), [glossaire](../../01-product/glossary.md)
- UX: [player states](../../02-ux/player-states.md), [screen states](../../02-ux/screen-state-matrix.md)
- Architecture/UML: [architecture cible](../../03-architecture/target-architecture.md), [domaines UML](../../03-architecture/uml/domains.md), [state machines](../../03-architecture/uml/state-machines.md)
- Couches: [domain](../../04-layers/domain.md), [contracts](../../04-layers/contracts.md)
- Workflow: [pipeline agentique](../../05-workflows/agentic-feature-pipeline.md), [layer canvas](../../05-workflows/layer-change-canvas.md)
- Tests: [strategie de test](../../05-workflows/test-strategy.md)

## Preuves Legacy

- `SessionRegistration` melangeait paiement, check-in et entree room.
- `GameSessionStatus`, `LivePhase` et `RoundStatus` avaient des transitions concurrentes.
- [audit forensic](../../00-audit/head-forensic-audit.md) sections live, rounds et scoring.

## UML Concernee

- Lire [domaines](../../03-architecture/uml/domains.md) et [state machines](../../03-architecture/uml/state-machines.md).
- Modifier si `GameParticipation` ou les transitions partie/participation changent.

## Pipeline Par Couche

- Web: aucune regle competitive dans React.
- API/ConnectRPC: aucun endpoint; seulement use cases futurs identifies.
- Game-server: ne possede pas les transitions globales admin.
- Domaine: types purs, transitions autorisees, erreurs stables.
- DB: pas de schema tant que les invariants ne sont pas testes.
- Worker: transitions systeme limitees aux deadlines documentees.
- Notifications: aucune transition competition.
- Observabilite: evenements domaine nommes et correlation ids futurs.

## Contrats Protobuf Et ConnectRPC

Identifier les futurs messages sans generation: `PartyState`, `ParticipationState`, `RoundState`,
`ScoreVisibility`, erreurs `INVALID_PHASE`, `ROLE_FORBIDDEN`, `PARTICIPATION_REQUIRED`.

## Data

Aucun modele Prisma expose. Les futures entites persistantes seront derivees des invariants valides.

## UI States

Chaque etat domaine doit correspondre a une state view joueur/admin/observateur ou etre interne.

## Permissions

Admin lance/verifie/publie; joueur joue seulement avec participation active; worker ne demarre pas le live.

## Erreurs Observabilite

Erreurs domaine deterministes, sans secrets ni donnees cachees de mini-jeu.

## Tests Attendus

- Unitaires transitions partie.
- Unitaires participation et permissions metier.
- Cas limites: no-show, abandon, reconnect, participant elimine.
- Anti-regression: `SCHEDULED -> ACTIVE_ROUND` par timer refuse.

## Definition Of Done

- Domaine sans dependance Next.js, Hono, Prisma ou Colyseus.
- Transitions interdites testees.
- Documentation UML/lifecycle mise a jour.

## Interdictions Specifiques

- Ne pas renommer `SessionRegistration` en gardant son role fourre-tout.
- Ne pas deduire la source de verite depuis Prisma ou Colyseus.
