# Sprint 04 - Identity auth et RBAC

## Objectif

Rebatir une authentification modulaire avec autorisations serveur. Hors scope: choisir OAuth/JWT/provider
externe sans decision documentee.

## User Stories Produit

| ID | Role | User story | Valeur produit | Priorite |
|---|---|---|---|---|
| US-04-01 | Joueur | En tant que joueur, je veux creer une session et me deconnecter, afin de proteger mon compte. | Le joueur controle sa session. | Must |
| US-04-02 | Admin | En tant qu'admin, je veux que les commandes admin soient refusees aux joueurs, afin de proteger la competition. | RBAC serveur effectif. | Must |
| US-04-03 | Support | En tant que support, je veux lire un dossier sans boutons competitifs, afin d'aider sans agir sur le jeu. | Support read-only par defaut. | Must |
| US-04-04 | Finance | En tant que finance, je veux chercher des transactions sans acceder aux commandes round, afin de separer argent et jeu. | Perimetre finance isole. | Must |

## Scenarios D'Acceptation Atomiques

| ID | Story | Surface | Given | When | Then | UML liee | Contrat/Test |
|---|---|---|---|---|---|---|---|
| AC-04-01 | US-04-01 | Page inscription | Email/password valides | Le joueur clique `Creer mon compte` | Session creee, utilisateur courant visible | [permissions](../../03-architecture/uml/permissions.md) | `Register` + test auth |
| AC-04-02 | US-04-01 | Page connexion | Identifiants valides | Le joueur clique `Se connecter` | Cookie/session opaque cree, redirection autorisee | [sequences](../../03-architecture/uml/sequences.md) | `Login` + integration |
| AC-04-03 | US-04-01 | Menu compte | Session active | Le joueur clique `Se deconnecter` | Session revoquee, retour public | [sequences](../../03-architecture/uml/sequences.md) | `Logout` + test |
| AC-04-04 | US-04-02 | Route admin | Role `PLAYER` seulement | Le joueur force `Publier la partie` | Bouton absent/disabled ou API `PERMISSION_DENIED` | [permissions](../../03-architecture/uml/permissions.md) | RBAC route test |
| AC-04-05 | US-04-03 | Dossier support | Role `SUPPORT` | Le support clique `Voir dossier` | Dossier lisible, commandes competition absentes | [permissions](../../03-architecture/uml/permissions.md) | Test no-command |
| AC-04-06 | US-04-04 | Vue ledger | Role `FINANCE` | La finance clique `Rechercher transaction` | Transactions visibles sans commandes admin round | [permissions](../../03-architecture/uml/permissions.md) | RBAC finance |
| AC-04-07 | US-04-02 | Commande sensible | Session admin revoquee | L'admin clique `Publier les resultats` | Action sensible refusee, retour connexion | [data flow](../../03-architecture/uml/data-flow.md) | Test revocation |

## Sources Docs Obligatoires

- Produit: [actors and permissions](../../01-product/actors-and-permissions.md), [player journey](../../01-product/player-journey.md)
- UX: [information architecture](../../02-ux/information-architecture.md), [loading/error/reconnect](../../02-ux/loading-error-reconnection.md)
- Architecture/UML: [security model](../../03-architecture/security-model.md), [permissions UML](../../03-architecture/uml/permissions.md), [ADR auth](../../03-architecture/decisions/0002-auth-approach.md)
- Couches: [transports](../../04-layers/transports.md), [admin web](../../04-layers/admin-web.md), [player web](../../04-layers/player-web.md)
- Workflow: [pipeline agentique](../../05-workflows/agentic-feature-pipeline.md), [layer canvas](../../05-workflows/layer-change-canvas.md)
- Tests: [strategie de test](../../05-workflows/test-strategy.md)

## Preuves Legacy

- `HEAD:apps/api/src/auth/session.ts` utilisait un cookie opaque `__Host-session`, token hash,
  revocation et `sessionVersion`.
- Roles HEAD: `PLAYER`, `SUPPORT`, `FINANCE`, `ADMIN`, `SUPER_ADMIN`.

## UML Concernee

- Lire [permissions](../../03-architecture/uml/permissions.md) et [sequences](../../03-architecture/uml/sequences.md).
- Ajouter le diagramme d'auth live apres decision token court/cookie.

## Pipeline Par Couche

- Web: guards d'affichage, jamais autorisation finale.
- API/ConnectRPC: register/login/logout/current/revoke, middleware auth/RBAC.
- Game-server: verifier acces live via participation et session valide.
- Domaine: policies sans framework.
- DB: `User`, `AuthSession`, `RoleAssignment`, revocation.
- Worker: aucune action auth directe hors expiration/revocation si decidee.
- Notifications: jamais de secret dans message.
- Observabilite: logs securite sans token brut.

## Contrats Protobuf Et ConnectRPC

`Register`, `Login`, `Logout`, `GetCurrentUser`, `RevokeSession`, `RequestPasswordReset`,
`ResetPassword`, erreurs `UNAUTHENTICATED`, `PERMISSION_DENIED`, `RATE_LIMITED`,
`INVALID_RESET_TOKEN`, `WEAK_PASSWORD`.

## Data

Session opaque possible, hash token, session version, roles et audit security.
Tokens de reset password hashes, usage unique, revocation session + live a la confirmation.

Decision de frontiere auth/live: la session applicative HTTP reste un cookie opaque hashe. Le live utilise
un token court derive d'une session valide et d'une participation autorisee; ce token n'est pas une session
auth generale, doit etre stocke hashe si persiste, et expire selon la decision sprint 09.

## UI States

Login/register loading/error, session expired, denied, role missing, local dev cookie warning si applicable.
Reset request: loading, succes generique, erreur reessayable. Confirm reset: loading, succes, token
invalide/expire, retry, accessibilite labels.

## Permissions

RBAC cote serveur obligatoire pour admin/support/finance/super admin; observer par permission explicite.

## Erreurs Observabilite

Rate limit, echec login, revocation, role refuse, sans fuite email/token/password.

## Tests Attendus

- Register/login/logout/current.
- Revocation et `sessionVersion`.
- Role refuse sur routes admin/finance/support.
- Cookies securises et mode local explicite.
- Rate limit et logs sans secrets.

## Definition Of Done

- Toutes les routes protegees refusent les roles incorrects cote serveur.
- Aucun composant web ne decide seul une autorisation.
- Decision auth documentee si elle diverge de l'approche cookie opaque.

## Interdictions Specifiques

- Ne pas choisir OAuth/JWT/provider externe sans Context7 et ADR.
- Ne pas reutiliser les roles front comme source de verite.
