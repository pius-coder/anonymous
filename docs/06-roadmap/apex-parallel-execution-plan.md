# Plan d'execution APEX parallele v0.1

Ce plan transforme l'analyse d'ecart en taches lancables dans plusieurs worktrees sans partager un
index Git, une branche, une base de donnees ou un port. L'ordre est contractuel : les taches
non independantes sont executees avant les vagues paralleles.

Documents obligatoires :

- `docs/00-audit/v0.1-gap-analysis.md`
- `docs/05-workflows/agentic-feature-pipeline.md`
- `docs/05-workflows/apex-workflow.md`
- `docs/05-workflows/apex-parallel-worktrees.md`
- `docs/05-workflows/test-strategy.md`
- `docs/06-roadmap/apex-tasks/README.md` et la fiche autonome de la session Codex.

## 1. Regles de decoupage

- Une tache = une user story ou une capacite technique stable, des AC atomiques et un worktree.
- Chaque tache declare ses chemins possedes et interdits avant implementation.
- `pnpm-lock.yaml`, `package.json` racine, `turbo.json`, `.github/workflows`, les fichiers generes,
  `packages/contracts/proto`, `schema.prisma` et `migrations/` ont un proprietaire unique.
- Une tache metier ne modifie pas ces surfaces partagees. Elle demande un changement a la tache
  sequentielle proprietaire ou attend son merge.
- Un test avec une DB, un transport ou un provider mocke ne satisfait pas le gate d'integration de
  cette couche.

## 2. Taches non independantes - ordre obligatoire

### SEQ-00 - Socle d'integration et CI

**Dependances** : aucune. **Bloque** : toutes les autres taches.

**Ownership exclusif** : `package.json`, `pnpm-lock.yaml`, `turbo.json`, `.github/workflows/**`,
`docker-compose.yml`, `.env.example`, scripts d'orchestration, configurations Vitest/Playwright.

**Livrables** :

- scripts racine distincts `test:unit`, `test:integration`, `test:e2e` et `test:all`;
- PostgreSQL et Redis jetables avec identifiant de worktree;
- ports API, web, game-server et worker derives de `WORKTREE_ID`;
- Playwright `webServer[]` pour API, game-server et web, sans fallback local dans les specs live;
- CI avec install frozen, generation, migration DB vide, unit, integration, E2E, lint, typecheck, build;
- artefacts de logs sans secrets et teardown garanti.

**Preuves minimales** : migration d'une DB vide, test repository sur PostgreSQL, test ConnectRPC sur
transport reel, boot Colyseus avec client simule, smoke Playwright multi-service.

### SEQ-01 - Freeze contrats et transports

**Dependances** : SEQ-00. **Bloque** : tous les lots API/web/realtime.

**Ownership exclusif** : `packages/contracts/proto/**`, configuration Buf, fixtures/golden, sortie
generee et registre des exceptions REST.

**Livrables** :

- matrice figee des 12 services et 57 methodes avec choix Connect, WebSocket ou exception REST datee;
- messages/erreurs/audiences manquants pour scoring, notifications, snapshots et mini-jeux;
- compatibilite Buf et generation deterministe;
- interdiction aux lots metier de regenerer ou modifier les contrats.

**Preuves minimales** : lint/generation Buf, tests golden/no-leak, diff genere propre.

### SEQ-02 - Baseline persistence et seed

**Dependances** : SEQ-01. **Bloque** : scoring, notifications, compliance et E2E metier.

**Ownership exclusif** : `packages/db/prisma/schema.prisma`, `packages/db/prisma/migrations/**`,
`packages/db/prisma/seed.ts`, API publique des repositories et tests PostgreSQL partages.

**Livrables** :

- seed deterministe : admin, support, finance, joueurs, partie publiee, participations et wallet;
- operations ScoreReview et DeliveryLog;
- modeles compliance/incidents seulement apres validation des use cases du sprint 18;
- migration depuis DB vide et depuis le schema v0.1 courant;
- harness PostgreSQL avec isolation et rollback/cleanup par test.

**Preuves minimales** : contraintes, transactions, idempotence et claims concurrents sur PostgreSQL reel.

### SEQ-03 - Merge train de la vague A

**Dependances** : lots WAVE-A selectionnes et verts.

L'integrateur fusionne un commit atomique a la fois avec `--no-ff`. Apres chaque merge : generation
contrats, migration DB vide, tests du lot, tests d'integration affectes, typecheck et lint. Les conflits
ne sont pas resolus en choisissant aveuglement un cote; le contrat de tache et les AC font foi.

### SEQ-04 - Recette systeme et gel v0.1

**Dependances** : SEQ-03 et WAVE-B.

Execute la matrice E2E multi-acteur, les tests de charge/connexion necessaires, le no-leak des scores et
snapshots, le build complet et la recette mobile. Aucun mock/fallback n'est autorise sur le chemin teste.

## 3. WAVE-A - taches paralleles independantes

Ces taches demarrent seulement apres SEQ-00, SEQ-01 et SEQ-02. Les fichiers de montage partages
(`apps/api/src/index.ts`, `apps/api/src/rpc/routes.ts`, `apps/web/src/services/rpcServices.ts` et les
providers web) sont integres par SEQ-03 a partir d'exports publics livres par chaque lot.

| ID | Capacite | Ownership principal | AC et preuve de sortie |
|---|---|---|---|
| A-IDENTITY | Reset password et sessions | `apps/api/src/use-cases/auth/**`, handler Identity, routes auth; `apps/web/src/app/**/auth/**` | request/reset/revocation, enumeration-safe, rate limit; integration DB + Connect + E2E auth |
| A-ACQUISITION | Catalogue, detail, participation | use-cases/services Session+Participation; routes web `/parties` hors live | loading/empty/error/stale, capacite et idempotence; integration API/DB + E2E joueur |
| A-PAYMENT | Wallet, paiement, finance | use-cases/service Payment; routes web paiement/finance | webhook et double-submit idempotents, RBAC finance; PostgreSQL + transport + E2E |
| A-PREPARATION | Lobby, presence, annonces | use-cases/service Preparation; UI lobby/admin preparation | etats present/ready/leave, absence raisonnee, NotificationJob cree; DB + transport + E2E |
| A-SCORING | Verification et publication | use-cases/service Scoring; UI admin scores et resultats joueur | correction raisonnee, publication explicite, aucun score provisoire joueur; DB + Connect + E2E no-leak |
| A-REALTIME | Sync round, snapshots, reconnect | `apps/game-server/**`, service Realtime; UI room/observer live | config serveur, DB->room, reconnect, duplicate/late input, projections par role; `@colyseus/testing` + E2E WS |
| A-WORKERS | Runners et livraison | `apps/worker/**`, `apps/whatsapp-gateway/**` hors contrats/DB schema | Queue/Worker, claims, retry/backoff, DeliveryLog, redaction; Redis/PostgreSQL + provider fake contractuel |

### Frontieres interdites WAVE-A

- Aucun lot ne modifie `packages/contracts/**`, `packages/db/prisma/**`, le lockfile ou Turbo.
- Aucun lot ne modifie `apps/web/src/services/rpcServices.ts`; il cree un adaptateur de domaine ou
  consomme la facade existante, puis SEQ-03 realise la composition partagee.
- Aucun lot ne monte lui-meme son service dans le routeur central.
- A-PREPARATION cree l'intent `NotificationJob`; A-WORKERS en assure la livraison. Ils ne partagent
  aucun fichier source.
- A-SCORING possede toutes les transitions applicatives de score; A-REALTIME ne publie jamais un score.
- A-REALTIME possede la room et les handlers; les autres lots passent par ses API publiques.

## 4. WAVE-B - taches paralleles apres merge A

| ID | Dependances | Ownership principal | Definition of Done |
|---|---|---|---|
| B-MINIGAME | A-REALTIME, A-SCORING | `packages/game-engine/src/minigame/**`, adapter dedie game-server | runtime pur, manifest valide, memory-sequence, nonce/deadline, reconnect, score provisoire; unit + Colyseus + E2E publication |
| B-OPERATIONS | A-WORKERS, A-SCORING | use-cases compliance/support/audit et UI associee | gates/waiver, incidents, timeline, RBAC support; DB + transport + E2E refus |
| B-OBSERVER | A-REALTIME, A-SCORING | routes/composants observer hors moteur live | snapshot filtre, joueur elimine distinct, aucune commande; E2E client malveillant/no-leak |
| B-RESILIENCE | Tous lots A | tests systeme, observabilite et outillage de charge sans code metier | multi-admin conflict, reconnect, retry, timeout, logs sans secrets, metriques utiles |

## 5. Graphe de dependances

```text
SEQ-00 integration/CI
  -> SEQ-01 contrats/transports
    -> SEQ-02 persistence/seed
      -> [A-IDENTITY | A-ACQUISITION | A-PAYMENT | A-PREPARATION |
          A-SCORING | A-REALTIME | A-WORKERS]
        -> SEQ-03 merge train A
          -> [B-MINIGAME | B-OPERATIONS | B-OBSERVER | B-RESILIENCE]
            -> SEQ-04 recette systeme
```

## 6. Contrat APEX de chaque tache

Chaque description lancee dans un worktree contient obligatoirement :

1. ID, user story et scenarios Given/When/Then.
2. Commit de base et dependances deja mergees.
3. Chemins possedes et chemins interdits.
4. Docs locales et preuves HEAD a lire.
5. Bibliotheques a verifier avec Context7 et IDs utilises.
6. Contrats reseau figes consommes, sans regeneration locale.
7. Impact donnees et autorisations.
8. Tests L0 a L6 requis selon `test-strategy.md`.
9. Commandes de validation et resultats attendus.
10. Commit atomique de sortie, risques restants et aucune modification hors scope.

Le template d'execution, la creation des worktrees et le merge train sont specifies dans
`docs/05-workflows/apex-parallel-worktrees.md`.

Les prompts complets a donner aux sessions Codex separees sont versionnes dans
`docs/06-roadmap/apex-tasks/`. La matrice de ce document ne remplace pas ces fiches executables.
