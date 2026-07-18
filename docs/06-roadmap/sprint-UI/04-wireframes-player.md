# Wireframes - Public Et Joueur

Ces wireframes sont basse fidelite. Ils decrivent la structure, pas le style visuel final.

## Catalogue Parties

Source: sprints 05, 06.

```text
+--------------------------------------------------------------+
| Header: Logo | Parties | Compte                              |
+--------------------------------------------------------------+
| Titre: Parties publiees                                      |
| [Search/filter si confirme]                                  |
|                                                              |
| +----------------------+ +----------------------+             |
| | Partie A             | | Partie B             |             |
| | Horaire              | | Horaire              |             |
| | Statut public        | | Statut public        |             |
| | Prix / acces         | | Prix / acces         |             |
| | [Voir details]       | | [Voir details]       |             |
| +----------------------+ +----------------------+             |
|                                                              |
| Empty: Aucune partie publiee                                 |
| Error: Catalogue indisponible [Reessayer]                    |
+--------------------------------------------------------------+
```

## Detail Partie

Source: sprints 05, 06, 07.

```text
+--------------------------------------------------------------+
| Header                                                       |
+--------------------------------------------------------------+
| Breadcrumb: Parties > Code                                   |
| Partie: nom, horaire, etat public                            |
| Conditions: prix, capacite, admission, preparation           |
|                                                              |
| Statut utilisateur                                           |
| - Invite: connexion requise                                  |
| - Non inscrit: peut s'inscrire si ouvert                     |
| - Deja inscrit: voir statut                                  |
| - Partie pleine/inaccessible: raison claire                  |
|                                                              |
| CTA principal: [S'inscrire] / [Voir mon statut] / [Connexion]|
| CTA secondaire: [Retour aux parties]                         |
+--------------------------------------------------------------+
```

Regles:

- Ne jamais afficher champs admin, gates internes ou audit.
- Si inscription indisponible, expliquer la condition exacte.

## Participation Et Paiement

Source: sprints 06, 07.

```text
+--------------------------------------------------------------+
| Header: Partie | Statut connexion                            |
+--------------------------------------------------------------+
| Etape actuelle: Participation                                |
|                                                              |
| Statut participation     Statut paiement                     |
| +-------------------+    +------------------------------+    |
| | REGISTERED        |    | PENDING / CONFIRMED / FAILED |    |
| | Capacite OK       |    | Montant public               |    |
| +-------------------+    +------------------------------+    |
|                                                              |
| Actions                                                      |
| [Payer maintenant] [Payer avec wallet] [Verifier paiement]   |
| [Annuler ma participation]                                   |
|                                                              |
| Messages                                                     |
| - Paiement echoue: raison publique + reprise possible        |
| - Wallet insuffisant: aucun debit effectue                   |
+--------------------------------------------------------------+
```

Regles:

- Le payload provider brut reste invisible.
- Le ledger complet est reserve finance.
- Admin peut voir un blocage paiement, pas modifier la transaction.

## Lobby Preparation

Source: sprints 08, 09, 11, 17.

```text
+--------------------------------------------------------------+
| Partie X | PREPARATION_OPEN | Connexion: stable              |
+--------------------------------------------------------------+
| Annonce admin                                                |
| +----------------------------------------------------------+ |
| | Message pre-match, horodatage, auteur public autorise    | |
| +----------------------------------------------------------+ |
|                                                              |
| Mon statut                                                   |
| +----------------+ +----------------+ +-------------------+ |
| | Presence       | | Pret           | | Paiement/Admission| |
| | absent/present | | no/yes         | | ok/bloque        | |
| +----------------+ +----------------+ +-------------------+ |
|                                                              |
| Actions                                                      |
| [Je suis present] [Je suis pret] [Entrer dans le live]       |
|                                                              |
| Bandeau reconnect/erreur si besoin                          |
+--------------------------------------------------------------+
```

Regles:

- Readiness n'est pas connexion live.
- Rappel ou annonce ne demarre jamais une manche.

## Briefing Round

Source: sprints 10, 11, 14, 15.

```text
+--------------------------------------------------------------+
| Partie X | ROUND_BRIEFING | Live connected                   |
+--------------------------------------------------------------+
| Mini-jeu: nom, famille, objectif                             |
| Regles publiques                                             |
| - Ce qui est autorise                                        |
| - Ce qui est interdit                                        |
| - Condition de fin                                           |
|                                                              |
| Timer briefing / attente admin                               |
|                                                              |
| Actions                                                      |
| Aucun input competitif actif                                 |
| [Reconnexion] si drop                                        |
+--------------------------------------------------------------+
```

Regles:

- Pas de commande mini-jeu avant `RoundActive`.
- Les informations cachees du jeu ne sont pas presentes dans la projection.

## Round Actif

Source: sprints 09, 10, 11, 14, 15.

```text
+--------------------------------------------------------------+
| Partie X | ROUND_ACTIVE | Timer | Connexion                  |
+--------------------------------------------------------------+
| Zone mini-jeu                                                |
| +----------------------------------------------------------+ |
| | Rendu propre au mini-jeu                                | |
| | Commandes disponibles selon manifest                    | |
| +----------------------------------------------------------+ |
|                                                              |
| Feedback commande                                            |
| - Accepted: action recue                                     |
| - Rejected: raison traduite, prochaine action                |
| - Duplicate: deja pris en compte                            |
| - Late input: manche terminee                               |
|                                                              |
| [Envoyer mon action] [Terminer] si autorise                  |
+--------------------------------------------------------------+
```

Regles:

- Le client n'est jamais source de score.
- Les inputs deja soumis ne sont pas rejoues apres reconnexion.
- Le bouton principal doit etre stable pour eviter le double submit.

## Attente Verification

Source: sprints 10, 11, 13.

```text
+--------------------------------------------------------------+
| Partie X | ROUND_VERIFICATION | Connexion                    |
+--------------------------------------------------------------+
| Etat: Manche terminee                                        |
| Message: Les resultats sont en verification admin.           |
|                                                              |
| Ce qui est visible                                           |
| - Votre manche est terminee                                  |
| - Derniere annonce publique                                  |
| - Prochaine etape attendue                                   |
|                                                              |
| Ce qui n'est pas visible                                     |
| - Score provisoire                                           |
| - Rang provisoire                                            |
| - Evidence privee                                            |
|                                                              |
| [Actualiser] [Voir resultats] disabled avec explication      |
+--------------------------------------------------------------+
```

## Resultats Publies

Source: sprints 13, 19.

```text
+--------------------------------------------------------------+
| Partie X | RESULTS_PUBLISHED                                |
+--------------------------------------------------------------+
| Resultats officiels                                          |
| +----------------+ +----------------+ +-------------------+ |
| | Mon score      | | Rang public    | | Statut suite      | |
| +----------------+ +----------------+ +-------------------+ |
|                                                              |
| Details publics                                              |
| - Version publication                                        |
| - Date publication                                           |
| - Message admin                                              |
|                                                              |
| [Manche suivante] [Terminer] selon etat                      |
+--------------------------------------------------------------+
```

## Reconnexion Joueur

Source: sprints 09, 10, 11, 15.

```text
+--------------------------------------------------------------+
| Reconnexion live                                             |
+--------------------------------------------------------------+
| Connexion perdue.                                            |
| Place conservee: oui/non                                     |
| Dernier input: recu / inconnu / refuse                       |
| Temps restant pour reconnexion: mm:ss                        |
|                                                              |
| [Reconnexion] [Retour lobby] [Contacter support]             |
+--------------------------------------------------------------+
```

Regles:

- Si `RECONNECT_EXPIRED`, expliquer que la state view ne peut plus etre restauree.
- Si l'input est deja recu, ne jamais proposer de le rejouer.
