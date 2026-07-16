# Matrice services / transports / audiences (SEQ-01 freeze)

**Date de figement :** 2026-07-16
**Branche :** `v0.1`
**Propriétaire :** `packages/contracts` (SEQ-01)
**Version contrats :** `v0.1`

Cette matrice est la baseline que les lots métier consomment sans la modifier.
Les comptes gap analysis (11 services / 50 méthodes) décrivaient l'état pré-SEQ-01.
Après freeze SEQ-01 : **12 services / 57 méthodes RPC** + messages live hors RPC.

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
| Système | `AUDIENCE_SYSTEM` | Workers, anti-cheat record, jobs |

---

## 1. IdentityService (`identity/v1`) — 8 méthodes

| Méthode | Transport cible | Audience | Notes |
|---|---|---|---|
| Register | ConnectRPC | Public → joueur | Cookie session opaque côté runtime |
| Login | ConnectRPC | Public → joueur | |
| Logout | ConnectRPC | Joueur | |
| Authenticate | ConnectRPC | Système/edge | Validation token session |
| GetCurrentUser | ConnectRPC | Joueur+ | |
| RevokeSession | ConnectRPC | Joueur / admin | |
| RequestPasswordReset | ConnectRPC | Public | Réponse identique si email inconnu |
| ResetPassword | ConnectRPC | Public (token) | Invalide sessions ; `INVALID_RESET_TOKEN` |

REST parallèle : `/v1/auth/*`, `/v1/me` — exception datee.

## 2. SessionService (`session/v1`) — 4 méthodes

| Méthode | Transport cible | Audience |
|---|---|---|
| CreateParty | ConnectRPC | Admin |
| ScheduleParty | ConnectRPC | Admin |
| GetParty | ConnectRPC | Public (filtre) / admin |
| ListParties | ConnectRPC | Public / admin |

## 3. ParticipationService (`participation/v1`) — 3 méthodes

| Méthode | Transport cible | Audience |
|---|---|---|
| AttachParticipation | ConnectRPC | Joueur |
| GetParticipation | ConnectRPC | Joueur (self) / admin |
| ListParticipations | ConnectRPC | Admin |

## 4. PreparationService (`preparation/v1`) — 5 méthodes

| Méthode | Transport cible | Audience |
|---|---|---|
| OpenPreparation | ConnectRPC | Admin |
| MarkReady | ConnectRPC | Joueur |
| SendAnnouncement | ConnectRPC | Admin |
| ConfirmStart | ConnectRPC | Admin |
| GetPreparationState | ConnectRPC | Joueur / admin |

## 5. RealtimeAccessService (`realtime/v1`) — 4 méthodes Connect

| Méthode | Transport cible | Audience |
|---|---|---|
| CreateLiveAccess | ConnectRPC (cible) | Joueur / admin / observer autorisé |
| GetPlayerState | ConnectRPC | Joueur (self) / admin |
| GetAdminGameSnapshot | ConnectRPC | Admin |
| GetReadonlySnapshot | ConnectRPC | Observer / support lecture |

### Messages live hors RPC (WebSocket/Colyseus)

| Message | Transport | Audience |
|---|---|---|
| JoinLive | WS/Colyseus | Joueur / admin / observer |
| ReconnectLive | WS/Colyseus | Idem ; erreur `RECONNECT_EXPIRED` |
| RoomMovementIntent | WS/Colyseus | Joueur |
| LiveStateView | WS push | Selon champ `audience` |
| LiveCommandRejected | WS push | Émetteur |
| Connected/Disconnected/ReconnectedEvent | WS push | Admin / system |
| MiniGameCommand (payload) | WS ou Round.Submit | Joueur |

## 6. RoundService (`round/v1`) — 10 méthodes

| Méthode | Transport cible | Audience |
|---|---|---|
| ConfigureRound | ConnectRPC | Admin |
| StartRound | ConnectRPC | Admin |
| StartRoundBriefing | ConnectRPC | Admin |
| ActivateRound | ConnectRPC | Admin |
| PauseRound | ConnectRPC | Admin |
| ResumeRound | ConnectRPC | Admin |
| SubmitPlayerCommand | ConnectRPC ou WS | Joueur |
| CloseRound | ConnectRPC | Admin |
| PlayerFinishedRound | ConnectRPC | Joueur |
| GetRoundState | ConnectRPC | Joueur filtré / admin |

## 7. MiniGameService (`minigame/v1`) — 2 méthodes

| Méthode | Transport cible | Audience |
|---|---|---|
| ListMiniGames | ConnectRPC | Public / admin |
| GetMiniGame | ConnectRPC | Public / admin |

Messages companion (pas de RPC) : `MiniGameCommand`, `MiniGamePublicState`,
`MiniGamePrivateState`, `MiniGameServerEvent`, `MiniGameScoreEvidence`.

## 8. ScoringService (`scoring/v1`) — 4 méthodes

| Méthode | Transport cible | Audience | No-leak |
|---|---|---|---|
| ListProvisionalScores | ConnectRPC | Admin (review) | Interdit joueur/observer |
| CorrectProvisionalScore | ConnectRPC | Admin | Raison obligatoire |
| PublishResults | ConnectRPC | Admin | Explicit publish |
| GetPublishedResults | ConnectRPC | Joueur / observer / admin | Après publication seulement |

Message `ScoreWaitingReviewView` : joueur en attente sans scores provisoires.

## 9. AdminService (`admin/v1`) — 3 méthodes

| Méthode | Transport cible | Audience |
|---|---|---|
| GetGameState | ConnectRPC | Admin |
| GetReadonlySnapshot | ConnectRPC | Observer / support |
| ListParties | ConnectRPC | Admin |

## 10. NotificationService (`notification/v1`) — 4 méthodes

| Méthode | Transport cible | Audience |
|---|---|---|
| SendNotification | ConnectRPC | Admin / system (job) |
| GetNotificationStatus | ConnectRPC | Admin / system / joueur (own) |
| ListNotifications | ConnectRPC | Joueur (own) |
| AcknowledgeNotification | ConnectRPC | Joueur (own) |

Ne démarre pas une partie. Ne publie pas de score.

## 11. PaymentService (`payment/v1`) — 4 méthodes

| Méthode | Transport cible | Audience |
|---|---|---|
| ProcessPayment | ConnectRPC | Joueur / system |
| InitiateTransfer | ConnectRPC | Finance / system |
| GetWallet | ConnectRPC | Joueur (own) / finance |
| GetPaymentHistory | ConnectRPC | Joueur (own) / finance |

Webhook provider : REST exception permanente (contrainte externe).

## 12. ComplianceService (`compliance/v1`) — 6 méthodes (SEQ-01 + sprint 18)

| Méthode | Transport cible | Audience |
|---|---|---|
| ListComplianceGates | ConnectRPC | Admin |
| DecideComplianceGate | ConnectRPC | Admin | Raison ; `AUDIT_REASON_REQUIRED` / `WAIVER_FORBIDDEN` |
| OpenIncident | ConnectRPC | Support / admin | Sans commandes round/publish |
| ListAuditEvents | ConnectRPC | Admin / support | |
| RecordAntiCheatEvent | ConnectRPC | System | Redaction obligatoire |
| ListRiskSignals | ConnectRPC | Admin / support | |

---

## Totaux freeze SEQ-01

| Métrique | Valeur |
|---|---|
| Services RPC | 12 |
| Méthodes RPC | 57 (50 historiques + AcknowledgeNotification + 6 compliance) |
| Packages proto | 13 racines (`common` sans service) |
| Connect enregistrés runtime | Hors scope SEQ-01 (3/12 à date API) |

## Interdictions post-freeze

- Les lots métier ne régénèrent pas et ne modifient pas `packages/contracts/proto/**`.
- Aucun endpoint Hono nouveau sans message `.proto` ou exception dans `rest-exceptions.md`.
- ConnectRPC ne remplace pas Colyseus pour le live bidirectionnel.
