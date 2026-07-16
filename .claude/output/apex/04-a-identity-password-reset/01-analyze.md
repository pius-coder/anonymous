# Analyze — A-IDENTITY password reset

## Constat

- Contrats Identity déjà figés (SEQ-01) : `RequestPasswordReset`, `ResetPassword`.
- Persistence déjà prête (SEQ-02) : `PasswordResetToken`, `authRepository.*`, `sessionVersion`.
- Auth existante : register/login/logout via Connect + use-cases ; **pas** de handlers reset.
- UI request partielle (`ResetPasswordForm` + `AuthService`) ; **pas** de page confirm token.
- Ownership respecté : pas de modification contrats/Prisma/routes.ts.

## AC

1. Request réponse identique email connu/inconnu
2. Token opaque hashé, expire, usage unique ; password ≥ 8
3. Reset → revoke sessions (`sessionVersion++`) + live tokens
4. Rate limit + audit sans secret
5. UI loading / success générique / invalid-expire / retry / a11y
