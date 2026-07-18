# P-A-SCORING - Preuves, publication et gains atomiques

## Mission autonome

Relier la sortie signee d'un runtime aux scores provisoires, a la verification admin, a la publication
explicite et aux gains, sans fuite avant publication ni double credit.

## Prerequis et lectures

- P-SEQ-02/03 merges; enveloppe `MiniGameScoreEvidence` figee.
- Lire scoring, gains, audit, contracts Scoring et flux legacy de publication.
- Context7 : Prisma transactions et ConnectRPC.

## Ownership

Use-cases Scoring, generation/validation de preuve commune, `/admin/parties/*/scores`, resultats joueur,
projections de resultats et tests. Pas de regle de score propre a un jeu.

## Interdit

Contracts/DB, publication par game-server/worker, `evidenceHash` vide, score/gain client, correction sans
motif, acces provisoire joueur/observer ou credit avant publication.

## Livrables production

- validation d'une preuve runtime versionnee/hashable avec inputs/config/seed references selon retention;
- score provisoire idempotent, review/correction avec motif/auteur/version;
- publication round/party et gains transactionnels ou outbox compensable;
- classement/tie-break issu des rulebooks et recalcul deterministe;
- UI admin verification/conflit, joueur/observer uniquement publie, finance ledger lie;
- audit obligatoire et metriques mismatch/review/delai publication.

## Criteres d'acceptation

- preuve absente, hash vide, version inconnue ou mismatch leve un incident et bloque la publication;
- deux publications concurrentes ne creditent qu'une fois;
- aucune API, patch, log ou UI non autorisee ne revele le provisoire;
- correction garde ancien/nouveau/motif/auteur et invalide les vues stale;
- gains visibles correspondent exactement au ledger publie.

## Tests et sortie

L1 resolver/replay, L3 transactions/concurrence, L4 RBAC/no-leak, L5 admin correction/publication puis
resultats joueur/finance. Le replay propre a chaque runtime est prouve par WAVE-B/P-SEQ-06. Gates lot
et commit atomique.
