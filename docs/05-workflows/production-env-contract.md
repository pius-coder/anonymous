# Contrat d'environnement production (P-SEQ-00)

Package : `@session-jeu/config`  
CLI : `pnpm env:validate --service api` · `pnpm env:report`

## APP_ENV

| Valeur | Usage | Localhost / fake / seed |
|--------|--------|-------------------------|
| `local` | poste de dev | autorisés |
| `test` | harness L1–L5 | autorisés (infra jetable) |
| `staging` | préproduction | **interdits** — fail-fast |
| `production` | utilisateurs réels | **interdits** — fail-fast |

`NODE_ENV` reste le mode Node (`development` / `test` / `production`).  
`APP_ENV` est la frontière de déploiement.

## Variables requises (staging / production)

Voir la sortie de `pnpm env:report` (noms uniquement, aucun secret).

Services concernés : `api`, `game-server`, `worker`, `web`, `whatsapp-gateway`.

Champs stricts typiques :

- `DATABASE_URL`, `REDIS_URL`
- `API_URL`, `GAME_WS_URL`
- `FAPSHI_BASE_URL`, `FAPSHI_API_USER`, `FAPSHI_API_KEY`, `FAPSHI_WEBHOOK_SECRET`

## Comportement fail-fast

Avant `listen` / démarrage worker :

```ts
import { assertBootEnv } from "@session-jeu/config";
assertBootEnv("api");
```

Une config production incomplete lève `EnvValidationError` **avant** l'ouverture d'un port.

Les adaptateurs locaux (`fapshi-local-*`, Redis `localhost`, live `ws://localhost`) lèvent une erreur en `staging`/`production` au lieu d'émettre des valeurs de secours.

## Niveaux de test

| Niveau | Commande | Frontières |
|--------|----------|------------|
| L1 | `pnpm test:unit` | doubles unitaires autorisés; env d'intégration neutralisé |
| L3/L4 | `pnpm test:integration` | PostgreSQL + Redis + API + Colyseus (+ worker) réels |
| L5 | `pnpm test:e2e` | navigateur; seed sous verrou (`scripts/lib/seed-lock.mjs`) |

## CI

Jobs séparés : unit, integration (worker), e2e (`PLAYWRIGHT_WORKERS=2`), gates (typecheck/lint/build/audit/negative env).

## Seed

`db:seed` est interdit si `APP_ENV` est `staging` ou `production`.  
Les workers Playwright partagent un verrou exclusif par `DATABASE_URL` pour éviter les collisions d'unicité.
