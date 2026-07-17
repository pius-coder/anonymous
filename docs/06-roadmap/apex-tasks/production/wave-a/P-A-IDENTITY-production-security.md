# P-A-IDENTITY - Identite et sessions durcies

## Mission autonome

Livrer inscription, connexion, reset, session courante et revocation exploitables en multi-instance,
sans exposer le token de session au JavaScript et avec des controles d'abus partages.

## Prerequis et lectures

- P-SEQ-00/02/03 merges.
- Lire ADR auth, securite, contrats Identity, audit production et legacy auth pertinent.
- Context7 : Hono, ConnectRPC, Next.js cookies/headers et Redis client utilise.

## Ownership

Use-cases/repositories exposes Identity, middleware session/rate-limit/origin, routes/composants auth,
intents et contenu fonctionnel du reset, tests. Les templates/rendus/delivery appartiennent a
P-A-NOTIFICATIONS. Consommer contracts/DB figes.

## Interdit

Proto, schema/migrations, routeur RPC central, provider notification et configuration racine. Aucun
`session_token` lu par le navigateur, aucun rate limit memoire en production, aucune enumeration email.

## Livrables production

- cookie `__Host-` Secure/HttpOnly/SameSite et trust proxy explicite;
- reponses navigateur sans token de session brut; rotation, revocation et multi-device decidees;
- rate limit Redis atomique par IP/identite/action et journal securite sans PII inutile;
- reset atomique, token usage unique/court, payload notification sans secret durable;
- politique Origin/CSRF, taille payload, erreurs uniformes et consentement versionne a l'inscription;
- invitation/provisionnement des comptes ADMIN/FINANCE/SUPPORT, MFA approuve, step-up pour actions
  sensibles, changement de role, offboarding/revocation et revue periodique des acces;
- UI loading/error/expired/retry et sessions compte sans donnees hardcodees.

## Criteres d'acceptation

- header proxy forge ne desactive pas Secure et ne contourne pas le rate limit;
- reset simultane n'accepte qu'un token et revoque les sessions prevues;
- logout/revocation coupe API et live;
- ADMIN/SUPPORT/FINANCE/Joueur suivent la matrice domaine;
- une action payout/compensation/role sensible sans MFA/step-up recent est refusee et auditee;
- logs, Proto, HTML et storage navigateur ne contiennent aucun token brut.

## Tests et sortie

L1 politiques, L3 Redis/PostgreSQL concurrence, L4 Connect/cookies/proxy/origin, L5 register-reset-login-
revoke multi-contexte. Gates du lot, commit atomique et rapport de menaces residuelles.
