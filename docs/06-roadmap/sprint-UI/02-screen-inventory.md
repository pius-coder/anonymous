# Screen Inventory

## Public Et Acquisition

| Ecran                      | But                                     | Donnees visibles                                                       | CTA                                          |
| -------------------------- | --------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------- |
| Catalogue parties          | Decouvrir les parties publiees          | Nom, horaire, statut public, prix public, places restantes si autorise | `Voir details`                               |
| Detail partie              | Comprendre la partie et action suivante | Description, conditions, statut, prix, calendrier                      | `S'inscrire`, `Voir mon statut`, `Connexion` |
| Code invalide/inaccessible | Expliquer l'absence d'acces             | Aucun champ admin                                                      | `Retour aux parties`                         |

## Auth Et Compte

| Ecran           | But                   | Donnees visibles                  | CTA                |
| --------------- | --------------------- | --------------------------------- | ------------------ |
| Inscription     | Creer session joueur  | Champs compte minimum             | `Creer mon compte` |
| Connexion       | Reprendre session     | Email/login, mot de passe         | `Se connecter`     |
| Compte          | Voir session courante | Identite, role, sessions si scope | `Se deconnecter`   |
| Session expiree | Recuperer l'acces     | Message session expiree           | `Se reconnecter`   |

## Joueur

| Ecran                | But                                   | Donnees visibles                                            | CTA                                                             |
| -------------------- | ------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| Statut participation | Suivre inscription/paiement/admission | Participation, paiement public, readiness, acces live       | `Annuler`, `Payer`, `Entrer au lobby`                           |
| Paiement             | Payer et verifier                     | Montant, methode, statut public                             | `Payer maintenant`, `Payer avec wallet`, `Verifier le paiement` |
| Lobby preparation    | Presence et pret                      | Annonce, participants agreges si autorise, statut personnel | `Je suis present`, `Je suis pret`                               |
| Briefing round       | Comprendre le mini-jeu avant depart   | Regles publiques, compte a rebours, annonce admin           | Aucun input competitif                                          |
| Round actif          | Jouer                                 | UI mini-jeu, timer, feedback commande                       | Commandes du mini-jeu, `Terminer` si autorise                   |
| Attente verification | Attendre publication                  | Message verification, annonce admin, etat perso             | `Actualiser`, `Voir resultats` disabled/explique                |
| Resultats publies    | Lire scores officiels                 | Score publie, rang public, statut qualification             | `Manche suivante`, `Terminer` selon lifecycle                   |
| Reconnexion live     | Restaurer state view                  | Statut connexion, input recu/non recu                       | `Reconnexion`, `Contacter support`                              |

## Admin

| Ecran               | But                           | Donnees visibles                             | CTA                                                           |
| ------------------- | ----------------------------- | -------------------------------------------- | ------------------------------------------------------------- |
| Liste parties admin | Retrouver parties             | Brouillons, publiees, lifecycle              | `Creer une partie`, `Ouvrir control`                          |
| Setup partie        | Configurer et publier         | Champs config, gates, preview publique       | `Enregistrer`, `Valider`, `Publier`, `Planifier`              |
| Command center      | Superviser et decider         | Lifecycle, readiness, live, anomalies, lease | Actions selon phase                                           |
| Participants        | Controler readiness/admission | Presence, pret, paiement bloque, connexion   | `Rafraichir`, actions autorisees                              |
| Annonces            | Envoyer message tracable      | Message, cible, delivery status              | `Envoyer annonce`                                             |
| Round control       | Lancer, pauser, fermer        | Round config, timer, phase, anomalies        | `Lancer briefing`, `Demarrer`, `Pause`, `Reprendre`, `Fermer` |
| Scores provisoires  | Verifier et corriger          | Scores provisoires, evidence, anomalies      | `Corriger`, `Publier`                                         |
| Timeline/audit      | Comprendre l'historique       | Evenements, acteur, raison, resultat         | Filtres, export si decide                                     |

## Observer

| Ecran                      | But                   | Donnees visibles                            | CTA         |
| -------------------------- | --------------------- | ------------------------------------------- | ----------- |
| Snapshot global            | Suivre partie         | Etat public, progression, resultats publics | Aucun input |
| Snapshot mini-jeu readonly | Voir round sans fuite | Public state uniquement                     | Aucun input |
| Resultats publics          | Voir publication      | Scores publies selon audience               | Aucun input |

## Support, Compliance, Finance, Workers

| Ecran                 | But                     | Donnees visibles                            | CTA                                    |
| --------------------- | ----------------------- | ------------------------------------------- | -------------------------------------- |
| Dossier support       | Aider sans commander    | Participation, erreurs, snapshots autorises | `Ouvrir incident`, `Voir audit`        |
| Incident              | Suivre probleme         | Statut, severite, timeline, owner           | `Ajouter note`, `Resoudre` si autorise |
| Compliance gate       | Decider un blocage      | Gate, evidence, impact, actions             | `Valider`, `Waiver` avec raison        |
| Risk signals          | Lire anti-cheat redige  | Signal, correlation, evidence redigee       | Filtres, aucun score direct            |
| Ledger finance        | Tracer argent           | Mouvements, idempotency, transaction status | `Reconciler`                           |
| Notification delivery | Diagnostiquer livraison | Job, channel, statut, erreur redigee        | `Retry` si autorise                    |
