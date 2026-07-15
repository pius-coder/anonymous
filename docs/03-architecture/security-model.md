# Security Model

## Regles

- Auth serveur et cookies securises.
- RBAC exact pour admin/support/finance/super admin.
- Participation obligatoire pour entrer dans le live joueur.
- Tokens live courts retournes une seule fois et stockes uniquement sous forme de hash si persistes.
- Observateur lecture seule avec permission explicite.
- Scores non publies visibles uniquement admin autorise.
- Events live filtres par audience.
- Audit pour action sensible.

## Donnees sensibles

- Paiements, wallet, emails, telephones, tokens, roles prives, reponses cachees de mini-jeux, scores provisoires.
