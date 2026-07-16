# Commandes de test, timeouts et diagnostic (SEQ-00)

Ce document decrit le socle d'integration installe par SEQ-00. Il complete
`test-strategy.md` (niveaux L0-L6) et `apex-parallel-worktrees.md` (isolation).

## Commandes racine

| Commande | Niveau | Role |
|---|---|---|
| `pnpm test:unit` | L1 | Vitest via Turbo (`turbo run test`), sans services externes |
| `pnpm test:integration` | L3-L4 | Infra jetable → migrate DB vide → API + Colyseus → smokes |
| `pnpm test:e2e` | L5 | Infra jetable → migrate → Playwright (`webServer[]` api/game/web) |
| `pnpm test:all` | L1+L3-L5 | Enchaine unit → integration → e2e |
| `pnpm test` | L1 | Alias Turbo historique des tests unitaires par package |
| `pnpm infra:up` | - | Demarre PG/Redis isoles et affiche les ports derives |
| `pnpm infra:up:migrate` | - | Idem + `prisma migrate deploy` |
| `pnpm infra:down` | - | Teardown (compose `-v` ou DROP DATABASE + FLUSHDB) |

Les scripts `test:integration` et `test:e2e` **ne sont pas** des alias de `test:unit`.

## Isolation worktree

Variables cles (voir aussi `.env.example`) :

| Variable | Effet |
|---|---|
| `WORKTREE_ID` | Identifiant stable (defaut : nom du repertoire courant) |
| `WORKTREE_OFFSET` | 0-199 optionnel ; sinon hash de `WORKTREE_ID` |
| `TEST_INFRA_BACKEND` | `docker` (CI) ou `local` (PG/Redis hote) ; auto-detect si vide |

Ports derives (`offset = hash(WORKTREE_ID) % 200`) :

| Ressource | Formule |
|---|---|
| API | `3100 + offset` |
| Game server | `3300 + offset` |
| Web | `3500 + offset` |
| Worker (reserve) | `3700 + offset` |
| Postgres (docker host) | `15432 + offset` |
| Redis (docker host) | `16379 + offset` |

Base PostgreSQL : `session_jeu_wt_{WORKTREE_ID}`.
Redis : URL avec index logique `REDIS_DB = offset % 16` (backend local) ou instance compose dediee (docker).
Projet Compose : `COMPOSE_PROJECT_NAME=sj_{WORKTREE_ID}`.

Deux worktrees avec des `WORKTREE_ID` distincts ne partagent ni DB, ni ports applicatifs.

Les variables sont generees dans `.env.worktree.local` par `scripts/worktree-up`. Utiliser
`scripts/worktree-run pnpm <commande>` pour les charger dans les commandes locales et les actions Codex.

## Timeouts

| Etape | Timeout par defaut |
|---|---|
| Attente port infra / service | 90 s |
| Playwright `webServer` api/game | 120 s |
| Playwright `webServer` web (Next) | 180 s |
| Spec Playwright | 60 s |
| Suite integration (process) | `INTEGRATION_TIMEOUT_MS` (defaut 300 s) |
| Job CI GitHub Actions | 45 min |

## Harness smokes

| Fichier | Niveau | Frontiere reelle |
|---|---|---|
| `tests/integration/l3-postgres.smoke.test.ts` | L3 | PostgreSQL + migrations |
| `tests/integration/l4-api.smoke.test.ts` | L4 | HTTP Hono `/health` + chemin Connect |
| `tests/integration/l4-colyseus.smoke.test.ts` | L4 | TCP + HTTP Colyseus (echec si process absent) |
| `apps/web/e2e/live-smoke.spec.ts` | L5 | Navigateur + WS Colyseus (echec sans game-server) |

Le smoke live **ne doit pas** passer via un fallback « Apercu local ».

## CI

Workflow : `.github/workflows/ci.yml`

Ordre :

1. `pnpm install --frozen-lockfile`
2. generation contrats + Prisma
3. `pnpm test:unit`
4. `pnpm test:integration` (docker compose, DB vide)
5. Playwright chromium + `pnpm test:e2e`
6. `pnpm typecheck` / `pnpm lint` / `pnpm build` / `pnpm docs:check`

Artefacts en cas d'echec : `apps/web/playwright-report/`, `apps/web/test-results/`, `test-results/`.

## Secrets et logs

Les scripts d'orchestration passent les sorties par un redacteur qui masque :

- mots de passe dans les URL (`user:***@host`)
- `password=`, `token=`, `secret=`, `api_key=`
- en-tetes `Bearer …`
- cookies `__session` / `__Host-session`

Ne jamais committer de vrais secrets dans `.env` (ignore) ni dans les artefacts CI.

## Diagnostic des echecs

| Symptome | Piste |
|---|---|
| `docker compose … failed` | Installer Docker, ou `TEST_INFRA_BACKEND=local` avec PG/Redis locaux |
| `prisma migrate deploy failed` | Verifier `DATABASE_URL` redigee (logs masques) et que la DB est vide/jetable |
| `Timeout waiting for HTTP …/health` | Port API deja pris ; changer `WORKTREE_ID` ou tuer le process |
| L4 Colyseus TCP false | Game-server non demarre ou `GAME_SERVER_PORT` incorrect |
| L5 WS `ws-error` | webServer game non pret ; lire logs Playwright « game-server » |
| E2E auth 5xx | Migrate manquante ou API sans `DATABASE_URL` |
| Conflit de ports entre worktrees | Confirmer des `WORKTREE_ID` differents ; `pnpm infra:down` |

## Exemple deux worktrees

```bash
# worktree A
export WORKTREE_ID=apex-a-identity
pnpm test:integration

# worktree B (autre shell / machine path)
export WORKTREE_ID=apex-a-payment
pnpm test:integration
```

Teardown garanti : les runners `run-integration.mjs` et `run-e2e.mjs` appellent `infraDown` dans un `finally`, y compris apres echec ou SIGINT/SIGTERM.
