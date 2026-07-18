# Sprint 11 - Experience joueur live

## Objectif

Remplacer le fallback vague par des etats joueur explicites et testables. Hors scope: logique competitive
serveur et publication admin.

## User Stories Produit

| ID | Role | User story | Valeur produit | Priorite |
|---|---|---|---|---|
| US-11-01 | Joueur | En tant que joueur, je veux voir une interface specifique pour chaque phase live, afin de savoir quoi faire. | Pas de fallback vague. | Must |
| US-11-02 | Joueur | En tant que joueur, je veux une erreur actionnable quand ma commande est refusee, afin de corriger mon action. | Feedback de jeu clair. | Must |
| US-11-03 | Support | En tant que support, je veux identifier si un joueur est en erreur, reconnect ou attente review, afin de l'aider. | Diagnostic sans controle. | Should |

## Scenarios D'Acceptation Atomiques

| ID | Story | Surface | Given | When | Then | UML liee | Contrat/Test |
|---|---|---|---|---|---|---|---|
| AC-11-01 | US-11-01 | Lobby joueur | Etat `PREPARATION_OPEN` | Le joueur ouvre la partie | Vue preparation avec bouton `Je suis pret` | [state machines](../../03-architecture/uml/state-machines.md) | UI state test |
| AC-11-02 | US-11-01 | Briefing joueur | Etat `RoundBriefing` | Le joueur attend le depart | Vue briefing sans bouton d'input actif | [sequences](../../03-architecture/uml/sequences.md) | UI state test |
| AC-11-03 | US-11-01 | Mini-jeu actif | Etat `RoundActive` | Le joueur clique `Envoyer mon action` | Commande envoyee et feedback accepte/refuse | [realtime flow](../../03-architecture/uml/realtime-flow.md) | `SubmitPlayerCommand` |
| AC-11-04 | US-11-01 | Attente review | Joueur a termine | Le joueur clique `Voir mes resultats` | Resultats indisponibles; message attente verification | [scoring publication](../../03-architecture/uml/scoring-publication.md) | No provisional leak |
| AC-11-05 | US-11-02 | Mini-jeu actif | Input tardif | Le joueur clique `Envoyer mon action` | Erreur traduite `manche terminee` | [realtime flow](../../03-architecture/uml/realtime-flow.md) | Rejected command test |
| AC-11-06 | US-11-01 | Live reconnect | Connexion perdue | Le joueur clique `Reconnexion` | Etat reconnecting puis state view restauree ou erreur finale | [realtime flow](../../03-architecture/uml/realtime-flow.md) | Reconnect UI test |
| AC-11-07 | US-11-03 | Support monitoring | Joueur en erreur bloquante | Le support clique `Voir etat joueur` | Etat lisible sans bouton pour jouer a sa place | [permissions](../../03-architecture/uml/permissions.md) | Support no-control |

## Sources Docs Obligatoires

- Produit: [player journey](../../01-product/player-journey.md), [readonly observer](../../01-product/readonly-observer.md), [lifecycle](../../01-product/session-lifecycle.md)
- UX: [player states](../../02-ux/player-states.md), [loading/error/reconnect](../../02-ux/loading-error-reconnection.md), [screen states](../../02-ux/screen-state-matrix.md)
- Architecture/UML: [realtime flow](../../03-architecture/uml/realtime-flow.md), [sequences](../../03-architecture/uml/sequences.md), [scoring publication](../../03-architecture/uml/scoring-publication.md)
- Couches: [player web](../../04-layers/player-web.md), [contracts](../../04-layers/contracts.md), [realtime](../../04-layers/realtime.md)
- Workflow: [pipeline agentique](../../05-workflows/agentic-feature-pipeline.md), [layer canvas](../../05-workflows/layer-change-canvas.md)
- Tests: [strategie de test](../../05-workflows/test-strategy.md)

## Preuves Legacy

- `/session/[code]/live` absorbait briefing, mini-jeu, attente, spectateur, chat, carte et fin de round.
- "En attente du serveur" masquait plusieurs causes.

## UML Concernee

- Lire [realtime flow](../../03-architecture/uml/realtime-flow.md) et [scoring publication](../../03-architecture/uml/scoring-publication.md).
- Modifier si une state view joueur expose de nouveaux champs.

## Pipeline Par Couche

- Web: routes/vues joueur, etats explicites, accessibilite et responsive.
- API/ConnectRPC: query player state si necessaire.
- Game-server: emet state views contractees.
- Domaine: aucune regle competitive dans React.
- DB: aucun acces direct.
- Worker: aucun.
- Notifications: affichage seulement si event autorise.
- Observabilite: erreurs client categorisees, reconnect attempts.

## Contrats Protobuf Et ConnectRPC

`GetPlayerState`, `PlayerStateView`, `SubmitPlayerCommand`, `PlayerCommandAccepted`,
`PlayerCommandRejected`, erreurs publiques traduisibles.

## Data

La UI consomme projections autorisees; aucun stockage client de state prive comme source durable.

## UI States

Preparation waiting, round briefing, round active, round finished waiting review, waiting next round,
results published, eliminated observing, reconnecting, recoverable error, blocking error.

## Permissions

Joueur voit uniquement sa state view. Scores non publies invisibles. Observateur separe.

## Erreurs Observabilite

Messages actionnables, translation d'erreurs, no generic final "attente serveur".

## Tests Attendus

- Rendu de chaque etat.
- Fin de manche avant publication.
- Reconnexion.
- Erreurs traduites.
- Mobile sans overlap.
- No-leak score provisoire.

## Definition Of Done

- Aucun score non publie n'est visible par joueur.
- Aucun fallback vague ne masque une phase connue.

## Interdictions Specifiques

- Ne pas refaire `LiveRoomShell` monolithique.
- Ne pas placer de regles competitives dans React.
