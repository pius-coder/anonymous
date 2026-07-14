# Glossary

- Utilisateur: compte authentifie global.
- Joueur: utilisateur pouvant participer a des parties.
- Administrateur: utilisateur autorise a planifier, preparer, demarrer, verifier et publier.
- Observateur lecture seule: acteur autorise a consulter un rendu par snapshots/evenements sans controle joueur.
- Partie: unite produit autonome, anciennement proche de `GameSession`.
- Participation a une partie: lien explicite joueur-partie avec droits, statut de preparation, statut live et statut de resultat.
- Lobby: espace d'avant-match pour presence, readiness et annonces.
- Manche: segment ordonne de la partie.
- Mini-jeu: mecanique jouee pendant une manche.
- Session de jeu: instance runtime d'une partie ou d'une manche active.
- Connexion temps reel: connexion technique WebSocket/Colyseus ou equivalent.
- Etat de preparation: hors ligne, connecte, present, pret, sans reponse.
- Score provisoire: score calcule mais non publie.
- Score publie: score visible joueur apres validation admin.
- Annonce: message admin contextualise, surtout avant-match.
- Notification push: livraison systeme associee a une annonce ou rappel.

