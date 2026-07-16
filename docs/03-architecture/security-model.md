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

## Reset password et revocation

- `RequestPasswordReset` renvoie toujours la meme reponse publique (pas d'enumeration de comptes).
- Token de reset opaque, stocke en hash SHA-256, TTL court, usage unique (`consumedAt`).
- `ResetPassword` met a jour le hash scrypt, consomme le token, appelle `revokeUserSessions`
  (increment `sessionVersion` + suppression des `AuthSession`) et supprime les connexions live
  associees aux participations de l'utilisateur.
- Rate limit sur request/reset ; audit `PASSWORD_RESET_REQUEST` / `PASSWORD_RESET` sans token ni mot de passe.
- Livraison du lien via job notification `PASSWORD_RESET` (payload interne pour le worker, hors reponse RPC).

## Donnees sensibles

- Paiements, wallet, emails, telephones, tokens, roles prives, reponses cachees de mini-jeux, scores provisoires.
