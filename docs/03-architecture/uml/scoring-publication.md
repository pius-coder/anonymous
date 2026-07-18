# UML - Scoring Et Publication

Question: comment separer score provisoire, verification et publication ?

```mermaid
sequenceDiagram
  participant P as Joueur
  participant Room as Game server
  participant API as API/ConnectRPC cible
  participant DB as Persistence
  participant A as Admin
  participant W as Worker

  P->>Room: Cliquer "Terminer" ou timeout
  Room-->>P: WaitingReviewState
  Room->>API: CloseRound(snapshotHash)
  API->>DB: Creer ProvisionalScore + evidence
  API-->>A: Dossier verification
  A->>API: Lire hash/version/refs retention/gains preview
  A->>API: Cliquer "Corriger le score"
  API->>DB: Audit correction + reason
  A->>API: Cliquer "Publier les resultats"
  API->>DB: Valider evidence hash/version/refs runtime
  API->>DB: Creer PublishedScore versionne + gains + audit
  API-->>P: ResultsPublished
  API->>W: Enqueue notifications/outbox si scope confirme
```

Regles:

- Le joueur ne voit pas les scores provisoires.
- Une correction admin exige une raison.
- Une correction stale doit retourner un conflit de version.
- Une preuve runtime absente, hash vide, version inconnue ou mismatch bloque la publication.
- Les gains ne partent pas avant publication validee.
- Deux publications concurrentes ne doivent jamais doubler le credit ledger.
