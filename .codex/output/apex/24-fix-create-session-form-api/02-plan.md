# Plan: fix-create-session-form-api

## Overview
Corriger les 18 problèmes identifiés dans le formulaire de création de session (UI) et le handler API, en priorisant par criticité.

---

### File Changes

#### `apps/web/src/components/admin/CreateSessionForm.tsx`
- **#1** L.91 : Remplacer `pattern="[A-Za-z0-9-]+"` par `[A-Z0-9-]+` pour matcher Zod
- **#2** L.89-147 : Ajouter `(optionnel)` dans les `<label>` pour code, description, startsAt, registrationClosesAt, reason
- **#3** L.110 : Corriger "Acces" → "Accès"
- **#4** L.52 : Remplacer `winnerSplitBps: [10000]` par un champ input (splits séparés par virgule) avec valeur par défaut "10000"
- **#5** L.157-178 : Transformer la liste read-only en checkboxes `<input type="checkbox">` avec `name="minigameIds[]"` pour que l'admin sélectionne les jeux
- **#6** L.53-54 : Ajouter une mention `(UTC)` dans les labels datetime
- **#7** L.62 : Améliorer l'affichage d'erreur : parser `result.error` et afficher les détails champ par champ si disponibles
- **#8** Ajouter un bloc récapitulatif après le formulaire qui calcule et affiche : prize pool estimé, frais, commission organisme

#### `apps/api/src/routes/admin/sessions.ts`
- **#9** L.55-58 : Modifier `validationHook` pour renvoyer les issues Zod dans la response (code 400, body avec `errors: result.error.issues`)
- **#10** L.127-128 : Corriger `minPlayers: input.maxPlayers` → `input.minPlayers`
- **#11** L.197-234 : Ajouter try/catch autour de `prisma.$transaction` avec gestion de Prisma P2002 → 409 CONFLICT
- **#12** L.213-216 : Convertir les dates ISO en timestamp avec timezone hint dans la réponse
- **#13** L.206-207 : Supprimer le doublon `entryFee` si possible, sinon commenter pourquoi les deux existent
- **#14** L.197-219 : Ajouter `SessionMinigame.createMany` dans la transaction pour lier les `minigameIds` sélectionnés à la session
- **#15** L.96-117 : Ajouter `createdAt: session.createdAt.toISOString()`, `updatedAt: session.updatedAt.toISOString()`
- **#16** L.165 : Ajouter `session.providerFeeBps < 0` dans la condition
- **#17** L.188 : Passer de `randomBytes(3)` à `randomBytes(4)` (4.3B combinaisons)
- **#18** Garder la déduplication pour un autre PR (non bloquant)

### Testing Strategy
- Vérifier que le formulaire soumet les bonnes données (code uppercase, minigameIds sélectionnés)
- Vérifier que l'API renvoie les erreurs Zod détaillées
- Vérifier que le code dupliqué est rejeté (409)

### Acceptance Criteria Mapping
- [ ] AC1: Tous les champs UI matchent le schema Zod → #1, #2
- [ ] AC2: Les mini-jeux sont sélectionnables et liés → #5, #14
- [ ] AC3: Les erreurs sont détaillées (pas "Validation failed") → #7, #9
- [ ] AC4: Le prize pool est correctement calculé → #8, #10
- [ ] AC5: Les codes dupliqués sont gérés → #11, #17
- [ ] AC6: Les labels et timezone sont clairs → #3, #6, #12
