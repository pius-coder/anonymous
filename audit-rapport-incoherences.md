# Audit des incohérences API ↔ Frontend

**Projet :** session-jeu (monorepo Hono API + Next.js web + Prisma)
**Date :** 2026-07-09
**Périmètre :** routes admin (API) + pages admin (web) + types partagés
**Méthode :** lecture directe du code + agents d'exploration parallèles, tous les findings vérifiés sur le code (file:line).

---

## Résumé exécutif

| # | Gravité | Problème | Cause racine |
|---|---------|----------|--------------|
| 1 | 🔴 Bloquant | Toute publication de session PUBLIQUE renvoie `403_COMPLIANCE_GATE_BLOCKED` | Gate de compliance créée `BLOCKED` par défaut, **aucun endpoint ni UI pour la débloquer** |
| 2 | 🔴 Donnée perdue | Page détail session : `Durée` toujours `0s`, `policy` toujours `null` | Valeurs hardcodées dans l'API (`durationMs: 0`, `policy: null`) |
| 3 | 🔴 Donnée perdue | Page admin Paiements : "0 transaction" alors qu'il y a des inscriptions PAID | Paiement wallet ne crée pas de `PaymentTransaction` |
| 4 | 🟠 Affichage | "kjnl jl i" affiché comme statut (valeur corrompue en DB) | `session.status` affiché brut, aucun `formatStatus`, pas de validation enum |
| 5 | 🟠 Sémantique | Compteur "Inscriptions" users (2) ≠ inscriptions session (1) | Compteur users = TOUTES les `SessionRegistration` (non filtré) vs session = filtré |
| 6 | 🟡 Cohérence | Types `AdminRole`/`Paginated` dupliqués vs `packages/shared` | Pas de source unique de vérité pour enums/statuts |
| 7 | 🟡 UX | "Raison obligatoire" répété 3× dans la carte Cycle de vie | Même `placeholder` sur 3 forms identiques |
| 8 | 🟡 Erreurs | Codes d'erreur API manquants dans `errors.fr.ts` | Traductions non alignées sur les codes réels |

---

## 1. 🔴 Compliance gate bloque TOUTE publication publique

**Fichiers :** `apps/api/src/security/security.ts`, `apps/api/src/routes/admin/sessions.ts`

- `security.ts:119-134` — `ensureDefaultComplianceGates()` fait un `upsert` des 4 gates avec `status: "BLOCKED"`.
- `security.ts:151-166` — `assertPublicSessionCompliance()` renvoie `blocked` dès qu'une gate `PUBLIC_LAUNCH` (global) ou `LEGAL_WORDING` (public-session) est `BLOCKED`.
- `sessions.ts:553-620` (route `POST /:id/publish`) → `sessions.ts:608-616` renvoie `403_COMPLIANCE_GATE_BLOCKED`.

**Diagnostic :** comportement *intentionnel* (checklist légale V1), mais **fonctionnalité incomplète** :
- `GET /v1/admin/compliance/gates` existe (`admin/security.ts:20-28`) en **lecture seule**.
- **Aucun `PATCH`** pour passer une gate en `PASSED`/`WAIVED`.
- **Aucune UI admin** pour gérer les gates.

→ Résultat : impossible de publier la moindre session publique en l'état.

**Correction recommandée :**
1. Ajouter `PATCH /v1/admin/compliance/gates/:id` (admin/security.ts) pour basculer `status` → `PASSED`/`WAIVED` avec `decidedById`, `evidence`, audit log.
2. Ajouter une page admin "Conformité" listant les gates + bouton débloquer.
3. `errors.fr.ts` : ajouter `403_COMPLIANCE_GATE_BLOCKED`.

---

## 2. 🔴 Données perdues dans GET /v1/admin/sessions/:id

**Fichier :** `apps/api/src/routes/admin/sessions.ts:326-334`

```ts
rounds: session.rounds.map((r) => ({
  ...
  durationMs: 0,   // <- hardcodé, valeur réelle (r.durationMs) ignorée
  policy: null,    // <- hardcodé, valeur réelle ignorée
})),
```

**Impact :**
- Frontend `apps/web/src/app/admin/sessions/[id]/page.tsx:138` → `Math.round(round.durationMs / 1000)` affiche toujours `0s`.
- `policy` (AdminSessionDetail, admin-types.ts:66) jamais rempli.

**Correction :** mapper `durationMs: r.durationMs ?? 0` et `policy: r.policyJson ?? null` (selon le champ réel du modèle `Round`).

---

## 3. 🔴 Page Paiements vide = paiements wallet non tracés

**Fichiers :** `apps/api/src/wallet/wallet.ts:249-279`, `apps/api/src/routes/admin/payments.ts`

- `payRegistrationWithWallet()` crée un `LedgerEntry` (DEBIT) + met `SessionRegistration.status = PAID`, **mais ne crée PAS de `PaymentTransaction`**.
- `GET /v1/admin/payments` interroge **uniquement** `prisma.paymentTransaction` → 0 ligne si tout est payé par wallet.
- Le dashboard admin compte séparément `sessionRegistration` (PAID) et `paymentTransaction` (SUCCESSFUL) → "5 inscrites payées" vs "0 paiements".

**Correction recommandée (Option A, la plus propre) :** dans `payRegistrationWithWallet()`, créer une `PaymentTransaction` avec `provider: "WALLET"`, `status: SUCCESSFUL`, `registrationId`. Rend tous les paiements traçables uniformément.

---

## 4. 🟠 "kjnl jl i" — statut affiché brut / donnée corrompue

**Fichiers :** `apps/web/src/app/admin/sessions/[id]/page.tsx:36`, `apps/web/src/components/admin/AdminActionForms.tsx`, `apps/web/src/app/admin/admin-format.ts`

- `page.tsx:36` : `<Badge>{session.status}</Badge>` affiche `session.status` **brut** (pas de traduction).
- `admin-format.ts` n'a **aucune** fonction `formatStatus()`.
- `SessionCard.tsx:46-59` a `statusLabel()` mais **non utilisé** par la page admin détail.
- Le texte "kjnl jl i" n'existe **dans aucun fichier** (grep = 0) → c'est une **valeur corrompue en base** (seed/test) affichée telle quelle.

**Correction :**
1. Ajouter `formatAdminStatus()` dans `admin-format.ts` (DRAFT→"Brouillon", PUBLISHED→"Publiée", etc.) + fallback "Inconnu".
2. Utiliser ce helper sur `session.status` et `registration.status`.
3. Typage : `AdminSession.status` devrait être l'union `GameSessionStatus` et non `string`.
4. Corriger/nettoyer la donnée seed qui contient "kjnl jl i".

**Cause racine commune :** `packages/shared/src/constants/index.ts` n'exporte **aucun** enum JS/TS pour `GameSessionStatus`, `SessionRegistrationStatus`, `PaymentStatus`. Chaque composant hardcode ses propres statuts → dérive.

---

## 5. 🟠 Compteur "Inscriptions" users vs session incohérent

**Fichiers :** `apps/api/src/admin/operations.ts:262-267`, `apps/api/src/routes/admin/sessions.ts:254-261`, `apps/web/src/app/admin/users/page.tsx:106`

- Users : `_count.registrations` **sans filtre** → compte TOUTES les `SessionRegistration` (CREATED, PENDING, PAID, CANCELLED, EXPIRED…).
- Sessions : `_count.registrations` **filtré** (`PAYMENT_PENDING`, `PAID`).

→ "Test Player" = 2 dans la liste users (2 inscriptions toutes sessions) vs 1 sur la session détail. Deux sémantiques différentes, colonne mal nommée.

**Correction :**
1. Filtrer le compteur users (`status: { in: [PAID, PAYMENT_PENDING, CHECKED_IN, IN_ROOM] }`).
2. Renommer la colonne "Inscriptions" → "Total inscriptions" + tooltip.
3. Harmoniser le filtrage entre les deux endpoints.

---

## 6. 🟡 Types partagés : duplication & drift

**Fichiers :** `packages/shared/src/types/index.ts`, `apps/web/src/app/admin/admin-types.ts`, `packages/shared/src/constants/index.ts`

- `AdminRole` (admin-types.ts:1) == `UserRole` (shared) → dupliqué, devrait importer.
- `Paginated<T>` (admin-types.ts:211) == `PaginatedResponse<T>` (shared) → dupliqué.
- `PublicSession` / `PublicSessionDetail` (shared) **jamais utilisés** ; le frontend public utilise `any`.
- Statuts de session/inscription/paiement **absents** de `shared/constants`.
- `ApiError` et sous-classes (shared/errors) **jamais instanciés** (dead code ; l'API utilise `errorResponse()`).

**Correction :** centraliser enums + helpers de statut dans `packages/shared`, supprimer les duplications, connecter `PublicSession`.

---

## 7. 🟡 "Raison obligatoire" répété (UX)

**Fichier :** `apps/web/src/components/admin/AdminActionForms.tsx:36-44, 64-76`

`SessionLifecycleActions` mappe 3 forms (publish / open-registration / cancel), chacun avec un `ReasonBox` au `placeholder="Raison obligatoire"`. Pas un bug, mais 3 champs identiques prêtent à confusion.

**Correction :** placeholders explicites par action ("Raison de publication", "Raison d'ouverture", "Raison d'annulation").

---

## 8. 🟡 Codes d'erreur API manquants dans errors.fr.ts

**Fichier :** `apps/web/src/lib/errors.fr.ts`

Codes renvoyés par l'API mais **absents** des traductions FR : `403_COMPLIANCE_GATE_BLOCKED`, `SESSION_ALREADY_COMPLETED`, `SESSION_CLOSED`, `LINK_NOT_FOUND`, `MIN_PLAYERS_NOT_REACHED`, `404_PLAYER_NOT_FOUND`, `INVALID_CAPACITY`, `INVALID_ENTRY_FEE`, `INVALID_BPS`, `INVALID_PRIZE_SPLIT`, `INVALID_START_TIME`, `INVALID_REGISTRATION_CLOSE`.

→ En cas d'erreur, l'UI affiche le code brut au lieu d'un message FR.

**Correction :** ajouter ces clés dans `errors.fr.ts`.

---

## Plan de remédiation proposé (par priorité)

1. **P0 — Débloquer la publication** : endpoint `PATCH compliance/gates/:id` + UI conformité (sinon aucune session publique ne peut sortir).
2. **P0 — Ne plus perdre de données** : mapper `durationMs`/`policy` réels (sessions.ts:332-333) ; créer `PaymentTransaction` pour les paiements wallet.
3. **P1 — Affichage des statuts** : `formatAdminStatus()` + typer `status` ; nettoyer la donnée seed "kjnl jl i".
4. **P1 — Compteurs cohérents** : filtrer + renommer la colonne users.
5. **P2 — Types partagés** : source unique pour enums/statuts, supprimer duplications.
6. **P2 — UX/erreurs** : placeholders explicites, traductions d'erreurs manquantes.

---

## Note sur les endpoints sans consommateur frontend

Existants dans l'API mais non appelés par l'admin web (à valider si volontaire) :
`GET /sessions/:id/simulation`, `GET /sessions/:id/results`, `POST /sessions/:id/correction-request`, `PATCH /sessions/:id`, `POST /admin/incidents`, `POST /admin/actions`, `POST /admin/actions/:id/approve`, `POST /admin/notifications/session/:id/share`, `POST /admin/moderation/actions`, `POST /admin/minigames/validate-config`.

## Note sur les chemins d'API

Aucun mismatch de chemin détecté entre `admin-api.ts`/`apiPost` et le montage Hono (`apps/api/src/index.ts`). Les appels correspondent tous.

---

## Audit live 2D / seed recette / traçabilité — 2026-07-09

### Décisions vérifiées dans les docs

- `docs/plan/19-phase3-operateur-lancement.md` demande `React + RetroUI + Motion` pour les jeux 2D à grille/boutons, et `PixiJS v8` pour les surfaces canvas à mouvement continu.
- La fiche Pixi indique `Application`, `await app.init()`, `app.canvas`, `app.destroy(...)`, ticker et import dynamique côté client.
- `pixi.js` est présent dans `pnpm-lock.yaml`, mais pas encore dans `apps/web/package.json` au moment de cette passe. Le jeu `danger-sweep` garde donc un placeholder 2D CSS/Motion sans import statique, compatible avec le contrat serveur `move { x, y }`.

### Parcours live client

- `/me/sessions` envoie vers `/session/[code]/lobby`.
- Le lobby appelle l'API session/lobby, check-in et jeton de réservation live.
- `/session/[code]/live` utilise `useGameRoom`, réserve l'accès live, rejoint la room Colyseus `game_session`, reçoit `round.game`, puis envoie les actions joueur.
- Les actions passent par `GameSessionRoom.messages.action`, puis `submitPlayerAction`, puis `PlayerAction` en base avec nonce/idempotence.
- Les spectateurs, joueurs éliminés et reconnectés reçoivent la surface de jeu courante en lecture seule.

### Six jeux de recette seedés et jouables

- `memory-sequence` : reproduction de séquence.
- `pure-reaction-duel` : réaction solo/duel/groupe, classée par temps de réaction.
- `trust-bridge` : choix de route par paire.
- `team-relay` : relais d'étapes par équipe.
- `danger-sweep` : arène 2D placeholder Pixi-ready avec coordonnées.
- `silent-vote` : vote silencieux contre un candidat.

### Seed et cohérence DB

- Le seed est destructif uniquement avec `ALLOW_DESTRUCTIVE_SEED=true` et interdit en production.
- Le seed recrée une session live `RECETTE-LIVE-6`, trois joueurs, wallets, paiements réussis, inscriptions `CHECKED_IN`, `LiveSessionState` et six `RoundInstance`.
- Les mini-jeux seedés sont limités aux six jeux de recette pour éviter de simuler 36 jeux incomplets.

### Points sécurisés pendant cette passe

- Cookie auth sécurisé par défaut : `__Host-session` + `Secure`, avec opt-in explicite `ALLOW_INSECURE_AUTH_COOKIE=true` pour dev local.
- Build Next résilient si `networkInterfaces()` échoue dans l'environnement sandbox.
- `round.game` est persistant côté client et renvoyé au reconnecté côté Colyseus pour éviter un écran d'attente après `round.started`.
