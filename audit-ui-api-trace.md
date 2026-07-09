# Audit UI API DB - Traçabilité parcours

Date: 2026-07-09

## Décision source de vérité

- Les routes publiques client utilisent le `code` de session dans l'URL.
- L'API player-facing doit résoudre `code` ou `id` vers l'id DB avant d'appeler les services métier.
- Les routes admin et internes restent pilotées par id DB.

## Ruptures confirmées

| Parcours | Symptôme | Cause | Correction attendue |
|---|---|---|---|
| `/session/NIGHT-DROP-001/lobby` | `NOT_PAID` alors que `player@session-jeu.com` est `PAID` | UI envoie le code, API cherchait `sessionId = code` | Résolution `code/id` côté API lobby |
| `/session/NIGHT-DROP-001/live` | `NOT_CHECKED_IN` brut | Erreur non traduite côté live | `translateError(errorCode)` |
| Détail session | CTA reste `S'inscrire` pour un joueur déjà inscrit | Page publique ne tient pas compte de l'inscription utilisateur | CTA charge `/sessions/:id/registration` |
| Paiement annulé | Bouton appelait un `GET` inexistant | API expose `POST /registrations/:id/cancel` | Bouton utilise `apiPost` + body reason |
| Seed `NIGHT-DROP-001` | Statut `PAID` sans paiement/ledger | Seed écrivait le statut seul | Paiement + ledger + audit seedés |
| Seed `RECETTE-LIVE-6` | Paiements sans ledger | Paiement seed isolé | Paiement + ledger + audit seedés |
| Statuts payés | Admin/résultats/capacité comptaient seulement `PAID` | `CHECKED_IN` et `IN_ROOM` exclus selon les modules | Groupes centralisés `CAPACITY_REGISTRATION_STATUSES` et `PAID_ACCESS_REGISTRATION_STATUSES` |
| Catalogue live | Filtre live pointait sur `ACTIVE` | Une session ouverte apparaissait comme live | `filter=live` pointe sur `LIVE`; `open` reste `PUBLISHED/ACTIVE` |
| Historique joueur | `ACTIVE/WAITING_START` classés en live | Bouton live possible trop tôt | Seul `LIVE` est classé `live` |
| Token live | `IN_ROOM` ne pouvait pas redemander un token | Reconnexion impossible après entrée live | Token/réservation acceptent `CHECKED_IN` et `IN_ROOM` |
| Token avant live | Join-token émis avant `LIVE` | Token OK puis réservation refusée | `join-token` retourne `SESSION_NOT_LIVE` avant le live |
| Presence lobby | UI lisait `paid/checkedIn`, API renvoyait seulement `count` | Compteurs lobby vides ou incohérents | API renvoie `paid`, `checkedIn`, `inRoom` |
| Retour Fapshi | URL retour peut contenir `registrationId` | `/payments/:id/status` pouvait 404 | Statut paiement résout `payment.id OR registrationId` |
| E2E CTA | Test attendait un lien auth obsolète | Faux négatif navigateur | E2E vérifie le bouton et le drawer actuel |

## Traçage bouton/API/DB

| UI | Bouton | API | Succès | Erreurs attendues | DB touchée |
|---|---|---|---|---|---|
| Session détail | S'inscrire | `POST /sessions/:id/register` | `SessionRegistration CREATED/PAYMENT_PENDING` | `ALREADY_REGISTERED`, `SESSION_FULL`, `REGISTRATION_CLOSED` | `SessionRegistration`, `AuditLog` |
| Session détail | Payer | `POST /registrations/:id/pay-with-wallet` ou `POST /payments/fapshi/initiate` | `PAID` ou checkout URL | `INSUFFICIENT_FUNDS`, `PROVIDER_UNAVAILABLE`, `REGISTRATION_EXPIRED` | `Wallet`, `LedgerEntry`, `PaymentTransaction`, `SessionRegistration` |
| Session détail | Lobby | `GET /sessions/:code/lobby` | lobby chargé | `NOT_PAID`, `SESSION_CANCELLED` | `LobbyPresence`, `AuditLog` |
| Lobby | Check-in | `POST /sessions/:code/check-in` | `CHECKED_IN` | `NOT_PAID`, `CHECKIN_CLOSED` | `SessionRegistration`, `AuditLog`, notifications |
| Live | Entrer live | `GET /sessions/:code/join-token` puis `POST /live/sessions/:code/reservation` | Colyseus reservation | `NOT_CHECKED_IN`, `SESSION_NOT_LIVE`, token errors | `JoinToken`, `LiveReservation`, `SessionRegistration`, `AuditLog` |
| Mini-jeu live | Action joueur | Colyseus `action` | `PlayerAction` accepté | duplicate, late, eliminated | `PlayerAction`, `AntiCheatEvent` |
| Paiement status | Annuler | `POST /registrations/:id/cancel` | `CANCELLED` | `REGISTRATION_ALREADY_PAID`, `REGISTRATION_NOT_CANCELLABLE` | `SessionRegistration`, `AuditLog` |
| Admin session | Publier | `POST /admin/sessions/:id/publish` | `PUBLISHED` | `403_COMPLIANCE_GATE_BLOCKED`, config conflict | `GameSession`, `AuditLog` |
| Admin session | Démarrer | `POST /admin/sessions/:id/start` | `LIVE` | `MIN_PLAYERS_NOT_REACHED`, `SESSION_NOT_STARTABLE` | `GameSession`, `LiveSessionState`, `AuditLog` |
| Admin live | Pause/Reprendre | `/admin/live/:id/pause`, `/resume` | phase live modifiée | `SESSION_NOT_LIVE`, validation reason | `LiveSessionState`, `AuditLog` |
| Admin payment | Reconcile | `POST /admin/payments/:id/reconcile` | paiement synchronisé | RBAC, payment not found | `PaymentTransaction`, `AuditLog` |
| Admin wallet | Ajuster | `POST /admin/wallets/:id/adjust` | ledger créé | RBAC, wallet frozen, invalid amount | `Wallet`, `LedgerEntry`, `AuditLog` |
| Admin mini-jeux | Activer/Désactiver | `POST /admin/minigames/:id/enable` | definition modifiée | RBAC, not found | `MiniGameDefinition`, `AuditLog` |

## Critères de recette

- `player@session-jeu.com` voit `Lobby` sur `NIGHT-DROP-001`, pas `S'inscrire`.
- `/session/NIGHT-DROP-001/lobby` retourne le lobby pour le joueur payé.
- Le bouton check-in transforme `PAID` en `CHECKED_IN`.
- Le live direct sans check-in affiche un message traduit, pas `NOT_CHECKED_IN`.
- `RECETTE-LIVE-6` expose les 6 jeux seedés et traçables.
- La commande seed échoue si une inscription payée n'a pas de paiement ou si un paiement seed n'a pas de ledger.
