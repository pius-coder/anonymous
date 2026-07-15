# Sprint 10 - Round orchestration

## Objectif

Reconstruire le cycle de manche autoritaire avant les mini-jeux complets. Hors scope: scoring officiel et
framework complet de mini-jeu.

## User Stories Produit

| ID | Role | User story | Valeur produit | Priorite |
|---|---|---|---|---|
| US-10-01 | Admin | En tant qu'admin, je veux configurer, lancer, pauser, reprendre et fermer une manche, afin de garder l'autorite sur le rythme du jeu. | Orchestration manuelle et auditable. | Must |
| US-10-02 | Joueur | En tant que joueur, je veux passer du briefing au jeu actif puis a l'attente de verification, afin de comprendre ma phase courante. | Experience joueur claire. | Must |
| US-10-03 | Observateur | En tant qu'observateur, je veux suivre une projection autorisee de la manche, afin de regarder sans voir l'etat prive. | Observation no-leak. | Should |
| US-10-04 | Worker/Systeme | En tant que systeme, je veux fermer une manche a deadline, afin de terminer le round sans publier les scores. | Deadline technique sans publication. | Should |

## Scenarios D'Acceptation Atomiques

| ID | Story | Surface | Given | When | Then | UML liee | Contrat/Test |
|---|---|---|---|---|---|---|---|
| AC-10-01 | US-10-01 | Command center round | Partie `READY_TO_START`, round configure | L'admin clique `Lancer le briefing` | Transition `RoundSetup -> RoundBriefing` | [state machines](../../03-architecture/uml/state-machines.md) | `StartRound` |
| AC-10-02 | US-10-01 | Command center round | Briefing affiche | L'admin clique `Demarrer la manche` | Transition `RoundBriefing -> RoundActive` | [sequences](../../03-architecture/uml/sequences.md) | Test admin start |
| AC-10-03 | US-10-02 | Ecran joueur | Round actif | Le joueur clique `Terminer` ou atteint timeout | Etat `FinishedRound`, puis attente verification | [sequences](../../03-architecture/uml/sequences.md) | `PlayerFinishedRound` |
| AC-10-04 | US-10-01 | Command center round | Round actif | L'admin clique `Mettre en pause` | Etat `Suspended`, inputs refuses ou geles selon regle | [state machines](../../03-architecture/uml/state-machines.md) | `PauseRound` |
| AC-10-05 | US-10-01 | Command center round | Round suspendu | L'admin clique `Reprendre` | Etat `RoundActive`, timer coherent | [state machines](../../03-architecture/uml/state-machines.md) | `ResumeRound` |
| AC-10-06 | US-10-04 | Deadline round | Round actif, deadline atteinte | Le systeme declenche `Fermer la manche` | Transition `RoundClosing -> Verification`, aucun score public | [scoring publication](../../03-architecture/uml/scoring-publication.md) | Test no publication |
| AC-10-07 | US-10-03 | Vue observer | Round actif avec state prive | L'observateur clique `Observer la manche` | Projection filtree sans reponses cachees | [realtime flow](../../03-architecture/uml/realtime-flow.md) | No-leak realtime |

## Sources Docs Obligatoires

- Produit: [lifecycle](../../01-product/session-lifecycle.md), [use cases](../../01-product/use-cases.md), [scoring](../../01-product/scoring-and-publication.md)
- UX: [player states](../../02-ux/player-states.md), [admin command center](../../02-ux/admin-command-center.md)
- Architecture/UML: [state machines](../../03-architecture/uml/state-machines.md), [sequences](../../03-architecture/uml/sequences.md), [realtime flow](../../03-architecture/uml/realtime-flow.md)
- Couches: [realtime](../../04-layers/realtime.md), [domain](../../04-layers/domain.md), [application use cases](../../04-layers/application-use-cases.md)
- Workflow: [pipeline agentique](../../05-workflows/agentic-feature-pipeline.md), [layer canvas](../../05-workflows/layer-change-canvas.md)
- Tests: [strategie de test](../../05-workflows/test-strategy.md)

## Preuves Legacy

- `sessionStore.ts` portait start round, finalisation, persistence, deadlines et recette games.
- `BRIEFING_DURATION_MS` et `RESULTS_DURATION_MS` imposaient des transitions automatiques peu compatibles
  avec l'admin explicite.

## UML Concernee

- Lire [state machines](../../03-architecture/uml/state-machines.md) et [sequences](../../03-architecture/uml/sequences.md).
- Modifier si `RoundBriefing`, `RoundActive`, `RoundClosing` ou `Verification` changent.

## Pipeline Par Couche

- Web: vues briefing/active/waiting review.
- API/ConnectRPC: commands admin `ConfigureRound`, `StartRound`, `CloseRound`.
- Game-server: start runtime, enforce deadline, collect inputs, close round.
- Domaine: transitions round et refus phase invalide.
- DB: `Round`, `RoundParticipant`, `PlayerAction`, `RoundDeadline`.
- Worker: deadline de fermeture seulement.
- Notifications: aucune publication de resultat.
- Observabilite: audit start/close/pause, metrics deadline/late input.

## Contrats Protobuf Et ConnectRPC

`ConfigureRound`, `StartRound`, `PauseRound`, `CloseRound`, `RoundStarted`, `PlayerFinishedRound`,
`RoundClosed`, erreurs `ROUND_NOT_READY`, `ROUND_ALREADY_ACTIVE`, `LATE_INPUT`.

## Data

Persist round lifecycle, participant round status, action nonce, deadline, snapshot hash si requis.

## UI States

Briefing, active, finished waiting review, paused, reconnecting, input rejected, round closed.

## Permissions

Start/pause/close par admin autorise. Deadline systeme ne remplace pas confirmation admin de demarrage.

## Erreurs Observabilite

Input tardif, no-show par admission lock, deadline close, commande admin refusee, audit reason.

## Tests Attendus

- Start par admin seulement.
- Deadline close autorisee.
- Pause/reprise.
- Input tardif refuse.
- No-show par admission lock.
- Cycle atteint `ROUND_VERIFICATION` sans publication joueur.

## Definition Of Done

- Le cycle round atteint review sans publier de scores joueur.
- Les transitions interdites du lifecycle sont impossibles.

## Interdictions Specifiques

- Ne pas reprendre `round.resolved` comme evenement public.
- Ne pas cacher les regles de start dans callbacks Colyseus.
