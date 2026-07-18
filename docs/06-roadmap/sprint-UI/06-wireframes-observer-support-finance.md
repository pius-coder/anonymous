# Wireframes - Observer, Support, Finance, Notifications

## Observer Snapshot Global

Source: sprints 09, 10, 13, 16.

```text
+--------------------------------------------------------------+
| Observer | Lecture seule | Snapshot: fresh/stale             |
+--------------------------------------------------------------+
| Partie: nom, phase publique, progression                     |
|                                                              |
| Snapshot global                                              |
| +----------------------------------------------------------+ |
| | Etat public de la manche                                | |
| | Progression agregee                                    | |
| | Evenements publics                                     | |
| +----------------------------------------------------------+ |
|                                                              |
| Resultats                                                   |
| - Non publies: masque                                       |
| - Publies: affichage public                                 |
|                                                              |
| Aucun bouton de jeu                                          |
+--------------------------------------------------------------+
```

Regles:

- Aucun input, meme si client manipule.
- Aucun private state, reponse cachee, score provisoire ou paiement.
- Carte/social absent tant qu'un use case produit n'est pas valide.

## Joueur Elimine En Spectateur

Source: sprint 16.

```text
+--------------------------------------------------------------+
| Joueur elimine | Mode spectateur joueur                      |
+--------------------------------------------------------------+
| Message: Vous ne pouvez plus jouer cette manche.             |
| Droits: lecture contextualisee joueur elimine                |
| Snapshot public + statut personnel autorise                  |
| [Continuer en spectateur] [Voir resultats publies]           |
+--------------------------------------------------------------+
```

Regles:

- Distinct de l'observateur externe.
- Aucun retour a input actif sans transition serveur autorisee.

## Support Dossier Partie

Source: sprints 04, 06, 08, 11, 12, 16, 18.

```text
+--------------------------------------------------------------------------------+
| Support | Dossier partie | Readonly                                            |
+--------------------------------------------------------------------------------+
| Recherche: partie, joueur, transaction publique autorisee                      |
|                                                                                |
| Resume dossier                                                                  |
| Etat partie | Participant | Connexion | Paiement public | Derniere erreur       |
|                                                                                |
| Onglets: Timeline | Participant | Snapshot autorise | Incidents | Audit         |
|                                                                                |
| Actions support                                                                 |
| [Ouvrir incident] [Ajouter note] [Voir audit]                                   |
|                                                                                |
| Actions absentes                                                                |
| Lancer, pauser, publier, corriger score, jouer a la place du joueur             |
+--------------------------------------------------------------------------------+
```

## Snapshot Joueur Readonly

Source: sprints 11, 12, 16.

```text
+--------------------------------------------------------------------------------+
| Snapshot joueur | Readonly | Audience: support/admin                           |
+--------------------------------------------------------------------------------+
| Phase joueur | Connexion | Dernier input status | Erreur bloquante             |
|                                                                                |
| State view autorisee                                                            |
| - Statut preparation                                                            |
| - Statut round                                                                  |
| - Feedback public ou personnel autorise                                         |
|                                                                                |
| Champs explicitement absents                                                    |
| - Reponses cachees                                                              |
| - Score provisoire hors admin scoring                                           |
| - Tokens live                                                                   |
| - Secrets provider                                                              |
+--------------------------------------------------------------------------------+
```

## Compliance Gate

Source: sprints 05, 18.

```text
+--------------------------------------------------------------------------------+
| Compliance gate                                                                |
+--------------------------------------------------------------------------------+
| Gate: type, entite, severite, statut                                           |
| Evidence: redigee, lien audit, impact produit                                  |
|                                                                                |
| Decision                                                                       |
| [Valider le gate] [Waiver avec raison] [Maintenir bloque]                      |
|                                                                                |
| Raison obligatoire                                                             |
| [Textarea raison.........................................................]     |
+--------------------------------------------------------------------------------+
```

Regles:

- Pas de waiver sans raison.
- Les donnees sensibles sont redigees.

## Finance Ledger

Source: sprints 04, 07, 13, 19.

```text
+--------------------------------------------------------------------------------+
| Finance | Ledger                                                               |
+--------------------------------------------------------------------------------+
| Recherche: transaction, user, party, idempotency key                           |
|                                                                                |
| Table mouvements                                                               |
| Time | Type | Amount | Status | Idempotency | Provider ref | Audit             |
|                                                                                |
| Detail transaction                                                             |
| Provider public status | Wallet movement | Reconciliation state                |
|                                                                                |
| Actions                                                                        |
| [Reconciler] [Voir audit finance]                                              |
+--------------------------------------------------------------------------------+
```

Regles:

- Aucune commande round.
- Aucun debit double si retry.
- Gains seulement apres publication validee.

## Notification Delivery

Source: sprints 08, 17.

```text
+--------------------------------------------------------------------------------+
| Notification delivery                                                          |
+--------------------------------------------------------------------------------+
| Job: type, cible, statut, idempotency key                                      |
| Status path: PENDING -> SENT -> DELIVERED / FAILED / UNDELIVERED               |
|                                                                                |
| Logs                                                                           |
| Time | Event | Channel | Public detail | Redacted provider error               |
|                                                                                |
| Actions                                                                        |
| [Retry] [Acknowledge] [Retour lobby] selon acteur                              |
+--------------------------------------------------------------------------------+
```

Regles:

- Delivery status visible admin/support selon role.
- Joueur voit un message comprehensible et un lien utile.
- Provider indisponible ne bloque pas le lifecycle.
