# Feature 20 - UI lobby et client live Colyseus

## Objectif sprint

Livrer le lobby, le check-in, la connexion room Colyseus, les phases live, les timers et la reconnexion.

## Dependances

- Feature 18.
- Feature 19.

## Gate documentaire obligatoire

1. Context7 `colyseus.js` client : reservation, `joinOrCreate`, `onStateChange`, `onMessage`, reconnexion.
2. Verifier React 19 / Next 16 client components et cleanup StrictMode.

## User stories

### Story 20.1 - Lobby

Creer `/session/[code]/lobby`, afficher regles, countdown serveur, check-in idempotent, gestion non PAID.

### Story 20.2 - Connexion live

Creer hook `useGameRoom`, consommer reservation API, rejoindre room, synchroniser state, messages, reconnect token et fallback state API.

### Story 20.3 - Ecrans de phase

Afficher BRIEFING, ROUND_ACTIVE, RESOLVING, RESULTS, PAUSED avec transitions Motion et timer base sur `deadlineEpochMs`.

## Definition of Done

Smoke test 2 navigateurs : lobby -> check-in -> live -> round -> resolution visible, reconnexion testee.
