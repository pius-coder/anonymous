# Sprint 08 - Preparation lobby et annonces

## Objectif

Construire l'avant-match admin/joueur avant toute manche active. Hors scope: mini-jeu actif et scoring.

## User Stories Produit

| ID | Role | User story | Valeur produit | Priorite |
|---|---|---|---|---|
| US-08-01 | Admin | En tant qu'admin, je veux ouvrir la preparation, annoncer et confirmer avec absents, afin de lancer seulement quand la situation est claire. | Avant-match controle. | Must |
| US-08-02 | Joueur | En tant que joueur, je veux signaler ma presence et mon pret, afin d'etre pris en compte avant le lancement. | Readiness visible. | Must |
| US-08-03 | Support | En tant que support, je veux voir les problemes d'acces preparation sans bouton de lancement, afin d'aider sans agir sur la partie. | Support borne. | Should |
| US-08-04 | Worker/Systeme | En tant que systeme, je veux envoyer des rappels de preparation, afin d'ameliorer la presence sans demarrer le jeu. | Rappel non competitif. | Should |

## Scenarios D'Acceptation Atomiques

| ID | Story | Surface | Given | When | Then | UML liee | Contrat/Test |
|---|---|---|---|---|---|---|---|
| AC-08-01 | US-08-01 | Command center preparation | Partie `SCHEDULED`, participants attaches | L'admin clique `Ouvrir la preparation` | Transition `PREPARATION_OPEN`, audit | [state machines](../../03-architecture/uml/state-machines.md) | `OpenPreparation` |
| AC-08-02 | US-08-02 | Lobby preparation | Participation eligible, preparation ouverte | Le joueur clique `Je suis present` | Statut `PRESENT` visible admin | [sequences](../../03-architecture/uml/sequences.md) | `MarkPresent` |
| AC-08-03 | US-08-02 | Lobby preparation | Present, pas deja pret | Le joueur clique `Je suis pret` | Statut `READY`, compteur admin maj | [state machines](../../03-architecture/uml/state-machines.md) | `MarkReady` |
| AC-08-04 | US-08-01 | Zone annonces | Preparation ouverte | L'admin saisit un message puis clique `Envoyer l'annonce` | Announcement phase preparation + notification intent | [sequences](../../03-architecture/uml/sequences.md) | `SendPreparationAnnouncement` |
| AC-08-05 | US-08-01 | Confirmation lancement | Absents detectes | L'admin clique `Confirmer avec absents` | Confirmation exige raison, pas round actif direct | [state machines](../../03-architecture/uml/state-machines.md) | `ConfirmStart` |
| AC-08-06 | US-08-01 | Confirmation lancement | Raison vide | L'admin clique `Confirmer avec absents` | Refus `ABSENTS_REQUIRE_OVERRIDE` | [permissions](../../03-architecture/uml/permissions.md) | Test override |
| AC-08-07 | US-08-04 | Rappel preparation | Joueurs non prets | Le systeme declenche `Envoyer rappel preparation` | Notifications envoyees, lifecycle inchangee | [sequences](../../03-architecture/uml/sequences.md) | Test no auto start |
| AC-08-08 | US-08-03 | Monitoring preparation | Role support | Le support clique `Voir problemes d'acces` | Lecture access issues sans bouton `Lancer` | [permissions](../../03-architecture/uml/permissions.md) | RBAC support |

## Sources Docs Obligatoires

- Produit: [notifications](../../01-product/notifications.md), [lifecycle](../../01-product/session-lifecycle.md), [admin journey](../../01-product/admin-journey.md)
- UX: [announcements](../../02-ux/announcements.md), [player states](../../02-ux/player-states.md), [admin command center](../../02-ux/admin-command-center.md)
- Architecture/UML: [sequences](../../03-architecture/uml/sequences.md), [state machines](../../03-architecture/uml/state-machines.md), [permissions](../../03-architecture/uml/permissions.md)
- Couches: [player web](../../04-layers/player-web.md), [admin web](../../04-layers/admin-web.md), [notifications](../../04-layers/notifications.md)
- Workflow: [pipeline agentique](../../05-workflows/agentic-feature-pipeline.md), [layer canvas](../../05-workflows/layer-change-canvas.md)
- Tests: [strategie de test](../../05-workflows/test-strategy.md)

## Preuves Legacy

- Lobby/check-in existait mais etait lie a join-token/live reservation.
- Notifications d'annonce et statuts de presence etaient disperses.

## UML Concernee

- Lire [sequences](../../03-architecture/uml/sequences.md) et [state machines](../../03-architecture/uml/state-machines.md).
- Modifier si une annonce change de phase ou si readiness change la lifecycle.

## Pipeline Par Couche

- Web: lobby joueur, readiness admin, annonces dediees.
- API/ConnectRPC: preparation commands et reads.
- Game-server: aucune manche active; event live seulement si architecture validee.
- Domaine: presence, ready, absents, confirm start.
- DB: preparation state, announcements, audit.
- Worker: reminders idempotents.
- Notifications: emettre une intention annonce/rappel sans provider ni delivery workflow complet avant sprint 17.
- Observabilite: audit open/announcement/confirm et trace de l'intention notification; pas de delivery logs avant sprint 17.

## Contrats Protobuf Et ConnectRPC

`OpenPreparation`, `MarkPresent`, `MarkReady`, `SendPreparationAnnouncement`, `ConfirmStart`,
`PreparationStateUpdated`, erreurs `NOT_ELIGIBLE`, `ALREADY_READY`, `ABSENTS_REQUIRE_OVERRIDE`.

## Data

Etats participant: invite, paye, present, pret, sans reponse, absent. Announcement phase `PREPARATION`.

## UI States

Lobby loading, present, ready, absent warning, announcement received, stale readiness, confirm with absents.

## Permissions

Joueur marque sa presence/pret. Admin ouvre et confirme. Worker rappelle seulement.

## Erreurs Observabilite

Participant non eligible, preparation non ouverte, annonce invalide, rappel en doublon.

## Tests Attendus

- Readiness.
- Absents et override admin explicite.
- Announcement + notification intent.
- Timer rappel ne demarre pas la partie active.
- No-leak: annonces preparation hors mini-jeu actif.

## Definition Of Done

- Aucune transition automatique de preparation vers `ACTIVE_ROUND`.
- L'admin voit qui est pret avant de lancer.

## Interdictions Specifiques

- Ne pas melanger annonce preparation et briefing mini-jeu.
- Ne pas reintroduire `IN_ROOM` comme statut de preparation.
