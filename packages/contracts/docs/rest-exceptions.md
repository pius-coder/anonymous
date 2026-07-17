# Exceptions REST (Hono JSON) — registre P-SEQ-02

**Date d'ouverture du registre :** 2026-07-16  
**Dernière mise à jour production :** 2026-07-17 (P-SEQ-02)  
**Propriétaire :** `packages/contracts`  
**Règle générale :** cible = ConnectRPC pour commands/queries ; REST seulement si listé ici.

Chaque exception est **motivée**, **datée**, liée à un **contrat `.proto`**, et porte une **condition de retrait**.

---

## Politique

1. Le contrat Protobuf reste la source de vérité, jamais le DTO Hono.
2. Une route REST d'exception doit adapter un message `.proto` existant (ou être un webhook provider).
3. Fixture golden ou test de contrat requis avant nouvel ajout.
4. Retrait = bascule client vers Connect + suppression route (ou deprecation documentée).

---

## Exceptions actives

### EX-REST-001 — Auth HTTP legacy

| Champ | Valeur |
|---|---|
| Routes | `POST /v1/auth/register`, `POST /v1/auth/login`, `POST /v1/auth/logout`, `GET /v1/me` |
| Date | 2026-07-16 |
| Motif | Dual-stack pendant migration cookie opaque ; web/API déjà câblés REST + Connect partiel |
| Contrat proto | `IdentityService.Register/Login/Logout/GetCurrentUser` |
| Audience | Public / joueur |
| Condition de retrait | Clients web et tests E2E n'utilisent plus que Connect Identity ; cookies documentés côté Connect interceptors |
| Retrait prévu | Après lot A-IDENTITY (password reset + unifier session) |

### EX-REST-002 — Catalogue et participation parties

| Champ | Valeur |
|---|---|
| Routes | `GET /v1/parties`, `GET /v1/parties/:code`, `POST /v1/parties/:code/register`, `POST /v1/parties/:code/cancel`, `GET /v1/parties/:code/my-participation` |
| Date | 2026-07-16 |
| Motif | Parcours joueur livré en REST avant enregistrement `SessionService` / `ParticipationService` |
| Contrat proto | `SessionService.GetParty/ListParties`, `ParticipationService.*` |
| Audience | Public / joueur |
| Condition de retrait | Services Connect Session + Participation enregistrés et consommés par `apps/web` |
| Retrait prévu | Lots A-ACQUISITION |

### EX-REST-003 — Admin parties / planification

| Champ | Valeur |
|---|---|
| Routes | `POST/GET/PUT /v1/admin/parties*`, validate, publish, schedule, participations |
| Date | 2026-07-16 |
| Motif | Command center admin REST avant `SessionService` admin + `AdminService` |
| Contrat proto | `SessionService.CreateParty/ScheduleParty`, `AdminService.ListParties` |
| Audience | Admin |
| Condition de retrait | Connect Session/Admin câblés ; UI admin sans mocks REST |
| Retrait prévu | Lots admin command center post WAVE-A |

### EX-REST-004 — Paiements et wallet

| Champ | Valeur |
|---|---|
| Routes | `POST /v1/payments/initiate`, `POST /v1/payments/wallet/pay`, `GET /v1/payments/:id/status`, `GET /v1/wallet`, `GET /v1/wallet/ledger`, admin payments list/get/reconcile |
| Date | 2026-07-16 |
| Motif | Domaine finance livré REST ; `PaymentService` non enregistré Connect |
| Contrat proto | `PaymentService.*` |
| Audience | Joueur / finance / admin |
| Condition de retrait | PaymentService Connect + clients finance/joueur migrés |
| Retrait prévu | Lot A-PAYMENT |

### EX-REST-005 — Webhook provider Fapshi (permanente contrainte externe)

| Champ | Valeur |
|---|---|
| Routes | `POST /v1/payments/webhook/fapshi` |
| Date | 2026-07-16 |
| Motif | **Contrainte externe** : le provider impose HTTP JSON webhook, pas Connect |
| Contrat proto | REST body → adaptateur → `ProviderWebhookEvent` + `IngestProviderWebhookEvent` (Connect interne/system). Statuts wire `FapshiWireStatus` mappés vers `PaymentInternalStatus`. |
| Audience | Système (provider HTTP) puis système interne Connect |
| Secrets | Headers credentials provider **jamais** mappés en champs client/proto publics |
| Condition de retrait | Aucune tant que le provider n'offre pas un protocole alternatif ; **exception durable** documentée |
| Retrait prévu | N/A (revoir si changement provider) |

### EX-REST-006 — Préparation / lobby

| Champ | Valeur |
|---|---|
| Routes | Joueur `.../preparation/*` ; admin open, confirm-start, announcements |
| Date | 2026-07-16 |
| Motif | PreparationService non enregistré Connect |
| Contrat proto | `PreparationService.*` |
| Audience | Joueur / admin |
| Condition de retrait | PreparationService Connect + UI lobby réelle |
| Retrait prévu | Lot A-PREPARATION |

### EX-REST-007 — Live access token

| Champ | Valeur |
|---|---|
| Routes | `POST /v1/live/parties/:partyId/access` |
| Date | 2026-07-16 |
| Motif | Sprint 09 autorise Hono mince pour access token pendant dual-stack ; Connect `CreateLiveAccess` déjà partiel |
| Contrat proto | `RealtimeAccessService.CreateLiveAccess` |
| Audience | Joueur / admin / observer autorisé |
| Condition de retrait | Un seul chemin Connect `CreateLiveAccess` consommé par web + game-server clients ; route REST supprimée |
| Retrait prévu | Lot A-REALTIME |

### EX-REST-008 — Rounds joueur / admin

| Champ | Valeur |
|---|---|
| Routes | `POST /v1/rounds/:roundId/finish` ; admin configure/briefing/activate/pause/resume/close |
| Date | 2026-07-16 |
| Motif | Dual-stack : `RoundService` Connect complet mais REST encore exposé pour clients non migrés |
| Contrat proto | `RoundService.*` |
| Audience | Joueur / admin |
| Condition de retrait | Aucun client REST round ; tests transport Connect only |
| Retrait prévu | Après preuve E2E Connect round + suppression routes |

### EX-REST-009 — Santé process

| Champ | Valeur |
|---|---|
| Routes | `GET /health` |
| Date | 2026-07-16 |
| Motif | Probe infra / load balancer ; hors domaine métier |
| Contrat proto | N/A (ops) |
| Audience | Ops |
| Condition de retrait | Aucune (exception ops durable) |
| Retrait prévu | N/A |

---

## Domaines sans exception REST (contrat only jusqu'au câblage)

| Domaine | Service | Statut |
|---|---|---|
| Scoring | ScoringService | Pas de route REST ; Connect futur uniquement |
| Notifications | NotificationService | Pas de route REST |
| Mini-jeux catalogue | MiniGameService | Pas de route REST |
| Compliance | ComplianceService | Pas de route REST |
| Snapshots admin/observer | RealtimeAccess / Admin | Snapshots live aussi via WS `snapshot:request` |

---

## Procédure d'ajout d'exception

1. Justifier l'impossibilité Connect immédiate.
2. Pointer le message `.proto`.
3. Ajouter une ligne datée ici avec condition de retrait.
4. Fixture golden si message nouveau.
5. Ne pas faire de la route la source de vérité.

## Procédure de retrait

1. Vérifier zéro consommateur REST (rg + tests).
2. Supprimer route.
3. Marquer exception `RETIRED` avec date dans ce fichier (historique conservé).
