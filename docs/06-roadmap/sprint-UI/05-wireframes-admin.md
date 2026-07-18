# Wireframes - Admin Command Center

## Liste Parties Admin

Source: sprints 03, 05.

```text
+--------------------------------------------------------------------------------+
| Admin | Parties | Support | Finance si role                                    |
+--------------------------------------------------------------------------------+
| Parties admin                                                                  |
| [Creer une partie]                                                             |
|                                                                                |
| Filtres: Draft | Scheduled | Preparation | Live | Verification | Completed     |
|                                                                                |
| Table                                                                          |
| Nom | Etat | Horaire | Participants | Anomalies | Derniere maj | Actions       |
| ... | ...  | ...     | ...          | ...       | ...          | [Setup][Control]|
+--------------------------------------------------------------------------------+
```

## Setup Partie

Source: sprints 03, 05, 14, 18.

```text
+--------------------------------------------------------------------------------+
| Partie draft/scheduled | Statut config | Gates                                 |
+--------------------------------------------------------------------------------+
| Colonne gauche: Form configuration                                             |
| - Nom, horaire, capacite, prix, conditions                                     |
| - Mini-jeu si framework disponible                                             |
| - Messages validation par champ                                                |
|                                                                                |
| Colonne droite: Preview publique                                               |
| - Ce que le joueur verra                                                       |
| - Champs exclus admin                                                          |
|                                                                                |
| Gates                                                                          |
| - Compliance: OK/Bloque                                                        |
| - Paiement/config: OK/Bloque                                                   |
|                                                                                |
| Actions                                                                        |
| [Enregistrer brouillon] [Valider configuration] [Publier] [Planifier]          |
+--------------------------------------------------------------------------------+
```

Regles:

- Publier ne demarre jamais le live.
- Si gate bloque, action disabled + detail exploitable.

## Command Center Global

Source: sprints 08, 09, 10, 12, 13, 16, 18.

```text
+--------------------------------------------------------------------------------+
| Party Control | Etat: PREPARATION_OPEN / ACTIVE_ROUND / VERIFICATION           |
| Live: stable/stale | Lease: actif/absent | Derniere synchro                    |
+--------------------------------------------------------------------------------+
| Tabs: Vue globale | Participants | Connexions | Round | Scores | Incidents | Audit |
+--------------------------------------------------------------------------------+
| Vue globale                                                                    |
| +------------------+ +------------------+ +------------------+                 |
| | Participants     | | Connexions       | | Anomalies        |                 |
| | presents/prets   | | connected/drop   | | bloque/pending   |                 |
| +------------------+ +------------------+ +------------------+                 |
|                                                                                |
| Timeline recente                                                               |
| Heure | Acteur | Evenement | Resultat | Correlation                            |
|                                                                                |
| Rail actions sensibles                                                         |
| [Ouvrir preparation] [Confirmer depart] [Lancer briefing]                      |
| [Demarrer manche] [Pause] [Reprendre] [Fermer manche] [Publier resultats]      |
+--------------------------------------------------------------------------------+
```

Regles:

- Rail actions masque/disabled selon role, phase, lease et stale state.
- Les panneaux de lecture restent accessibles si la commande est bloquee.

## Participants Et Readiness

Source: sprints 06, 08, 12.

```text
+--------------------------------------------------------------------------------+
| Participants                                                                   |
+--------------------------------------------------------------------------------+
| Compteurs: invites | inscrits | payes | presents | prets | absents             |
| Filtres: paiement bloque | absent | pret | deconnecte | anomalie              |
|                                                                                |
| Table                                                                          |
| Joueur | Participation | Paiement | Presence | Pret | Connexion | Actions      |
| ...    | REGISTERED    | OK       | PRESENT  | READY| connected | [Readonly]   |
|                                                                                |
| Action phase                                                                   |
| [Confirmer avec absents] -> modal raison obligatoire                           |
+--------------------------------------------------------------------------------+
```

## Annonces Et Delivery

Source: sprints 08, 17.

```text
+--------------------------------------------------------------------------------+
| Annonces preparation                                                           |
+--------------------------------------------------------------------------------+
| Composer                                                                       |
| [Message annonce.........................................................]     |
| Cible: participants eligibles / tous inscrits                                  |
| [Envoyer l'annonce]                                                            |
|                                                                                |
| Delivery status                                                                |
| Job | Cible | Pending | Sent | Failed | Last error redigee | Actions           |
| ... | ...   | ...     | ...  | ...    | ...                | [Retry]           |
+--------------------------------------------------------------------------------+
```

Regles:

- Erreur provider redigee, aucun secret.
- Notification ne change pas le lifecycle.

## Round Control

Source: sprints 10, 11, 14, 15.

```text
+--------------------------------------------------------------------------------+
| Round                                                                           |
+--------------------------------------------------------------------------------+
| Configuration                                                                  |
| Mini-jeu | Duree | Deadline | Participants admis | Manifest version            |
|                                                                                |
| Phase                                                                          |
| RoundSetup -> RoundBriefing -> RoundActive -> RoundClosing -> Verification     |
|                                                                                |
| Controls                                                                       |
| [Lancer briefing] [Demarrer manche] [Mettre en pause] [Reprendre] [Fermer]     |
|                                                                                |
| Live signals                                                                   |
| Late inputs | duplicate nonce | disconnects | suspicious rate                  |
+--------------------------------------------------------------------------------+
```

Regles:

- Fermer techniquement la manche ne publie pas les scores.
- Pause/reprise exige timer coherent.

## Scores Provisoires Et Publication

Source: sprints 12, 13, 18.

```text
+--------------------------------------------------------------------------------+
| Scores provisoires                                                             |
+--------------------------------------------------------------------------------+
| Statut: SCORE_UNDER_REVIEW | Publication: bloquee/possible                     |
|                                                                                |
| Table                                                                          |
| Joueur | Score provisoire | Evidence | Anomalie | Review | Actions            |
| ...    | ...              | hash     | yes/no   | pending| [Corriger]         |
|                                                                                |
| Panneau correction                                                             |
| Nouveau score | Raison obligatoire | Preview version                           |
| [Valider correction]                                                           |
|                                                                                |
| Publication                                                                    |
| Conditions: all reviewed, gates OK, role OK, lease OK                          |
| [Publier les resultats] -> confirmation consequence                            |
+--------------------------------------------------------------------------------+
```

Regles:

- Score provisoire visible admin autorise uniquement.
- Support voit la timeline ou les anomalies selon role, pas correction/publication par defaut.
- Publication double doit etre idempotente ou refusee selon decision.

## Audit Et Incidents

Source: sprints 12, 18, 19.

```text
+--------------------------------------------------------------------------------+
| Audit / Incidents                                                              |
+--------------------------------------------------------------------------------+
| Filtres: acteur | entite | type | resultat | correlationId                     |
|                                                                                |
| Timeline                                                                       |
| Time | Actor | Role | Action | Entity | Reason | Result | Correlation          |
|                                                                                |
| Incidents                                                                      |
| ID | Severity | Status | Owner | Related player/round | Actions                |
|                                                                                |
| [Ouvrir incident] [Ajouter note] [Resoudre] selon permission                   |
+--------------------------------------------------------------------------------+
```
