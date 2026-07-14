# Scoring And Publication

## Regles

- Le score provisoire est calcule par le serveur.
- La verification admin est obligatoire avant publication.
- Les corrections doivent suivre des regles documentees et auditees.
- Les joueurs ne voient les resultats definitifs qu'apres publication.

## Etats

- `SCORE_PENDING`
- `SCORE_PROVISIONAL`
- `SCORE_UNDER_REVIEW`
- `SCORE_CORRECTED`
- `SCORE_PUBLISHED`
- `SCORE_VOIDED`

## Legacy a revoir

`GameSessionRoom.handleRoundResolved` diffuse actuellement `round.resolved` avec scores/ranks. Ce flux doit devenir interne/admin jusqu'a publication.

