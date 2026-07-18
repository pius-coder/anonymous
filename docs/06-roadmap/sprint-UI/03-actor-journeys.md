# Actor Journeys

## Joueur

```text
Catalogue
  -> Detail partie
  -> Inscription
  -> Paiement si requis
  -> Statut participation
  -> Lobby preparation
  -> Briefing round
  -> Round actif
  -> Attente verification
  -> Resultats publies
  -> Manche suivante ou fin
```

### Points UI critiques

- Le joueur voit toujours sa phase personnelle.
- La participation, le paiement, la presence, le pret et la connexion live sont des statuts separes.
- Apres fin de manche, l'ecran indique verification admin en cours et masque score/rang/evidence.
- En reconnexion, l'UI indique si la place est conservee et si le dernier input a ete recu.

## Admin

```text
Admin parties
  -> Setup partie
  -> Publication / planification
  -> Command center
  -> Preparation + annonce
  -> Confirmation lancement
  -> Briefing / round actif
  -> Pause / reprise / fermeture
  -> Scores provisoires
  -> Correction avec raison
  -> Publication
  -> Manche suivante ou fin
```

### Points UI critiques

- Le command center separe lecture, decision et publication.
- Les actions sensibles restent regroupees dans un rail visible, jamais melangees aux snapshots.
- La presence d'un lease ou d'un etat stale bloque les actions sensibles.
- L'admin peut ouvrir une vue joueur readonly, jamais jouer a sa place.

## Observateur

```text
Lien observe
  -> Verification permission
  -> Snapshot global
  -> Snapshot round readonly
  -> Resultats publics apres publication
```

### Points UI critiques

- Aucun bouton d'input.
- Aucun score provisoire.
- Aucun private state de mini-jeu.
- Etat stale et reconnect visibles.

## Support

```text
Recherche dossier
  -> Dossier partie / participant
  -> Timeline et erreurs
  -> Snapshot autorise
  -> Incident
  -> Audit
```

### Points UI critiques

- Les commandes competition sont absentes.
- Les erreurs sont redigees: pas de secret provider, token, reponse cachee ou payload brut.
- Le support peut creer ou suivre un incident selon permission, pas publier ni lancer.

## Finance

```text
Recherche transaction
  -> Ledger
  -> Detail paiement
  -> Reconciliation
  -> Audit finance
```

### Points UI critiques

- Finance ne voit pas les commandes round.
- Admin peut voir un blocage paiement, mais pas modifier le ledger.
- Les gains post-publication restent gates par publication validee.
