# Matrice services / transports / audiences (P-SEQ-02 production freeze)

**Date de figement :** 2026-07-17  
**Branche :** `apex/p-seq-02` → merge `v0.1`  
**Propriétaire :** `packages/contracts` (P-SEQ-02)  
**Version contrats :** `v0.2.0-production`

Cette matrice est la baseline production que les lots métier consomment sans la modifier.
Après freeze P-SEQ-02 : **12 services / 65 méthodes RPC** + messages live hors RPC + six jeux typés.

## Légende transport

| Transport | Usage |
|---|---|
| **ConnectRPC** | Commandes et lectures HTTP (navigateur/Node). Cible pour toutes les RPC de service. |
| **WebSocket/Colyseus** | Live bidirectionnel : join, reconnect, mouvement, commandes mini-jeu, snapshots push. |
| **REST exception** | Hono JSON transitoire ou contrainte externe (webhook). Voir `rest-exceptions.md`. |

## Légende audience

| Audience | Code | Droits réseau |
|---|---|---|
| Joueur | `AUDIENCE_PLAYER` | Ses commandes + vues filtrées (pas de provisoire, pas de private minigame d'autrui) |
| Admin | `AUDIENCE_ADMIN` | Supervision + commandes compétitives autorisées |
| Observer | `AUDIENCE_READONLY_OBSERVER` | Snapshots readonly, scores publiés seulement |
| Système | `AUDIENCE_SYSTEM` | Workers, anti-cheat record, jobs, webhook ingest post-adapter |

---

## 1. IdentityService (`identity/v1`) — 8 méthodes

| Méthode | Transport cible | Audience |
|---|---|---|
| Register | ConnectRPC | Public → joueur |
| Login | ConnectRPC | Public → joueur |
| Logout | ConnectRPC | Joueur |
| Authenticate | ConnectRPC | Système/edge |
| GetCurrentUser | ConnectRPC | Joueur+ |
| RevokeSession | ConnectRPC | Joueur / admin |
| RequestPasswordReset | ConnectRPC | Public |
| ResetPassword | ConnectRPC | Public (token) |

## 2. SessionService (`session/v1`) — 4 méthodes

| Méthode | Transport | Audience |
|---|---|---|
| CreateParty | ConnectRPC | Admin |
| ScheduleParty | ConnectRPC | Admin |
| GetParty | ConnectRPC | Public (filtre) / admin |
| ListParties | ConnectRPC | Public / admin |

## 3. ParticipationService (`participation/v1`) — 3 méthodes

| Méthode | Transport | Audience |
|---|---|---|
| AttachParticipation | ConnectRPC | Joueur |
| GetParticipation | ConnectRPC | Joueur (self) / admin |
| ListParticipations | ConnectRPC | Admin |

## 4. PreparationService (`preparation/v1`) — 5 méthodes

| Méthode | Transport | Audience |
|---|---|---|
| OpenPreparation | ConnectRPC | Admin |
| MarkReady | ConnectRPC | Joueur |
| SendAnnouncement | ConnectRPC | Admin |
| ConfirmStart | ConnectRPC | Admin |
| GetPreparationState | ConnectRPC | Joueur / admin |

## 5. RealtimeAccessService (`realtime/v1`) — 4 méthodes Connect

| Méthode | Transport | Audience |
|---|---|---|
| CreateLiveAccess | ConnectRPC | Joueur / admin / observer autorisé |
| GetPlayerState | ConnectRPC | Joueur (self) / admin |
| GetAdminGameSnapshot | ConnectRPC | Admin |
| GetReadonlySnapshot | ConnectRPC | Observer / support lecture |

### Messages live hors RPC (WebSocket/Colyseus)

| Message | Transport | Audience |
|---|---|---|
| JoinLive / ReconnectLive | WS/Colyseus | Joueur / admin / observer |
| RoomMovementIntent | WS/Colyseus | Joueur |
| LiveStateView | WS push | Selon `audience` |
| MiniGameCommand (typé) | WS ou Round.Submit | Joueur |

## 6. RoundService (`round/v1`) — 10 méthodes

| Méthode | Transport | Audience |
|---|---|---|
| ConfigureRound … GetRoundState | ConnectRPC | Admin / joueur selon méthode |
| SubmitPlayerCommand | ConnectRPC ou WS | Joueur — payload typé ou TypedBytesEnvelope |

## 7. MiniGameService (`minigame/v1`) — 2 méthodes

| Méthode | Transport | Audience |
|---|---|---|
| ListMiniGames | ConnectRPC | Public / admin |
| GetMiniGame | ConnectRPC | Public / admin |

Messages companion typés (pas de RPC) pour les six clés :

| Clé | Famille | Messages |
|---|---|---|
| `memory-sequence` | Solo | Config, PlayerCommand, Public/PrivateState, ServerEvent, ScoreEvidence |
| `pure-reaction-duel` | Duel | idem — horodatage serveur only |
| `trust-bridge` | Alliance | idem — choix partenaire privé jusqu'au reveal |
| `team-relay` | Équipe | idem — tour autorisé serveur |
| `danger-sweep` | Survie | idem — positions serveur |
| `silent-vote` | Rôle caché | idem — rôles jamais publics |

Politique opaque : `bytes` uniquement avec `schema_id` + `schema_version` + `payload_max_bytes` ≤ **4096**.

## 8. ScoringService (`scoring/v1`) — 4 méthodes

| Méthode | Transport | Audience | No-leak |
|---|---|---|---|
| ListProvisionalScores | ConnectRPC | Admin | Interdit joueur/observer |
| CorrectProvisionalScore | ConnectRPC | Admin | |
| PublishResults | ConnectRPC | Admin | Explicit |
| GetPublishedResults | ConnectRPC | Joueur / observer / admin | Après publish |

## 9. AdminService (`admin/v1`) — 4 méthodes

| Méthode | Transport | Audience |
|---|---|---|
| GetGameState | ConnectRPC | Admin |
| GetReadonlySnapshot | ConnectRPC | Observer / support |
| ListParties | ConnectRPC | Admin |
| GetSystemReadiness | ConnectRPC | Admin / ops |

## 10. NotificationService (`notification/v1`) — 4 méthodes

| Méthode | Transport | Audience |
|---|---|---|
| SendNotification | ConnectRPC | Admin / system |
| GetNotificationStatus | ConnectRPC | Admin / system / joueur (own) |
| ListNotifications | ConnectRPC | Joueur (own) |
| AcknowledgeNotification | ConnectRPC | Joueur (own) |

## 11. PaymentService (`payment/v1`) — 8 méthodes

| Méthode | Transport | Audience |
|---|---|---|
| ProcessPayment | ConnectRPC | Joueur / system |
| InitiateTransfer | ConnectRPC | Finance / system |
| GetWallet | ConnectRPC | Joueur (own) / finance |
| GetPaymentHistory | ConnectRPC | Joueur (own) / finance |
| GetPaymentStatus | ConnectRPC | Joueur (own) / finance |
| IngestProviderWebhookEvent | ConnectRPC | Système (post-adapter REST) |
| ReconcilePayment | ConnectRPC | Finance / system |
| ListWebhookInbox | ConnectRPC | Finance / admin |

Statuts **internes** (`PaymentInternalStatus`) distincts des statuts **wire Fapshi** (`FapshiWireStatus` : CREATED/PENDING/SUCCESSFUL/FAILED/EXPIRED).  
Aucun champ credential provider (headers) dans les messages clients.

Webhook HTTP brut : **EX-REST-005** → adaptateur → `IngestProviderWebhookEvent`.

## 12. ComplianceService (`compliance/v1`) — 9 méthodes

| Méthode | Transport | Audience |
|---|---|---|
| ListComplianceGates | ConnectRPC | Admin |
| DecideComplianceGate | ConnectRPC | Admin |
| OpenIncident | ConnectRPC | Support / admin |
| ListAuditEvents | ConnectRPC | Admin / support |
| RecordAntiCheatEvent | ConnectRPC | System |
| ListRiskSignals | ConnectRPC | Admin / support |
| RequestDataExport | ConnectRPC | Support / admin |
| GetRetentionPolicy | ConnectRPC | Admin |
| ListSupportCases | ConnectRPC | Support |

---

## Totaux freeze P-SEQ-02

| Métrique | Valeur |
|---|---|
| Services RPC | 12 |
| Méthodes RPC | 65 (57 SEQ-01 + 8 production) |
| Packages proto racines | 13 (`common` sans service) |
| Jeux production typés | 6 |
| Payload gameplay max | 4096 octets |
| Connect enregistrés runtime | Hors scope (montage = lots suivants) |

### Méthodes historiques non montées (runtime)

Les 18 RPC non montés au moment de l'audit production restent dans ce freeze (MiniGame, Admin, Notification, Compliance + méthodes partielles). Les lots WAVE-A/B les consomment **sans modifier** les protos.

## Interdictions post-freeze

- Les lots métier ne régénèrent pas et ne modifient pas `packages/contracts/proto/**`.
- Aucun endpoint Hono nouveau sans message `.proto` ou exception dans `rest-exceptions.md`.
- ConnectRPC ne remplace pas Colyseus pour le live bidirectionnel.
- Tout besoin post-freeze revient à cette fiche : modification compatible, nouveau hash de descripteurs, golden/breaking, revalidation des lots descendants.
