# UI Foundation

## Positionnement

`apps/web` doit fonctionner comme une console de partie live:

- joueur: savoir quoi faire maintenant;
- admin: decider explicitement sans controler le client joueur;
- observer: suivre sans influencer;
- support: diagnostiquer sans commande competition;
- finance: lire et reconciler l'argent sans action round;
- systeme/worker: exposer des statuts lisibles, jamais des commandes manuelles cachees.

## Principes UX

| Principe                        | Application locale                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| Etat systeme toujours visible   | Chaque ecran affiche phase, connexion, derniere synchro et prochaine action possible.         |
| Actions consequentes confirmees | Lancer, pauser, fermer, corriger, publier, waiver demandent confirmation ou raison.           |
| Erreurs actionnables            | Une erreur dit quoi s'est passe, pourquoi c'est bloque et quelle action est possible.         |
| Separation des audiences        | Joueur, admin, observer, support et finance n'ont pas les memes donnees ni les memes CTA.     |
| No fallback vague               | `En attente du serveur...` est interdit comme etat final.                                     |
| Mobile lisible                  | Les workflows joueur doivent etre utilisables sur mobile; admin peut prioriser desktop dense. |
| No-leak par defaut              | Les champs prives sont absents des composants plutot que masques visuellement.                |

## Recherche UX Appliquee

- Les statuts dynamiques doivent etre visibles et annoncables: chargement d'une room, attente paiement, reconnexion, verification score, retry worker.
- Les erreurs doivent rester proches de l'action bloquee: champ invalide, commande refusee, paiement echoue, role insuffisant.
- Les dashboards admin/finance/support doivent prioriser monitoring, comparaison et action explicite, pas une mise en page marketing.
- Les paiements doivent etre modelises comme un cycle d'etats observable, pas comme un bouton unique qui masque `pending`, `requires_action`, `processing`, `confirmed` ou `failed`.
- Les surfaces sensibles doivent appliquer le moindre privilege visible: role finance pour ledger, support readonly pour diagnostic, admin pour commande de round, joueur pour actions personnelles.

## Layouts Cibles

### Public

- Header simple: marque, parties, compte.
- Contenu centre: catalogue, detail partie, statut d'inscription.
- CTA unique principal par etat.

### Joueur

- Header compact: partie, phase, connexion.
- Zone principale: action courante.
- Bandeau bas ou lateral: statut personnel, annonce, reconnect, support.
- Aucun panneau admin, aucun score provisoire.

### Admin

- Layout desktop dense.
- Navigation par onglets: Vue globale, Participants, Connexions, Round, Scores, Incidents, Audit.
- Barre d'etat persistante: lifecycle, live, lease, anomalies, derniere synchro.
- Rail d'actions sensibles separe des panneaux de lecture.

### Observer

- Layout lecture seule.
- Snapshot global au centre.
- Timeline publique ou progression filtrée.
- Aucun input de jeu.

### Support

- Layout dossier.
- Recherche participant/partie.
- Timeline, incidents, snapshots autorises.
- Boutons de commande competition absents.

### Finance

- Layout ledger.
- Recherche transaction, participation, paiement.
- Reconciliation et statut.
- Aucune commande round ou publication.

## Etats Transverses

| Etat              | Requis UI                                                                             |
| ----------------- | ------------------------------------------------------------------------------------- |
| Loading           | Dire exactement ce qui charge: participation, room, snapshot, ledger, scores publies. |
| Empty             | Dire ce qui manque et l'action possible.                                              |
| Error recoverable | Message clair, retry, retour ecran precedent.                                         |
| Error blocking    | Code produit lisible, contact support si necessaire.                                  |
| Denied            | Role manquant ou participation absente, sans fuite de donnees.                        |
| Stale             | Afficher derniere synchro, bloquer action sensible si etat obsolete.                  |
| Reconnecting      | Afficher place conservee, input recu ou non, delai de reconnexion.                    |
| Success           | Confirmer l'action, indiquer la prochaine etape.                                      |

## Garde-Fous UI

- Un bouton absent vaut mieux qu'un bouton interdit quand le role n'a pas l'action.
- Un bouton disabled doit expliquer la condition manquante.
- Une modal de confirmation doit afficher consequence, acteur, entite et raison si requise.
- Un affichage readonly doit mentionner le mode lecture seule dans son chrome.
- Les timers affichent des deadlines, mais ne declenchent pas seuls un start actif.
