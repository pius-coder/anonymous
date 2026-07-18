# Player Web Layer

Responsabilite: experience joueur.
Possede: lobby, manche, attente, resultats publies.
Ne contient jamais: score officiel calcule client.
Entrees/sorties: state views -> UI; inputs -> commands.
Contrats publics: routes joueur.
Dependances autorisees: contracts clients.
Dependances interdites: admin actions.
Donnees: participation scoped view.
Securite: no leak reponses/scores provisoires.
Ajout: screen-state matrix obligatoire.
Modification: verifier mobile.
Suppression: retirer route apres remplacement.
Tests: E2E parcours joueur.
Observabilite: drop, reconnect, input rejected.
Validation: messages d'etat explicites.

