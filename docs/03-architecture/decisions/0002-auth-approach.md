# ADR 0002 - Authentification et RBAC

## Decision

Utiliser un cookie opaque `__Host-session` pour identifier les sessions authentifiées, avec un token SHA-256 haché stocké en base, et un système RBAC à 5 rôles système (PLAYER, SUPPORT, FINANCE, ADMIN, SUPER_ADMIN).

## Raisons

- **Pas de JWT** : éviter la dépendance à une bibliothèque de signature, la révocation complexe (blacklist), et l'exposition de données dans le token.
- **Pas d'OAuth externe** : ne pas dépendre d'un fournisseur d'identité externe pour le MVP. L'API doit fonctionner hors-ligne et sans latence réseau ajoutée.
- **Cookie opaque** : le token est une chaîne aléatoire opaque de 32 octets (256 bits) qui ne contient aucune information sur l'utilisateur. Seul le hash SHA-256 est stocké en base, protégeant contre les fuites de la table `auth_sessions`.
- **Révocation immédiate** : la suppression du hash en base (ou l'incrément de `sessionVersion`) révoque instantanément toutes les sessions de l'utilisateur. Aucune blacklist JWT nécessaire.
- **5 rôles système** : hérités de l'audit HEAD. Couvrent les parcours joueur, support, finance, administration et super-administration. Pas de hiérarchie entre SUPPORT, FINANCE et ADMIN — chaque rôle a un périmètre orthogonal défini par les permissions.
- **Permissions par action** : vérifiées côté serveur via `hasAnyPermission()` dans le domaine `game-engine`. Les rôles sont mappés à des permissions spécifiques (PARTY_START, RESULT_VERIFY, MANAGE_USERS, etc.).
- **scrypt pour le hash du mot de passe** : N=16384, r=8, p=1, sel 32 octets. Standard Node.js `crypto.scryptSync` sans dépendance npm.

## Conséquences

- Le middleware doit extraire le cookie, hacher le token, et chercher la session en base à chaque requête authentifiée. Cette latence est jugée acceptable (requête PostgreSQL indexée par token unique).
- Les tests API doivent manipuler le cookie de session dans les en-têtes HTTP.
- Le hash du mot de passe et le hash du token utilisent des algorithmes différents (scrypt vs SHA-256) — ne pas confondre.
- En développement, le cookie `__session` est utilisé sans Secure pour fonctionner en HTTP. La feature flag `ALLOW_INSECURE_AUTH_COOKIE` active ce mode. En production, seul `__Host-session` avec Secure est accepté.
- La durée de session est fixée à 7 jours, renouvelable à chaque reconnexion (rotation de token à implémenter en v0.2).
- Le rate limiting est implémenté en mémoire (sliding window) — à migrer vers Redis en production.

## Rôles et permissions

| Rôle        | Permissions                                           |
|-------------|-------------------------------------------------------|
| PLAYER      | (aucune permission système — joue via les parties)    |
| SUPPORT     | VIEW_AUDIT                                            |
| FINANCE     | MANAGE_PAYMENTS, VIEW_AUDIT                           |
| ADMIN       | PARTY_START, ROUND_START, RESULT_VERIFY, RESULT_PUBLISH, MANAGE_USERS, VIEW_AUDIT, READONLY_OBSERVE |
| SUPER_ADMIN | toutes les précédentes + MANAGE_PAYMENTS               |

## Décisions écartées

- **JWT signé** : écarté car la révocation nécessite une blacklist ou une durée très courte avec refresh token, complexifiant l'architecture sans bénéfice pour ce cas d'usage.
- **OAuth 2.0 / OIDC** : écarté pour le MVP. Réévaluer en v1.0 si un SSO ou une intégration externe est nécessaire.
- **Session en mémoire Redis uniquement** : écarté car la base PostgreSQL avec index unique sur le token offre des performances suffisantes et simplifie l'infrastructure. Redis pourra être ajouté comme cache optionnel en production.
- **Rôles hiérarchiques** : écarté. Les rôles FINANCE, SUPPORT et ADMIN sont orthogonaux — FINANCE ne peut pas administrer les parties, ADMIN ne peut pas gérer les paiements.

## Références

- [docs/03-architecture/security-model.md](file:///docs/03-architecture/security-model.md)
- [docs/00-audit/head-forensic-audit.md](file:///docs/00-audit/head-forensic-audit.md) (système de rôles legacy)
- [packages/game-engine/src/auth/policies.ts](../../../packages/game-engine/src/auth/policies.ts)
- [packages/contracts/proto/identity/v1/identity.proto](../../../packages/contracts/proto/identity/v1/identity.proto)
