# Systeme courant observe dans HEAD

## Resume

Le `HEAD` legacy n'etait pas vide et n'etait pas un simple prototype.
Il contenait une plateforme complete en intention : auth, paiements, wallet, sessions, live Colyseus,
mini-jeux, resultats, notifications, audit, support, compliance et admin.

Le probleme principal n'etait pas le manque d'ambition.
Le probleme principal etait l'empilement de fonctionnalites sans modele produit stable.

## Pourquoi les parcours admin et joueur ont ete melanges

### 1. Le mot "session" a absorbe trop de concepts

Preuves :

- `GameSession` dans `packages/db/prisma/schema.prisma`.
- `SessionRegistration` dans `schema.prisma`.
- routes web `/session/[code]/lobby`, `/session/[code]/live`, `/session/[code]/results`.
- routes admin `/admin/sessions/[id]`, `/admin/sessions/[id]/live`.

Concepts melanges :

- partie planifiee ;
- inscription ;
- participation ;
- lobby ;
- room Colyseus ;
- manche active ;
- resultat.

Consequence :

- Le joueur et l'admin manipulent le meme vocabulaire "live" alors qu'ils n'ont pas le meme objectif.

### 2. `/live` est devenu un conteneur universel

Preuves :

- `apps/web/src/app/(arena)/session/[code]/live/page.tsx`.
- `apps/web/src/components/live/LiveRoomShell.tsx`.
- `apps/web/src/hooks/useGameRoom.ts`.
- `apps/game-server/src/rooms/GameSessionRoom.ts`.

Responsabilites absorbees par `/live` :

- chargement serveur ;
- briefing ;
- mini-jeu actif ;
- attente fin de manche ;
- spectateur/elimine ;
- carte sociale ;
- chat ;
- groupes ;
- pings ;
- resultats de round ;
- session completed.

Symptome visible :

- L'ecran "EN ATTENTE DU SERVEUR..." apparait quand l'etat Colyseus ou `round.game` ne permet pas a l'UI
  de savoir si le joueur attend le debut, la verification, une reconnexion, un mini-jeu ou les resultats.

### 3. La room Colyseus fait trop de choses

Preuve : `apps/game-server/src/rooms/GameSessionRoom.ts` (993 lignes).

La room gere :

- auth par reservation ;
- chargement joueurs ;
- state live ;
- reconnexion ;
- briefing ;
- debut et fin de round ;
- diffusion resultats ;
- chat ;
- groupes sociaux ;
- invitations ;
- pings ;
- roles caches ;
- messages specifiques mini-jeux.

Consequence :

- Chaque nouveau besoin live modifie le meme fichier.
- La supervision admin et l'experience joueur dependent des memes broadcasts.
- Les regles produit se retrouvent dans les callbacks de transport.

### 4. Les contrats sont disperses

Sources concurrentes :

- Prisma schema : `packages/db/prisma/schema.prisma`.
- Zod schemas : `apps/api/src/**`.
- Types React/hook : `apps/web/src/hooks/useGameRoom.ts`, `apps/web/src/services/*`.
- Colyseus schema : `apps/game-server/src/rooms/schema/LiveState.ts`.
- JSON configs mini-jeux : `apps/api/src/minigames/catalogue.ts`.

Consequence :

- Drift entre API et UI.
- Types dupliques.
- Statuts affiches bruts.
- Erreurs non traduites.

## Parcours HEAD reels

### Parcours joueur legacy

1. Voir catalogue/session publique.
2. S'inscrire.
3. Payer par provider ou wallet.
4. Entrer lobby.
5. Check-in.
6. Obtenir join-token.
7. Creer reservation live.
8. Joindre Colyseus.
9. Recevoir `round.game` et jouer.
10. Recevoir `round.resolved` ou `session.completed`.

Preuves :

- `docs/audit-ui-api-trace.md`.
- `docs/analysis-live-connection-flow.md`.
- `apps/api/src/lobby/lobby.ts`.
- `apps/api/src/live/live.ts`.
- `apps/web/src/hooks/useGameRoom.ts`.

### Parcours admin legacy

1. Creer session.
2. Publier/open registration.
3. Simuler finances.
4. Lancer session/live.
5. Superviser live.
6. Pause/resume/force close.
7. Consulter/corriger resultats.
8. Publier resultats.
9. Traiter support/audit/incidents.

Preuves :

- `apps/api/src/routes/admin/sessions.ts`.
- `apps/api/src/routes/admin/live.ts`.
- `apps/api/src/routes/admin/results.ts`.
- `apps/api/src/admin/operations.ts`.
- `docs/admin-arbitrage/*`.

Probleme :

- L'admin supervise plusieurs choses depuis des routes et composants separes, sans un modele unique de
  "command center".

## Flux live legacy detaille

Preuve : `docs/analysis-live-connection-flow.md`.

```text
Client -> GET join-token
Client -> POST live reservation
Client -> Colyseus joinOrCreate(game_session)
Room.onAuth -> consumeLiveReservation
Room.onCreate -> loadInitialLiveState
Room.onJoin -> joined + round.game
```

Problemes :

- 3 etapes avant WebSocket.
- 2 transactions Serializable.
- `JoinToken` et `LiveReservation` a TTL 60s.
- `PlayerConnection` upsert sous contention.
- REST et Colyseus modifient le meme etat live.

## Points solides a conserver

- Auth cookie opaque avec `__Host-session` par defaut secure.
- AuditLog omnipresent.
- Concept de compliance gates.
- Jobs BullMQ pour traitements asynchrones.
- Colyseus comme runtime temps reel autoritaire.
- Prisma/PostgreSQL comme persistence durable.
- Notion d'anti-cheat par nonce, deadlines et server timers.
- Documents admin-arbitrage plus riches que l'implementation finale.

## Points a ne pas reconduire tels quels

- `GameSessionRoom.ts` monolithique.
- `sessionStore.ts` monolithique.
- `/live` comme surface universelle.
- `SessionRegistration` comme substitut a participation complete.
- `round.resolved` visible joueur sans publication explicite.
- Definitions mini-jeux JSON/Zod comme source de verite long terme.
- Duplication des types entre frontend, shared, DB et API.
- Workflow join-token/reservation trop lourd.

## Conclusion

Le systeme doit etre reconstruit comme une plateforme de competition temps reel :

- produit d'abord : partie, participation, lobby, round, mini-jeu, verification, publication ;
- contrats ensuite : commands, queries, events, errors ;
- transports ensuite : HTTP/Connect et WebSocket/Colyseus ;
- UI enfin : parcours admin, joueur, observateur.

L'ordre inverse a cause le melange observe dans le `HEAD`.
