# Analyse du flux de connexion live actuel

> Généré le 2026-07-09 via explore-codebase

## Constat : le flow est en 3 phases lourdes côté client

### Phase 1 — Join token (API → API)

```
Client → GET /api/v1/sessions/:id/join-token
         → lobby.ts: issueJoinToken
            → Crée JoinToken (SHA-256, TTL 60s)
            → AuditLog
         ← { joinToken: { token } }
```

### Phase 2 — Réservation (API → API → DB)

```
Client → POST /api/v1/live/sessions/:id/reservation
         → live.ts: createLiveReservation
            → Transaction Serializable #1 :
               - Consume JoinToken
               - Registration → IN_ROOM
               - Upsert LiveSessionState (BRIEFING)
               - Crée LiveReservation (TTL 60s)
               - AuditLog
            ← { reservation: { token }, websocket }
```

### Phase 3 — Colyseus (WebSocket → DB → DB)

```
Client → client.joinOrCreate("game_session", { sessionId, reservationToken })
         → GameSessionRoom.onAuth
            → Transaction Serializable #2 (consumeLiveReservation) :
               - Find LiveReservation
               - Verify session LIVE
               - Consume reservation
               - Upsert PlayerConnection (CONNECTED)
               - Upsert LiveSessionState (roomId)
               - AuditLog
         ← client.auth = { userId, registrationId }

         → GameSessionRoom.onCreate
            → loadInitialLiveState :
               - Find session (LIVE)
               - Find all CHECKED_IN / IN_ROOM registrations
               - Upsert LiveSessionState

         → GameSessionRoom.onJoin
            → send("joined")
            → send("round.game") si round en cours
```

## Problèmes identifiés

### 1. Lourdeur d'initialisation (le coeur du problème)

- **3 endpoints HTTP** avant d'arriver au WebSocket (join-token → reservation → WS)
- **2 transactions Serializable** couteuses (réservation dans l'API + consume dans onAuth)
- Chaque transaction crée/modifie 5+ lignes DB (reservation, registration, playerConnection, liveSessionState, auditLog)
- `join-token` + `reservation` = tokens éphémères (TTL 60s chacun) qui s'empilent

### 2. Write conflict en reconnexion

Le `playerConnection.upsert` dans la transaction Serializable #2 lève P2034 quand 2 clients connectent en rafale (même session, même userId). Le retry (ajouté au commit précédent) masque le symptôme mais pas la cause.

### 3. Double redondance API → Colyseus

L'API `createLiveReservation` modifie déjà `registration → IN_ROOM` et `liveSessionState → BRIEFING`. Puis le `consumeLiveReservation` dans `onAuth` refait un upsert PlayerConnection + LiveSessionState. Il y a un split de responsabilité entre l'API REST et le game-server qui force deux transactions sur les mêmes données.

## Ce que serait un flow "Fortnite-style"

```
Client → WebSocket direct (auth par sessionId + userId)
         → onAuth :
            - Vérifie registration CHECKED_IN
            - Vérifie session LIVE
            - Insert PlayerConnection
         → onJoin :
            - Envoie le state initial
            - ready to play
```

### Ce qui disparaît

- Supprimer `join-token` (API endpoint + JoinToken model)
- Supprimer `reservation` (API endpoint + LiveReservation model + DB queries)
- Supprimer la double transaction REST
- Supprimer les tokens éphémères et leur gestion d'expiration

### Ce qui reste

- `onAuth` fait la vérification DB minimale (registration + session status)
- `onCreate` charge les joueurs CHECKED_IN/IN_ROOM (exactement comme maintenant)
- `Registration → IN_ROOM` se fait dans onAuth (pas dans l'API REST)
- La sécurité repose sur la session HTTP (cookie) pour obtenir le WebSocket, puis l'auth Colyseus vérifie en DB

### Risques et garde-fous

- **CSRF WebSocket** : Colyseus ne fait pas de handshake HTTP. La solution : passer un court token d'accès (JWT ou nonce stocké en Redis, TTL 30s) dans les options de `joinOrCreate`, validé dans `onAuth` sans transaction lourde.
- **Race condition à l'insertion** : remplacer l'upsert Serializable par un `create` + catch unique contrainte → fallback update (pas de transaction du tout).
- **Reconnexion** : garder `PlayerConnection` et `allowReconnection` — inchangé.

## Actions recommandées

1. Supprimer `JoinToken` (modèle, endpoints, service)
2. Supprimer `LiveReservation` (modèle, endpoints, service)
3. Supprimer `/join-token` et `/reservation` de l'API
4. Simplifier `useGameRoom.ts` : plus qu'un fetch pour récupérer le endpoint WS + un short token
5. Simplifier `onAuth` : vérifier registration + token court, upsert PlayerConnection
6. Supprimer les transactions Serializable dans le flow de connexion
7. Garder le reste (rounds, deadlines, actions, anti-cheat) inchangé
