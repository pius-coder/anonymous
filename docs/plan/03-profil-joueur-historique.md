# Feature 03 - Plan Scrum - Profil joueur et historique

## Objectif sprint

Livrer un profil joueur prive, un profil public minimal optionnel, un historique de sessions et des statistiques derivees.

## Dependances

- Feature 02 auth.
- Feature 05 inscriptions.
- Feature 12 resultats pour statistiques finales completes.

## User stories

### Story 3.1 - Profil prive

Etapes :

1. Creer `GET /v1/players/me`.
2. Creer `PATCH /v1/players/me`.
3. Valider pseudo, avatar, preferences.
4. Verifier ownership par session auth.
5. Auditer changement pseudo/avatar si necessaire.

Tests :

- Lecture profil connecte.
- Non connecte refuse.
- Pseudo invalide refuse.
- Pseudo duplique refuse.

### Story 3.2 - Historique sessions

Etapes :

1. Creer `GET /v1/players/me/history`.
2. Retourner sessions futures, live, terminees, annulees, no-show.
3. Masquer details financiers non necessaires.
4. Ajouter pagination.

Tests :

- Historique filtre par utilisateur.
- Annulees/remboursees separees.
- Aucun autre joueur visible.

### Story 3.3 - Statistiques derivees

Etapes :

1. Creer fonction de recomputation depuis `GameResult`, `RoundResult`, `LedgerEntry`.
2. Creer `PlayerStatsSnapshot`.
3. Lancer recomputation apres finalisation session.
4. Afficher win rate, sessions jouees, sessions gagnees, credits gagnes.

Tests :

- Stats derivees des resultats.
- Stats non modifiables manuellement.
- Ledger source pour credits.

### Story 3.4 - Profil public minimal

Etapes :

1. Creer `GET /v1/players/:publicId`.
2. Exposer pseudo, avatar, stats publiques autorisees.
3. Masquer email, telephone, wallet, ledger, paiements.
4. Ajouter option de visibilite.

Tests :

- Profil public masque donnees privees.
- Profil prive retourne 403/404 selon policy.

## Definition of Done

- Profil et historique utilisables.
- Stats coherentes avec resultats officiels.
- Donnees sensibles protegees.
- Tests ownership et privacy passent.

