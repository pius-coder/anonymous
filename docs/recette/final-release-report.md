# Rapport final de recette V1

Date: 2026-07-08
Branche: `feature/16-finalisation-recette-lancement`
Perimetre: recette finale, stabilisation et lancement controle V1.

## Decision go/no-go

- Lancement controle sandbox: GO, sous reserve d'executer les parcours manuels sur environnement recette avec donnees seedees.
- Lancement live public: NO-GO tant que les gates externes ne sont pas approuves.
- Cash-out argent reel: bloque en V1.
- Jeux a hasard dominant: bloque par gate de conformite.

## Gates documentaires

| Technologie | Version verifiee | Source | Reference | Decision |
| --- | --- | --- | --- | --- |
| Hono | 4.12.28 | Context7 | `/websites/hono_dev` | OK |
| Next.js | 16.2.10 | Context7 | `/vercel/next.js/v16.2.9` | OK |
| Prisma | 6.19.3 | Context7 | `/prisma/web` | OK |
| Colyseus | 0.17.10 | Context7 | `/colyseus/colyseus` | OK |
| BullMQ | 5.79.3 | Context7 | `/websites/bullmq_io` | OK |
| Redis | Redis 7 compose image / ioredis 5.10.1 | Context7 | `/redis/docs` | OK |
| Docker Compose | compose format 3.8 | Context7 | `/docker/compose` | OK |
| Fapshi | HTTP API | Documentation officielle | `https://docs.fapshi.com/llms.txt` | OK |
| WhatsApp Cloud API | Graph API v23 docs | Context7 | `/websites/developers_facebook_business-messaging_whatsapp_v4` | OK |

Notes de verification:
- Fapshi sandbox/live utilisent des credentials et base URLs separes.
- Fapshi requiert `apiuser` et `apikey` en headers.
- Fapshi webhooks envoient `x-wh-secret` si un secret est configure.
- Le polling Fapshi est limite; les webhooks restent le flux principal.
- Docker Compose healthchecks et `--wait` sont disponibles pour attendre les services sains.
- Redis doit etre persistant pour les queues; le compose local active AOF.

## Parcours de recette obligatoires

| Parcours | Evidence automatisee | Evidence manuelle restante | Statut |
| --- | --- | --- | --- |
| Decouverte et inscription | Playwright catalogue public, auth API, registrations API | Parcours navigateur complet sur environnement recette | MANUAL |
| Paiement et lobby | paiements API, lobby API, reconciliation worker | Fapshi sandbox happy path avec credentials sandbox | MANUAL |
| Live et resolution | live API, game-server session store, round deadline worker, round resolution | Smoke test deux clients reconnectables | MANUAL |
| Resultats et credits | admin results, results service, credits distribution worker, wallet routes | Revue ledger sur donnees de recette | MANUAL |
| Support et audit | admin operations, admin payments, security/support routes | Demo support/finance/admin avec comptes distincts | MANUAL |

## Tests finaux a executer

Commandes executees pendant Feature 16:

- `pnpm --filter @session-jeu/db exec prisma format` - PASS
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/session_jeu?schema=public pnpm --filter @session-jeu/db exec prisma validate` - PASS
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/session_jeu?schema=public pnpm --filter @session-jeu/db db:generate` - PASS
- `pnpm typecheck` - PASS
- `pnpm lint` - PASS
- `pnpm test` - PASS
- `pnpm build` - PASS
- `E2E_BASE_URL=http://localhost:3002 pnpm --filter @session-jeu/web test:e2e` - PASS, 4 tests on `next start --port 3002`

Note: `pnpm --filter @session-jeu/db exec prisma validate` sans `DATABASE_URL` explicite echoue dans ce shell parce que Prisma CLI ne charge pas le `.env` racine depuis le package `packages/db`.

## Gates pre-lancement live

| Gate | Statut | Bloque live | Note |
| --- | --- | --- | --- |
| Environnement production configure | MANUAL | Oui | A verifier dans l'infrastructure cible. |
| Secrets production separes | MANUAL | Oui | Le repo ne contient que des placeholders; verifier le secret manager/deploiement. |
| Fapshi live valide | MANUAL | Oui | Activer compte, credentials live et IP whitelist. |
| Backups PostgreSQL actifs | MANUAL | Oui | Depend du provider de base de donnees. |
| Monitoring et alertes actifs | MANUAL | Oui | Connecter logs requestId, workers, paiements et erreurs API a l'outil d'alerte. |
| Politique confidentialite et CGU pretes | BLOCKED | Oui | Documents legaux absents du repo. |
| Avis legal ou lancement limite sans cash-out | PASS | Non | V1 bloque le cash-out; avis juridique requis pour public/live. |
| Plan support incident pret | MANUAL | Oui | Definir astreinte, SLA, escalade et scripts de communication. |
| Rollback plan documente | MANUAL | Oui | A lier au pipeline de deploiement final. |

## Anomalies restantes

- Aucun blocker code connu apres les validations locales.
- Le lancement live public reste bloque par des validations externes non automatisables dans le repo.
- Le fichier `session-ses_0bfa.md` est un contexte local de reprise et ne fait pas partie de la recette.
