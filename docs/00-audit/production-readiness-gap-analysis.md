# Audit de preparation production

Date d'observation : 2026-07-16  
Branche : `v0.1`  
Commit audite : `cd96de848455875a5ff2c2d2935ac0911782f7b9`

## Verdict

Le depot est **NO-GO pour une production commerciale avec utilisateurs reels et argent reel**.

SEQ-00 a SEQ-03 et WAVE-A ont reconstruit un socle v0.1 utile. Ils ne prouvent ni l'integration
officielle Fapshi, ni un mini-jeu jouable, ni l'exploitation d'un environnement de production. La
recette SEQ-04 actuelle reste une recette de reconstruction; elle n'est pas un gate de go-live.

Le programme de sortie production est defini dans
`docs/06-roadmap/apex-production-execution-plan.md` et ses fiches executables sous
`docs/06-roadmap/apex-tasks/production/`.

## Methode et seuil de preuve

L'audit a croise le code courant, les migrations, les contrats, les routes, les tests, la CI, les docs
de couches, les preuves legacy et trois revues independantes produit, services/paiement et ops/securite.

Une capacite est consideree production seulement si :

- elle est cablee dans le flux normal sans donnee hardcodee, provider factice ou fallback local;
- ses entrees, autorisations, transactions, idempotence et erreurs sont traitees cote serveur;
- ses frontieres reelles sont prouvees aux niveaux L3 a L5, puis dans la recette L6;
- elle est observable, restaurable et exploitable par un runbook;
- les risques residuels possedent un proprietaire et une decision de go-live explicite.

Les doubles de test restent autorises en L1 pour isoler du domaine pur. Ils ne comptent jamais comme
preuve d'acceptation d'une DB, d'un transport, de Fapshi, de Redis, d'un provider ou d'un navigateur.

## Photographie factuelle

| Surface            | Etat au commit audite                               | Verdict production                           |
| ------------------ | --------------------------------------------------- | -------------------------------------------- |
| Monorepo           | pnpm/Turbo; 5 apps et 4 packages principaux         | Socle exploitable                            |
| Contrats           | 14 fichiers Proto; 12 services; 57 RPC              | Source de verite utile                       |
| ConnectRPC serveur | 8/12 services; 39/57 methodes                       | Incomplet                                    |
| Prisma             | 21 modeles; 7 migrations                            | Modele production incomplet                  |
| Web                | 41 pages                                            | Plusieurs shells/donnees hardcodees          |
| Mini-jeux          | 120 titres; socle generique                         | Zero runtime jouable                         |
| Realtime           | Room Colyseus, auth, mouvement, reconnect generique | Aucun gameplay mini-jeu prouve               |
| Workers            | BullMQ et trois handlers                            | Aucun producteur/scheduler runtime complet   |
| Notifications      | Provider production fail-closed                     | Livraison reelle absente                     |
| CI                 | Une CI test/typecheck/lint/build/docs               | Aucun deploy/rollback/supply-chain gate      |
| Infra              | Compose local PostgreSQL/Redis                      | Aucun environnement production reproductible |

## Bloqueurs P0

### 1. Fapshi est choisi, mais l'adaptateur courant n'est pas Fapshi officiel

La decision produit est fermee : Fapshi est le fournisseur de collecte et de paiement retenu. Le code
courant reste bloquant :

- `.env.example` declare `FAPSHI_BASE_URL`, `FAPSHI_API_USER`, `FAPSHI_API_KEY`, tandis que
  `provider-adapter.ts` lit `FAPSHI_API_URL` et ignore `apiuser`;
- le code appelle `/initiate` avec Bearer et attend `checkoutUrl/reference`; l'API officielle attend
  `POST /initiate-pay`, les headers `apiuser`/`apikey`, puis renvoie `link`/`transId`;
- sans configuration, l'adaptateur fabrique `fapshi-local-*` et un checkout local tout en annoncant
  le provider Fapshi;
- le webhook courant attend un schema et des statuts incompatibles avec `transId` et
  `CREATED|PENDING|SUCCESSFUL|FAILED|EXPIRED`;
- le webhook Fapshi n'est envoye qu'une fois : la route doit accuser reception rapidement, conserver
  une inbox idempotente, puis verifier la transaction par l'API de statut;
- la reconciliation locale expire seulement les anciennes transactions et n'interroge pas Fapshi;
- l'UI n'ouvre pas le lien de checkout;
- le paiement n'est pas attache atomiquement a la participation et a son droit d'admission.

La collecte et le payout doivent utiliser deux services Fapshi et deux couples de credentials distincts;
l'activation payout ne doit jamais changer les privileges du service de collecte. Fapshi n'expose pas
d'endpoint refund natif : toute compensation est une decision metier (payout compensatoire, procedure
manuelle ou hors scope) avec sa propre comptabilite. Voir
[payout Fapshi](https://docs.fapshi.com/en/api-reference/endpoint/payout).

Sources officielles consultees le 2026-07-16 :
[environnements](https://docs.fapshi.com/en/api-reference/preliminary-knowledge/environment),
[initiate-pay](https://docs.fapshi.com/fr/api-reference/endpoint/initiate-pay),
[payment-status](https://docs.fapshi.com/en/api-reference/endpoint/payment-status) et
[webhook](https://docs.fapshi.com/fr/api-reference/endpoint/webhook). Le legacy contient une
implementation plus proche du protocole officiel, mais elle doit etre readaptee, jamais copiee
aveuglement.

### 2. Les six mini-jeux n'existent pas dans le runtime courant

La premiere surface commerciale est fixee a un jeu par famille. Les cles suivantes sont la baseline
technique la mieux etayee; P-SEQ-01 doit les ratifier avant contracts/runtime :

| Famille    | Cle canonique initiale | Titre produit cible  | Etat                                   |
| ---------- | ---------------------- | -------------------- | -------------------------------------- |
| Solo       | `memory-sequence`      | Sequence memoire     | Candidat legacy, non implemente        |
| Duel       | `pure-reaction-duel`   | Course au signal     | Candidat legacy, non implemente        |
| Alliance   | `trust-bridge`         | Le pont fragile      | Candidat legacy, non implemente        |
| Equipe     | `team-relay`           | Relais de mini-defis | Candidat legacy, non implemente        |
| Survie     | `danger-sweep`         | Le rayon balayeur    | Candidat legacy, non implemente        |
| Role cache | `silent-vote`          | Le saboteur          | Nom runtime legacy; regles a redefinir |

Ces six candidates structurent la cible de planification, pas les regles detaillees. `P-SEQ-01` doit
les ratifier ou les remplacer et faire signer les six rulebooks avant contrats/runtime. Le code
courant n'a ni registre/version de manifest,
ni messages gameplay types, ni adapter runtime, ni UI gameplay, ni checkpoint, ni generation de score
provisoire depuis le live. `Round.minigame` est une chaine libre et le seed derive deja
`memory_sequence` de la cle canonique `memory-sequence`.

Risques specifiques :

- reaction : ne jamais faire confiance a `clickedAtMs` client; horodatage et fairness serveur;
- alliance : binomes, joueur impair, no-show et reconnexion d'un seul partenaire;
- equipe : choix mutuel, ordre et membre autorise, equipe incomplete;
- survie : coordonnees, collisions et eliminations entierement serveur, charge tick;
- role cache : roles/informations/victoire reellement prives, redaction stricte wire/log/support.

### 3. Le parcours commercial accepte encore des etats non payes ou concurrents

- le montant vient d'un petit catalogue d'environnement avec fallback a 2 500 XAF au lieu d'une
  configuration de partie autoritaire;
- `PaymentTransaction` n'a pas de relation durable vers `PartyParticipation`, de devise ni de couples
  provider/external IDs uniques suffisants;
- `REGISTERED` peut etre admis au lobby comme s'il etait paye;
- la derniere place est attribuee par `count` puis `create`, sans protection transactionnelle de
  capacite;
- remboursements, expirations, payouts et ledger compensatoire ne sont pas implementes.

### 4. L'authentification et l'autorisation ne sont pas durcies

- le token de session brut est present dans la reponse Protobuf et mappe dans le JavaScript navigateur,
  ce qui contourne la finalite du cookie `HttpOnly`;
- le rate limiting est une `Map` locale, non partagee entre instances;
- les headers proxy sont crus directement; un header forge peut influencer IP, protocole et cookie;
- CSP, HSTS, protection frame, politique Origin/CSRF et quotas live restent absents;
- des routes finance autorisent `ADMIN` alors que le domaine reserve `MANAGE_PAYMENTS` a `FINANCE`.

### 5. Notifications et jobs ne forment pas une chaine executable

- le provider production retourne `PROVIDER_SDK_NOT_WIRED`;
- aucun producteur applicatif/outbox n'enfile de facon durable les `NotificationJob` crees;
- les scans de deadline et reconciliation ne sont pas planifies en production;
- la prise `PENDING -> PROCESSING` n'est pas atomique et peut doubler un envoi;
- le token de reset en clair peut rester dans le payload JSON du job;
- certaines erreurs retournees au lieu d'etre levees peuvent faire marquer le job comme reussi.

### 6. Les preuves systeme ne couvrent pas le vrai parcours

La commande `scripts/worktree-run pnpm test:integration` a passe 4 fichiers et 9 tests avec PostgreSQL,
API et game-server reels. Elle ne demarre ni worker, ni provider, ni navigateur.

Les commandes racine `pnpm test` et `pnpm test:unit` heritent actuellement du `DATABASE_URL` local,
activent ainsi les suites L3, mais ne demarrent pas PostgreSQL. Elles echouent sur serveur inaccessible.
Les 28 tests unitaires DB passent lorsqu'ils sont executes sans les cinq fichiers L3; les autres
workspaces passent dans la meme execution. Le runner L1 doit donc neutraliser explicitement les
variables d'integration et le runner L3 doit rester seul proprietaire de l'infrastructure.

La commande `scripts/worktree-run pnpm test:e2e` a construit les workspaces et execute 9 tests :
8 passent, 1 echoue. Deux workers Playwright lancent le seed en concurrence et provoquent une violation
unique `PaymentTransaction.idempotencyKey`. Le live E2E ouvre seulement un WebSocket brut; la spec room
est explicitement un apercu local. Cette execution n'est donc pas une preuve SEQ-04 verte.

### 7. Aucune chaine de deploiement et d'exploitation production

Absents du depot : images applicatives, manifests/IaC, CD, promotion, rollback, secrets manages,
readiness DB/Redis, drain API/game-server, backup/PITR/restore drill, RPO/RTO, dashboards, alertes,
traces, SLO, astreinte, charge/soak, runbooks incident et release.

Le `docker-compose.yml` courant est une infrastructure locale, pas un blueprint de production.

### 8. Le seed et les fallbacks sont dangereux

Le seed peut creer/reinitialiser des comptes connus et afficher `SeedPass123!`, sans garde-fou de
production. `LIVE_SERVER_URL` diverge de `GAME_WS_URL` et retombe sur `ws://localhost:3002`. Un binaire
production doit echouer au demarrage si une configuration critique manque; il ne doit jamais revenir
silencieusement a localhost, a un faux checkout ou a un provider factice.

## Ecarts P1 obligatoires avant ouverture publique

- brancher les 18 RPC absents et retirer les pages/actions hardcodees des parcours inclus;
- implementer support, incidents, compliance et audit durable avec RBAC par acteur;
- politique de retention, export, suppression/anonymisation et conservation financiere;
- consentement CGU/confidentialite versionne et prouve cote serveur;
- readiness et graceful shutdown de chaque service;
- observabilite externe, alertes et SLO paiement/live/jobs;
- tests Firefox, WebKit, mobile tactile, lecteur d'ecran, contraste et reduced motion;
- scans dependances/secrets/SAST, SBOM, provenance et artefacts signes;
- campagne charge/soak/concurrence avec capacite signee;
- inventaire et licences des assets/sons/polices des six jeux.

## Ecarts P2 apres premier lancement maitrise

- multi-region actif/actif;
- canary ou blue/green automatise au-dela du rollback initial obligatoire;
- chaos continu et device lab etendu;
- audit externe recurrent et certifications eventuelles;
- archivage froid et residence avancee des donnees.

## Audit dependances

`pnpm audit --prod --audit-level low` signale :

- PostCSS avant 8.5.10, severite moderee, transitif de Next.js;
- `uuid` 8.3.2, severite moderee, transitif de Colyseus auth;
- `elliptic` jusqu'a 6.6.1, severite faible, transitif de Colyseus auth, sans correctif annonce dans
  l'arbre courant.

Ces alertes doivent etre classees, corrigees ou formellement acceptees par `P-C-SECURITY` avant release.

## Decision de sortie

La production n'est autorisee que lorsque `P-SEQ-09` possede toutes ses preuves : six jeux, parcours
Fapshi controle, notification reelle, restauration, rollback, charge signee, no-leak, securite, legal,
support et astreinte. Aucun statut de fiche ou pourcentage documentaire ne remplace ces preuves.
