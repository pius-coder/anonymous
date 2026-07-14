# Actors And Permissions

| Acteur | Peut faire | Ne peut pas faire |
|---|---|---|
| Joueur | rejoindre lobby, signaler presence, jouer, attendre, lire annonces publiees | demarrer partie, voir scores non publies |
| Administrateur | preparer, annoncer, lancer, pauser, verifier, publier | controler le joueur directement |
| Observateur lecture seule | voir snapshots autorises, suivre progression | envoyer input, modifier etat |
| Worker systeme | rappels, expirations, clotures techniques | demarrer une partie active sans commande admin |
| Game server | synchroniser et valider inputs live | posseder paiement, wallet, autorisations finales |

Permissions sensibles:

- `PARTY_START`: admin.
- `ROUND_START`: admin avec confirmation.
- `RESULT_VERIFY`: admin.
- `RESULT_PUBLISH`: admin.
- `READONLY_OBSERVE`: admin/support/observateur accorde.

