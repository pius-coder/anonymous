# UML - Machines D'Etat

## Partie

Les noms d'etat produit canoniques sont ceux de `docs/01-product/session-lifecycle.md`. Les libelles
CamelCase ci-dessous sont des alias visuels; tout contrat ou test doit utiliser les valeurs canoniques.

```mermaid
stateDiagram-v2
  [*] --> DRAFT
  DRAFT --> SCHEDULED: schedule(admin)
  SCHEDULED --> PREPARATION_OPEN: openPreparation(admin ou rappel non-live)
  PREPARATION_OPEN --> READY_TO_START: confirmStart(admin)
  PREPARATION_OPEN --> CANCELLED: cancel(admin)
  READY_TO_START --> ACTIVE_ROUND: startBriefing/startRound(admin)
  ACTIVE_ROUND --> ROUND_RESOLVING: closeRound(server deadline ou admin)
  ROUND_RESOLVING --> ROUND_VERIFICATION: computeProvisional(server)
  ROUND_VERIFICATION --> RESULTS_PUBLISHED: publishResults(admin)
  ROUND_VERIFICATION --> READY_TO_START: requestCorrection(admin)
  RESULTS_PUBLISHED --> NEXT_ROUND_PREPARATION: nextRound(admin)
  NEXT_ROUND_PREPARATION --> READY_TO_START: prepareRound(admin)
  RESULTS_PUBLISHED --> COMPLETED: completeParty(admin)
  ACTIVE_ROUND --> PAUSED: pause(admin)
  PAUSED --> ACTIVE_ROUND: resume(admin)
  PAUSED --> RECOVERY_REQUIRED: fail(system/admin)
  RECOVERY_REQUIRED --> PREPARATION_OPEN: recover(admin)
  DRAFT --> CANCELLED: cancel(admin)
  SCHEDULED --> CANCELLED: cancel(admin)
  COMPLETED --> [*]
  CANCELLED --> [*]
```

Transitions interdites:

- `SCHEDULED -> ACTIVE_ROUND` par timer.
- `PREPARATION_OPEN -> ACTIVE_ROUND` sans action admin.
- `ROUND_RESOLVING -> RESULTS_PUBLISHED` sans verification explicite.

## Participation

```mermaid
stateDiagram-v2
  [*] --> Registered: register(player)
  Registered --> Cancelled: cancel(player/admin)
  Registered --> PaymentPending: paymentRequired(system)
  PaymentPending --> Paid: paymentConfirmed(system)
  Paid --> Present: markPresent(player)
  Present --> Ready: markReady(player)
  Ready --> InRoom: connectRealtime(server)
  InRoom --> Playing: roundStarted(server)
  Playing --> FinishedRound: submitOrTimeout(server)
  Playing --> Disconnected: networkDrop(server)
  Disconnected --> Playing: reconnectBeforeDeadline(server)
  Disconnected --> Abandoned: reconnectExpired(server)
  FinishedRound --> WaitingReview: roundClosed(server)
  WaitingReview --> ResultsVisible: resultsPublished(admin)
  ResultsVisible --> Ready: nextRound(admin)
  ResultsVisible --> Completed: partyCompleted(admin)
```

Les etats paiement, preparation, connexion et round ne doivent pas etre ecrases dans un seul enum.
