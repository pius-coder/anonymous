# Information Architecture

## Routes ciblees conceptuelles

- Admin: `/admin/parties/:partyId/control`
- Admin lecture seule: `/admin/parties/:partyId/monitor`
- Joueur preparation: `/parties/:partyCode/lobby`
- Joueur manche: `/parties/:partyCode/round`
- Joueur attente: `/parties/:partyCode/waiting`
- Joueur resultats publies: `/parties/:partyCode/results`
- Observateur: `/observe/parties/:partyId`

Les routes legacy ne sont pas conservees automatiquement.

