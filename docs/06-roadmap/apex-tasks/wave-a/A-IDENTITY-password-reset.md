# A-IDENTITY - Reset password et sessions

## Mission autonome

Apres merge de SEQ-00/01/02, implementer avec APEX le reset password complet sans modifier contrats,
Prisma ou tooling. User story : en tant qu'utilisateur, je demande un reset sans revelation de compte,
puis je remplace mon mot de passe et toutes les anciennes sessions deviennent invalides.

## Ownership

`apps/api/src/auth/**`, use-cases auth/identity, implementation `identity-service.ts`, routes auth;
`apps/web/src/services/AuthService.ts`, composants et routes `/auth/**`; tests correspondants.

## Interdit

`packages/contracts/**`, `packages/db/prisma/**`, fichiers racine/Turbo/CI, routeur RPC central,
`apps/web/src/services/rpcServices.ts` et autres domaines. Consommer les APIs publiques DB et contrats
livres par SEQ-01/02.

## Demarrage obligatoire

Verifier commit/status, lire AGENTS, gap analysis, sprints 04, docs auth/securite, contrats Identity et
legacy auth. Context7 : ConnectRPC, Next.js et Prisma selon les frontieres touchees.

## AC

- Request retourne une reponse identique que l'email existe ou non.
- Token opaque, expire, usage unique; nouveau mot de passe conforme.
- Reset incremente/revoque la version de session; anciennes sessions et live tokens sont refuses.
- Rate limit, audit sans secret et erreurs publiques stables.
- UI couvre loading, success generique, invalide/expire, retry et accessibilite.

## Tests et sortie

L1 validation, L3 PostgreSQL token/revocation, L4 ConnectRPC, L5 request->reset->login et ancien cookie
refuse. Executer docs, tests scopes, integration, E2E auth, typecheck, lint, build, diff check. Livrer un
commit atomique et un rapport AC -> test; ne pas monter le service dans `rpc/routes.ts`.
