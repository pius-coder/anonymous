# Analyze: fix-create-session-form-api

## Codebase Context

### Files Involved

| File | Lines | Role |
|------|-------|------|
| `apps/web/src/components/admin/CreateSessionForm.tsx` | 1-188 | Client form — collecte les inputs admin |
| `apps/api/src/routes/admin/sessions.ts` | 1-751 | API handler — POST /admin/sessions (création) |
| `apps/api/src/admin/sessionConfig.ts` | 1-223 | Zod schemas + fonctions de calcul |
| `apps/api/src/admin/__tests__/sessionConfig.test.ts` | — | Tests du schema Zod |

### UI Issues Found

| # | Problème | Fichier:Ligne | Détail |
|---|----------|---------------|--------|
| 1 | HTML pattern `[A-Za-z0-9-]+` ≠ Zod `[A-Z0-9-]+` | `CreateSessionForm.tsx:91` vs `sessionConfig.ts:25` | HTML5 laisse passer minuscules, API rejette |
| 2 | Champs optionnels non marqués | `CreateSessionForm.tsx:89,95,135,139,145` | `code`, `description`, `startsAt`, `registrationClosesAt`, `reason` sans "(optionnel)" |
| 3 | Label "Acces" → "Accès" | `CreateSessionForm.tsx:110` | Typo française |
| 4 | `winnerSplitBps` hardcodé `[10000]` sans UI | `CreateSessionForm.tsx:52` | Zod accepte des répartitions multiples |
| 5 | Mini-jeux non liés — `minigameIds` absent | `CreateSessionForm.tsx:157-178` | Read-only, pas de selection possible |
| 6 | `toIso()` convertit locale→UTC sans indicateur | `CreateSessionForm.tsx:14-15` | Admin ignore son fuseau horaire |
| 7 | Erreurs génériques — pas de mapping champ → cause | `CreateSessionForm.tsx:62` | "Validation failed" sans détails |
| 8 | Pas d'aperçu financier avant soumission | Form entier | Prix, prize pool, frais jamais affichés |

### API Issues Found

| # | Problème | Fichier:Ligne | Détail |
|---|----------|---------------|--------|
| 9 | `validationHook` jette les détails Zod | `sessions.ts:55-58` | 400 générique, issues perdues |
| 10 | `minPlayers = maxPlayers` dans `buildLegacyPrizePool` | `sessions.ts:127-128` | `minimumViableRevenueXaf` = `maximumProjectedRevenueXaf` |
| 11 | Pas de gestion d'unicité code → Prisma P2002 = 500 | `sessions.ts:197-234` | Pas de try/catch sur create |
| 12 | Timezone non maîtrisée | `sessions.ts:213-216` | `new Date(startsAt)` parse UTC, admin voit décalé |
| 13 | `entryFee` + `entryFeeXaf` redondants | `sessions.ts:206-207` | Deux champs, même valeur |
| 14 | Aucune liaison `SessionMinigame` en création | `sessions.ts:197-219` | Session créée sans mini-jeux |
| 15 | `serializeSession` sans `createdAt`/`updatedAt` | `sessions.ts:96-117` | Champs manquants dans la réponse |
| 16 | `validatePublishable` ne check pas `providerFeeBps < 0` | `sessions.ts:165` | Incohérent avec le reste |
| 17 | `randomBytes(3)` = 16M collisions | `sessions.ts:188` | Espace faible pour auto-code |
| 18 | Duplication validation timing (Zod + validatePublishable) | `sessionConfig.ts:40-43` + `sessions.ts:171-176` | Même logique à deux endroits |

