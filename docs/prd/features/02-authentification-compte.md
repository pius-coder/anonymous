# Feature 02 - Authentification et gestion de compte

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Creer et proteger les comptes joueurs/admins, les sessions serveur, les roles et l acces aux operations sensibles.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Permettre aux joueurs et admins de creer un compte, se connecter, gerer leur session serveur et proteger paiement, wallet, live, support et back-office. |
| Target users | joueurs, admins, support, finance, super admin |
| Business value | Elevee: auth obligatoire pour payer, jouer, tracer les actions, gerer le wallet et prevenir les abus. |
| Technical complexity | Moyenne a elevee: Hono, Prisma, sessions serveur, cookies securises, RBAC, audit, reset password et possible 2FA admin. |
| Risk level | Eleve: usurpation de compte, fixation de session, acces admin non autorise, multi-compte et fuite de donnees. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Registration joueur avec mot de passe choisi.
- Login/logout, reset password, session serveur en base et cookie securise.
- RBAC pour PLAYER, SUPPORT, FINANCE, ADMIN, SUPER_ADMIN.
- Audit des changements critiques et revocation de sessions.

## Parcours et workflows

1. Register: validation identifiant -> hash password -> creation User + PlayerProfile + AuthSession.
2. Login: verifier credentials -> regenerer session -> emettre cookie HttpOnly/Secure/SameSite.
3. Privilege change/reset: invalider ou regenerer sessions concernees.
4. Admin access: verifier role exact sur chaque endpoint, pas seulement dans UI.

## Logiques metier et invariants

- Le joueur choisit son mot de passe.
- Identifiant email ou telephone selon decision produit finale; admins email + mot de passe.
- Les sessions navigateur sont serveur-side avec cookie securise.
- Les roles distinguent joueur, support, finance, admin, super admin.
- Tout changement critique de compte produit un AuditLog.
- Regeneration de session apres login et changement de privilege.
- Deny by default sur endpoints sensibles.

## Donnees principales

- `User`
- `PlayerProfile`
- `AuthSession`
- `PasswordResetToken`
- `RoleAssignment`
- `AuditLog`

## API et contrats

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/logout`
- `POST /v1/auth/password/request-reset`
- `POST /v1/auth/password/reset`
- `GET /v1/me`

Erreurs et cas limites a normaliser :

- `409_EMAIL_ALREADY_USED`
- `409_PHONE_ALREADY_USED`
- `401_INVALID_CREDENTIALS`
- `403_ACCOUNT_DISABLED`
- `403_ROLE_REQUIRED`
- `429_LOGIN_RATE_LIMITED`

## Evenements et jobs

- `auth.user-created`
- `auth.login-succeeded`
- `auth.login-failed`
- `auth.session-revoked`
- `account.critical-change`
- `role.changed`

## Securite, conformite et audit

- Hash passwords with a slow password hashing function; never store plaintext.
- Cookie HttpOnly, Secure, SameSite, expiration and rotation.
- Protect against session fixation and replay.
- Rate limit login/reset endpoints.
- Store only minimal personal data and avoid secrets in logs.

## Criteres d acceptation

- Register duplicate email/phone.
- Login invalid password and rate limiting.
- Cookie attributes.
- Session rotation after login/role change.
- Admin endpoint denied for PLAYER/SUPPORT if role insufficient.
- Reset token expired/used twice.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `login_success_rate`
- `login_failed_rate`
- `password_reset_request_rate`
- `invalid_session_rate`
- `authorization_denied_rate`
- `admin_login_count`

## Dependances fonctionnelles

- Feature 03 PlayerProfile
- Feature 05 inscription requires auth
- Feature 13 admin dashboard RBAC
- Feature 15 security/compliance

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- OWASP Session Management and Authorization
- Next.js Authentication/Data Security
- Hono cookies/middleware
- Prisma transactions for User + PlayerProfile + AuthSession

References officielles techniques :

- Next.js App Router, Authentication, Data Security, Metadata: https://nextjs.org/docs/llms.txt
- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt
- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt
- PostgreSQL transaction isolation and retry expectations: https://www.postgresql.org/docs/current/transaction-iso.html
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP Authorization / API Security / Business Logic / Logging guidance: https://cheatsheetseries.owasp.org/

## Questions ouvertes

- Email, telephone or both for player identity.
- 2FA admin in V1 or post-MVP.
- Email/phone verification timing.
- Anti multi-compte policy.
