# Matrice d'implementation HEAD

Cette matrice classe ce qui existait dans `HEAD` avant nettoyage.
Elle ne valide pas automatiquement le legacy comme cible ; elle identifie ce qui peut etre repris.

| Domaine | Produit HEAD | Implementation HEAD | Preuves | Decision v0.1 |
|---|---|---|---|---|
| Acquisition publique | Catalogue et details publics | Routes public sessions, pages catalogue/detail | `apps/api/src/routes/public/*`, `apps/web/src/app/(arena)/catalogue`, `apps/web/src/app/(arena)/session/[code]/page.tsx` | REWRITE en module public, garder logique utile |
| Auth | Inscription, login, logout, reset password, session cookie | Auth Hono + AuthSession Prisma | `apps/api/src/routes/auth.ts`, `apps/api/src/auth/session.ts`, `AuthSession` | KEEP concept, REWRITE contrats/guards |
| Profil joueur | Profil, historique, stats | PlayerProfile service + pages me | `apps/api/src/players/playerProfile.ts`, `apps/web/src/app/(arena)/me/*` | REWRITE apres participation/scoring |
| Admin sessions | Creation, publication, ouverture, start, cancel, simulation | Route admin sessions tres chargee | `apps/api/src/routes/admin/sessions.ts` | REWRITE par use cases |
| Paiements provider | Fapshi initiate/webhook/reconcile | Service paiement + routes | `apps/api/src/payments/fapshi.ts`, `apps/api/src/routes/payments.ts` | KEEP domaine financier, REWRITE ports/provider |
| Wallet | Ledger, paiement wallet, ajustement admin | Wallet service + admin wallet | `apps/api/src/wallet/wallet.ts`, `apps/api/src/routes/admin/wallets.ts` | KEEP, corriger trace transactionnelle |
| Lobby/check-in | Presence, check-in, join token | Lobby API + page lobby | `apps/api/src/lobby/lobby.ts`, `apps/web/src/components/lobby/LobbyPage.tsx` | REWRITE autour PreparationLobby |
| Live player | Connexion Colyseus, messages, UI live | `useGameRoom`, `LiveRoomShell`, `GameSessionRoom` | `apps/web/src/hooks/useGameRoom.ts`, `apps/game-server/src/rooms/GameSessionRoom.ts` | REWRITE avec state machine joueur |
| Live admin | Pause/resume/force close, supervision | Admin live routes + composants admin | `apps/api/src/routes/admin/live.ts`, `apps/web/src/components/admin/AdminSessionLiveContent.tsx` | REWRITE Command Center |
| Observation lecture seule | Spectateur/elimine partiel | `readOnly`, `you.eliminated`, state filtre partiel | `LiveRoomShell`, `GameSessionRoom` | REWRITE en role/contrat dedie |
| Mini-jeux catalogue produit | 120 titres | Document produit | `docs/catalogue-mini-jeux.md` | KEEP comme vision, prioriser |
| Mini-jeux definitions | 36 definitions | JSON/Zod config + allowed actions | `apps/api/src/minigames/catalogue.ts` | REWRITE en manifest contracte |
| Mini-jeux runtimes | 3 dedies + recette | Game engine runtimes | `packages/game-engine/src/runtimes/*` | REWRITE framework puis reintegrer |
| Carte/social | Carte sociale, groupes, pings, chat | Social map + state Colyseus | `SocialMapCanvas`, `SocialPanels`, `GameSessionRoom` | REWRITE selon navigation reelle |
| Resultats | Provisoire, officiel, gains, disputes | Results API + round resolution | `apps/api/src/results/results.ts`, `apps/api/src/rounds/roundResolution.ts` | REWRITE separation provisional/published |
| Notifications | Preferences, jobs, delivery logs, WhatsApp webhook | Notification service + worker | `apps/api/src/notifications/notifications.ts`, `apps/worker/src/notifications.ts` | KEEP responsabilite, REWRITE provider/contracts |
| Admin operations | Dashboard, audit, users, support, incidents, approvals | Service large | `apps/api/src/admin/operations.ts` | SPLIT modules admin/support/audit |
| Security/compliance | Gates, risk signals, anti-cheat events | Security routes/service | `apps/api/src/security/security.ts`, `apps/api/src/routes/admin/security.ts` | KEEP concepts, REWRITE workflows |
| Workers | deadlines, expiration, payment reconciliation, credits, notifications | BullMQ queues/workers | `apps/api/src/queues/*`, `apps/worker/src/*` | KEEP jobs idempotents |
| Shared package | Constantes, erreurs, events, payments, readiness | Partiellement utilise, duplications | `packages/shared/src/*`, audit incoherences | REWRITE source partagee stricte |
| DB schema | Large modele relationnel | 50+ models/enums | `packages/db/prisma/schema.prisma` | REWRITE migrations par domaine |
| Tests | Nombreux tests unit/API | Tests Vitest + Playwright report | `apps/api/src/routes/__tests__/*`, runtimes tests | KEEP patterns, adapter aux modules |

## Ecarts quantifies mini-jeux

| Niveau | Quantite | Preuve | Lecture |
|---|---:|---|---|
| Catalogue produit | 120 | `docs/catalogue-mini-jeux.md` | Vision large |
| Definitions API | 36 | `MVP_MINIGAME_DEFINITIONS` | Config seedable |
| Jeux recette live | 6 | `RECETTE_ROUND_KEYS` | Parcours demo |
| Runtimes dedies | 3 | `packages/game-engine/src/runtimes` | Implementation serieuse limitee |

## Conclusion

La refonte ne doit pas repartir de zero par ignorance.
Elle doit extraire ce qui est valable du `HEAD`, puis reconstruire par domaines et contrats.
