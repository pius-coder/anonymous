# Erreurs et dettes confirmees dans HEAD

## 1. Ecran joueur "EN ATTENTE DU SERVEUR..."

Symptome :

- La surface mini-jeu affiche `EN ATTENTE DU SERVEUR...`.

Preuves HEAD :

- `apps/web/src/app/(arena)/session/[code]/live/page.tsx`.
- `apps/web/src/components/live/LiveRoomShell.tsx`.
- `apps/web/src/hooks/useGameRoom.ts`.
- `apps/game-server/src/rooms/GameSessionRoom.ts`.

Cause :

- `/live` derive l'interface de messages Colyseus opportunistes (`round.game`, `sequence.show`, `signal`,
  `zones.round`) au lieu d'un etat produit explicite.
- Si le joueur a termine, si le round est en verification, si le serveur n'a pas pousse le message attendu
  ou si le mini-jeu courant n'a pas de composant reconnu, le meme fallback vague apparait.

Decision cible :

- Remplacer par des etats : `ROUND_FINISHED_WAITING_REVIEW`, `WAITING_RESULTS_PUBLICATION`,
  `RECONNECTING`, `WAITING_NEXT_ROUND`, `LIVE_STREAM_UNAVAILABLE`.

## 2. Publication publique bloquee

Preuve :

- `HEAD:docs/audit-rapport-incoherences.md`.
- `apps/api/src/security/security.ts`.
- `apps/api/src/routes/admin/sessions.ts`.

Cause :

- Compliance gates initialisees `BLOCKED`.
- Workflow admin de deblocage incomplet dans le legacy.

Decision cible :

- Garder compliance gates, mais reconstruire le workflow validation/audit.

## 3. Donnees admin perdues/hardcodees

Preuve :

- `HEAD:docs/audit-rapport-incoherences.md`.
- Route detail admin session.

Exemples :

- `durationMs` retourne 0.
- `policy` retourne null.

Decision cible :

- Read models admin explicites et testes.

## 4. Paiements wallet invisibles dans admin payments

Preuve :

- `apps/api/src/wallet/wallet.ts`.
- `apps/api/src/routes/admin/payments.ts`.
- `HEAD:docs/audit-rapport-incoherences.md`.

Cause :

- Le paiement wallet peut modifier l'inscription et le ledger sans creer une `PaymentTransaction` uniforme.

Decision cible :

- Toute transaction financiere doit produire une trace queryable et auditable.

## 5. Statuts affiches bruts ou corrompus

Preuve :

- `HEAD:docs/audit-rapport-incoherences.md`.
- Pages admin session detail et helpers de formatage incomplets.

Cause :

- Statuts non centralises.
- Types frontend et enums DB dupliques ou non relies.

Decision cible :

- Source de verite de statuts par contrats et helpers de projection UI.

## 6. Compteurs incoherents

Preuve :

- `apps/api/src/admin/operations.ts`.
- `apps/api/src/routes/admin/sessions.ts`.
- `HEAD:docs/audit-rapport-incoherences.md`.

Cause :

- Les pages users et sessions ne comptent pas les memes statuts d'inscription.

Decision cible :

- Definir des groupes de statuts par cas d'usage et les tester.

## 7. Flux live trop lourd et sujet aux conflits

Preuve :

- `HEAD:docs/analysis-live-connection-flow.md`.
- `apps/api/src/lobby/lobby.ts`.
- `apps/api/src/live/live.ts`.
- `apps/game-server/src/live/sessionStore.ts`.

Cause :

- Join token + reservation + Colyseus auth.
- Deux transactions Serializable.
- Upsert de connexion sous contention.

Decision cible :

- Handshake live court, idempotent, source de verite unique.

## 8. Diffusion des resultats avant publication produit claire

Preuve :

- `GameSessionRoom.handleRoundResolved`.
- `apps/api/src/rounds/roundResolution.ts`.
- `apps/api/src/results/results.ts`.

Cause :

- `round.resolved` et publication produit ne sont pas assez separes dans les parcours.

Decision cible :

- Score provisoire visible admin.
- Score publie visible joueur uniquement apres action admin.

## Non-corrections pendant cette mission

Aucune correction metier n'a ete appliquee :

- aucun endpoint ;
- aucun message Colyseus ;
- aucun mapping mini-jeu ;
- aucune state machine runtime ;
- aucun style UI ;
- aucune migration DB metier ;
- aucun client Protobuf genere.

Cette mission produit l'analyse et les fondations documentaires pour reconstruire proprement.
