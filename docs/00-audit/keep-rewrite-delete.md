# KEEP / REWRITE / DELETE / UNKNOWN

## KEEP

| Element | Preuve HEAD | Justification | Condition |
|---|---|---|---|
| Monorepo pnpm/turbo | `pnpm-workspace.yaml`, `turbo.json` | Separation apps/packages deja adaptee | Garder commandes racine |
| Next.js web | `apps/web/package.json` | App Router et UI riche deja presentes | Refaire parcours, pas runtime |
| Hono API | `apps/api/src/index.ts` | Sous-routeurs simples et testables | Handlers minces, contrats |
| Colyseus | `apps/game-server/package.json` | Bon choix pour serveur autoritaire | Room mince et contracts |
| Prisma/PostgreSQL | `packages/db/prisma/schema.prisma` | Donnees relationnelles necessaires | Migrations par domaine |
| BullMQ/Redis | queues API/worker | Jobs et retries utiles | Idempotence obligatoire |
| Auth cookie opaque | `apps/api/src/auth/session.ts` | Secure par defaut, revocation possible | Valider strategie finale |
| AuditLog | Prisma + routes admin | Tracabilite indispensable | Structure audit standard |
| Compliance gates | `security.ts`, admin compliance | Produit finance/legal | Workflow admin complet requis |
| Paiement/wallet/ledger | payments/wallet routes | Critique business | Corriger trace paiement wallet |
| Mini-game families | catalogue + Prisma enum | Structure produit utile | Prioriser implementation |
| Runtimes purs game-engine | `packages/game-engine/src/runtimes` | Bonne direction domaine pur | Recontracter inputs/outputs |
| Admin-arbitrage docs | `docs/admin-arbitrage/*` | Analyse riche Admin A/B/support | Revalider roles |
| Anti-cheat primitives | `AntiCheatEvent`, nonce, deadlines | Competition multijoueur | Formaliser par mini-jeu |

## REWRITE

| Element | Preuve HEAD | Probleme | Cible |
|---|---|---|---|
| `/session/[code]/live` | web route live | Trop de cas d'usage | Etats joueur explicites |
| `LiveRoomShell.tsx` | 508 lignes | UI live/social/mini-jeu/spectateur melangee | Composants par etat |
| `useGameRoom.ts` | 397 lignes | Handshake + messages + state UI | Client realtime contracte |
| `GameSessionRoom.ts` | 993 lignes | Room monolithique | Room core + modules handlers |
| `sessionStore.ts` | 919 lignes | DB/live/finalisation ensemble | Services live separes |
| `admin/sessions.ts` | 797 lignes | Lifecycle et projections dans une route | Use cases admin |
| `admin/operations.ts` | 645 lignes | Dashboard/support/audit/actions ensemble | Modules admin separes |
| `results.ts` | 704 lignes | Provisoire/officiel/gains trop couples | Scoring + publication |
| `live.ts` API | 544 lignes | Reservation/state/admin live melanges | Handshake simplifie |
| `SessionRegistration` | schema Prisma | Paiement/check-in/in-room ensemble | `GameParticipation` explicite |
| Mini-game definitions JSON | `minigames/catalogue.ts` | Zod/JSON pas contrat durable | Protobuf manifest |
| Shared types | `packages/shared/src/*` | Duplications et drift | API publique partagee stricte |
| Prisma schema complet | 50+ models/enums | Trop fige avant frontieres | Recomposer par domaines |

## DELETE OU ARCHIVER

| Element | Preuve HEAD | Raison | Remplacement |
|---|---|---|---|
| `.codex/output` ancien | 283 fichiers | Journaux non source de verite | Garder seulement audit courant si utile |
| `.claude/output` ancien | 20 fichiers | Journaux agents | Archive externe si besoin |
| `apps/web/playwright-report/index.html` | artefact genere | Ne doit pas etre versionne comme source | Regenerer en CI/local |
| Fonts dupliquees | `src/app/fonts` et `public/fonts` | Memes blobs repetes | Une source assets documentee |
| Routes dev | `(arena)/dev/*` | Pas produit | Garder sous package/dev guard ou supprimer |
| JoinToken/LiveReservation legacy | `JoinToken`, `LiveReservation` | Flux lourd, conflits Serializable | Handshake live court et idempotent |
| UI fallback vague | "En attente du serveur" | Masque etats produit | Etats loading/review/reconnect explicites |
| Docs contradictoires apres extraction | anciens PRD/plans bruts | Plusieurs verites | Decisions extraites dans docs v0.1 |

## UNKNOWN

| Sujet | Pourquoi c'est bloque | Decision demandee |
|---|---|---|
| Roles admin finaux | HEAD propose Admin A/B/Support/Finance ; demande initiale dit admin autorise | Valider matrice permissions |
| Priorite mini-jeux | 120 titres, 36 definitions, 6 recette, 3 runtimes | Choisir premier lot |
| Auth finale | Cookie opaque existe, mais besoins business non confirmes | Conserver ou integrer fournisseur externe |
| Notifications | WhatsApp present, push demande, statuts distribution souhaites | Choisir canaux et provider |
| Paiements/gains dans prochaine phase | Code riche mais risque financier | Inclure ou deferer reconstruction finance |
| Read-only stream detail | Snapshots/evenements valide, profondeur inconnue | Snapshot global, individuel, ou replay? |
| Conservation event/live | Pas de capture video en V1, event audit a clarifier | Definir retention et anonymisation |
