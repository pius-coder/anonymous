# Rapport d'audit — Session 2026-07-09

> Période : audit UI/API/DB + seed destructif recette + connexion live
> Contexte : `fix/register-already-registered-ux`
> Commits : `c0b6b86` + `de82d58`

---

## 1. Ecarts statuts paiements / registrations

### 1.1. Statuts `PAID` utilisés partout au lieu des groupes centralisés

**Cause :** `apps/api/src/sessions/statusGroups.ts` n'existait pas avant cette PR. Chaque route filtrait manuellement `PAID` sans cohérence.

**Fichier :** `apps/api/src/sessions/statusGroups.ts` (créé)
**Fix :** 2 groupes centralisés :
- `CAPACITY_REGISTRATION_STATUSES = [PAID, CHECKED_IN, IN_ROOM]`
- `PAID_ACCESS_REGISTRATION_STATUSES = [PAID, CHECKED_IN, IN_ROOM]`

**Routes impactées & corrigées :**
| Fichier | Ligne | Avant | Après |
|---------|-------|-------|-------|
| `apps/api/src/lobby/lobby.ts` | — | `PAID` seulement | `CAPACITY_REGISTRATION_STATUSES` |
| `apps/api/src/results/results.ts` | — | `PAID` seulement | `PAID_ACCESS_REGISTRATION_STATUSES` |
| `apps/api/src/wallet/wallet.ts` | — | `PAID` seulement | `PAID_ACCESS_REGISTRATION_STATUSES` |
| `apps/api/src/minigames/catalogue.ts` | — | `PAID` seulement | `PAID_ACCESS_REGISTRATION_STATUSES` |
| `apps/api/src/routes/registrations.ts` | — | `PAID` seulement | `PAID_ACCESS_REGISTRATION_STATUSES` |
| `apps/api/src/routes/__tests__/*` | multiples | mocks `PAID` | mocks mis à jour |

### 1.2. Filtre `filter=live` pointait sur `ACTIVE` au lieu de `LIVE`

**Fichier :** `apps/api/src/routes/public/sessions.ts:40`
**Cause :** confusion entre `ACTIVE` (statut de session pour "config actuellement utilisée") et `LIVE` (statut de session en direct).
**Fix :** `filter=live` ne retourne que `LIVE` ; `filter=open` reste `PUBLISHED/ACTIVE`.

### 1.3. `join-token` émis avant `LIVE` — réservation ensuite refusée

**Fichier :** `apps/api/src/lobby/lobby.ts:369` (issueJoinToken)
**Cause :** le token était créé si session était `ACTIVE` ou `LIVE`, mais la réservation refusait `SESSION_NOT_LIVE`.
**Fix :** retourner `SESSION_NOT_LIVE` dès le join-token si session pas encore LIVE.

---

## 2. DB — Seed destructif + cohérence paiement/ledger

### 2.1. Paiements sans ledger

**Cause :** le seed créait des `PaymentTransaction` sans `LedgerEntry` associé.
**Fix :** `packages/db/prisma/seed.ts` — chaque paiement seedé créé aussi un `LedgerEntry` (type `GAME_CREDIT`, direction `IN`).

### 2.2. Session `RECETTE-LIVE-6` sans rounds ni liveState

**Fix :** seed enrichi : 6 rounds (un par mini-jeu), `LiveSessionState` à `BRIEFING`.

### 2.3. `NIGHT-DROP` sans inscription payée

**Fix :** seed crée une registration `PAID` + payment + ledger pour `NIGHT-DROP`.

---

## 3. E2E — Test obsolète

### 3.1. CTA attendait un lien `/auth/register?next=` introuvable

**Fichier :** `apps/web/e2e/feature-01-catalogue-public.spec.ts:22-26`
**Cause :** l'UI actuelle ouvre un drawer d'authentification (pas de redirection).
**Fix :** le test vérifie maintenant le bouton "S'inscrire" + l'ouverture du `<dialog>`.

---

## 4. Game-server — Write conflict P2034 sur connexion concurrente

### 4.1. `consumeLiveReservation` — transaction Serializable tue l'upsert

**Fichier :** `apps/game-server/src/live/sessionStore.ts:43-136`
**Cause :** isolation `Serializable` + `playerConnection.upsert` sur `@@unique([sessionId, userId])` → 2 appels concurrents (rafale de reconnexion) lèvent `P2034` (write conflict).

**Fix :** helper `withSerializableRetry` (l.15-31) avec 3 tentatives et backoff 20ms–60ms.

```typescript
async function withSerializableRetry<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      });
    } catch (error) {
      const code = (error as { code?: string } | undefined)?.code;
      if (code === "P2034" && attempt < SERIALIZABLE_RETRIES) {
        attempt += 1;
        await new Promise((resolve) => setTimeout(resolve, 20 * attempt));
        continue;
      }
      throw error;
    }
  }
}
```

**Tests ajoutés :** `apps/game-server/src/live/__tests__/sessionStore.test.ts` — 5 nouveaux cas (valide, P2034 retry, expired, used, session-not-live).

---

## 5. Worker — `DATABASE_URL` manquant

### 5.1. Erreur Prisma au démarrage : `Environment variable not found: DATABASE_URL`

**Fichier :** `apps/worker/src/index.ts:1`
**Cause :** le worker ne chargeait jamais `.env`. L'API le faisait via `dotenv`, le worker non.
**Fix :** ajout de `config({ path: resolve("../../.env") })` + dépendance `dotenv: ^17.4.2`.

---

## 6. Web — Crash runtime sur la page live

### 6.1. TypeError: Cannot read properties of undefined (reading 'userId')

**Fichier :** `apps/web/src/hooks/useGameRoom.ts:116-118` + `live/page.tsx:47`
**Cause :** Colyseus `MapSchema` n'est pas `instanceof Map`. La conversion par `Object.values()` produisait des entrées `undefined`.
**Fix :** détection via `typeof .forEach === "function"` + filtre `if (p)` chez les 3 branches (Map, Array, Object).

### 6.2. Motion.js : strokeDashoffset from "undefined"

**Fichier :** `apps/web/src/components/game/motion-primitives.tsx:73`
**Cause :** `<motion.circle>` animait `strokeDashoffset` sans valeur initiale → Motion partait d'`undefined`.
**Fix :** ajout `initial={{ strokeDashoffset: circumference }}`.

---

## 7. Architecture live — analyse du flux 3-phases

### 7.1. Lourdeur initiale documentée

**Document :** `docs/analysis-live-connection-flow.md` (créé)

Le flux actuel nécessite 3 appels API avant d'arriver au WebSocket :
1. `GET /join-token` → crée `JoinToken`
2. `POST /reservation` → transaction Serializable #1
3. `client.joinOrCreate` → transaction Serializable #2

**Problème structurel :** un split de responsabilité entre l'API REST et le game-server qui force deux transactions sur les mêmes données (registration → IN_ROOM, liveSessionState).

**Recommandation :** suppression de `JoinToken` et `LiveReservation`, simplification vers un auth direct Colyseus par vérification en DB minimale (registration CHECKED_IN + session LIVE).

---

## Résumé des fichiers modifiés

| Fichier | Nature | Lignes |
|---------|--------|--------|
| `packages/db/prisma/seed.ts` | Seed destructif + ledger | +445 |
| `packages/db/prisma/migrations/*/fix_schema_drift/migration.sql` | Migration DB | new |
| `apps/api/src/sessions/statusGroups.ts` | Groupes centralisés | new |
| `apps/api/src/routes/public/sessions.ts` | Filtre live → LIVE | modifié |
| `apps/api/src/routes/public/session-detail.ts` | Statuts | modifié |
| `apps/api/src/lobby/lobby.ts` | Statuts + join-token | modifié |
| `apps/api/src/results/results.ts` | Statuts | modifié |
| `apps/api/src/wallet/wallet.ts` | Statuts | modifié |
| `apps/api/src/minigames/catalogue.ts` | Statuts | modifié |
| `apps/api/src/players/playerProfile.ts` | Statuts | modifié |
| `apps/api/src/routes/live.ts` | Statuts | modifié |
| `apps/api/src/routes/payments.ts` | registrationId fallback | modifié |
| `apps/api/src/routes/registrations.ts` | Statuts | modifié |
| `apps/api/src/routes/admin/sessions.ts` | Admin | modifié |
| `apps/api/src/routes/admin/payments.ts` | registrationId | modifié |
| `apps/api/src/routes/admin/operations.ts` | Admin | modifié |
| `apps/api/src/admin/operations.ts` | Admin | modifié |
| `apps/api/src/auth/session.ts` | Auth | modifié |
| `apps/api/src/live/live.ts` | Réservation | modifié |
| `apps/api/src/src/__tests__/*` | 12 fichiers de tests mis à jour | modifié |
| `apps/game-server/src/live/sessionStore.ts` | Helper `withSerializableRetry` | modifié |
| `apps/game-server/src/live/__tests__/sessionStore.test.ts` | 5 tests consumeLiveReservation | modifié |
| `apps/game-server/src/rooms/GameSessionRoom.ts` | onAuth expose | modifié |
| `apps/game-server/src/rooms/schema/LiveState.ts` | Schéma | modifié |
| `apps/worker/src/index.ts` | dotenv .env | modifié |
| `apps/worker/package.json` | dotenv dep | modifié |
| `apps/web/e2e/feature-01-catalogue-public.spec.ts` | E2E CTA → dialog | modifié |
| `apps/web/src/hooks/useGameRoom.ts` | MapSchema .forEach | modifié |
| `apps/web/src/app/(client)/session/[code]/live/page.tsx` | filter(Boolean) | modifié |
| `apps/web/src/components/lobby/GameShell.tsx` | key fallback | modifié |
| `apps/web/src/components/game/motion-primitives.tsx` | initial strokeDashoffset | modifié |
| `.env.example` | Variables LAN/WS | modifié |
| `docs/analysis-live-connection-flow.md` | Analyse flux live | new |
| `audit-ui-api-trace.md` | Rapport d'audit UI/API/DB | new |
| `audit-rapport-incoherences.md` | Listing incohérences | new |

---

## Résultats des validations

| Commande | Résultat |
|----------|----------|
| `pnpm typecheck` — db | ✓ |
| `pnpm typecheck` — api | ✓ |
| `pnpm typecheck` — game-server | ✓ |
| `pnpm typecheck` — worker | ✓ |
| `pnpm typecheck` — web | ✓ |
| `pnpm lint` — tous packages | ✓ (0 erreurs, 2 warnings préexistants) |
| `pnpm test` — db | ✓ 45/45 |
| `pnpm test` — api | ✓ 210/210 |
| `pnpm test` — game-server | ✓ 12/12 |
| `pnpm test` — worker | ✓ 20/20 |
| `pnpm test` — web | ✓ (e2e 4/4) |
| `pnpm build` | ✓ |

---

## Problèmes restants

- Le write conflict P2034 est masqué par le retry mais la vraie cause est l'architecture à 3 phases. Une refonte "Fortnite-style" (auth directe Colyseus sans réservation) supprimerait la transaction lourde.
- `GameShell.tsx` a toujours le warning `@next/next/no-img-element` sur `avatar.tsx:135` (préexistant).
- `calendar.tsx:201` a un `locale` unused variable (préexistant).
