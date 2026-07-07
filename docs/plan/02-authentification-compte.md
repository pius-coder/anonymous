# Feature 02 - Plan Scrum - Authentification et compte

## Objectif sprint

Permettre aux joueurs et admins de creer un compte, se connecter, gerer une session serveur et proteger les roles.

## Dependances

- Sprint 0 termine.
- Feature 01 peut utiliser auth optionnelle apres livraison.

## Gate documentaire obligatoire

Avant implementation :

1. Lire via Context7 Next.js Authentication/Data Security si le web lit la session.
2. Lire via Context7 Hono cookies/middleware pour poser, lire et supprimer les cookies.
3. Lire via Context7 Prisma transactions pour creation atomique `User` + `PlayerProfile` + `AuthSession`.
4. Lire les references OWASP Session Management, Authorization et Password Storage.
5. Verifier la librairie de hash retenue et sa documentation actuelle avant installation.
6. Documenter les attributs cookies exacts et le pattern de regeneration de session avant de coder.

## User stories

### Story 2.1 - Schema auth

Etapes :

1. Ajouter `User`, `PlayerProfile`, `AuthSession`, `PasswordResetToken`, `RoleAssignment` si absents.
2. Ajouter contraintes uniques email/telephone selon choix produit.
3. Ajouter enum role.
4. Ajouter migration.
5. Ajouter seed admin local.

Tests :

- Migration.
- Creation user + profile atomique.
- Unicite email/telephone.

### Story 2.2 - Register joueur

Etapes :

1. Creer `POST /v1/auth/register`.
2. Valider input.
3. Hasher le mot de passe.
4. Creer `User`, `PlayerProfile`, `AuthSession` en transaction.
5. Poser cookie `HttpOnly`, `Secure`, `SameSite`.
6. Ecrire audit `auth.user-created`.

Tests :

- Register OK.
- Doublon refuse.
- Mot de passe jamais stocke en clair.
- Cookie securise.

### Story 2.3 - Login/logout

Etapes :

1. Creer `POST /v1/auth/login`.
2. Verifier credentials.
3. Rate limit login.
4. Regenerer session apres login.
5. Creer `POST /v1/auth/logout`.
6. Revoquer session.

Tests :

- Login OK.
- Password invalide.
- Compte desactive refuse.
- Logout invalide session.
- Rate limit.

### Story 2.4 - RBAC et `/me`

Etapes :

1. Creer `GET /v1/me`.
2. Creer middleware auth required.
3. Creer middleware role required.
4. Proteger routes admin.
5. Ajouter audit pour changement critique.

Tests :

- Player refuse admin.
- Support refuse finance si non autorise.
- Session expiree refuse.
- Changement role regenere session.

## Definition of Done

- Criteres de tests a valider :
  - Tests unitaires validation register/login.
  - Tests integration register, login, logout, `/me`.
  - Tests securite cookies `HttpOnly`, `Secure`, `SameSite`.
  - Tests RBAC positifs et negatifs.
  - Tests rate limit login/reset.
  - Test non-regression fixation de session : session regeneree apres login/changement privilege.
- Register/login/logout/me fonctionnels.
- Cookies securises.
- RBAC applique cote serveur.
- Tests auth et autorisation passent.
- Feature 01 peut afficher CTA selon etat auth.
