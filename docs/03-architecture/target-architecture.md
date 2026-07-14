# Architecture cible v0.1

## Position

La cible n'est pas un MVP minimaliste.
La cible est une reconstruction progressive d'un produit multijoueur ambitieux, mais avec des
frontieres explicites et testables.

Le `HEAD` legacy prouve que le produit visait deja :

- acquisition publique ;
- auth et profil joueur ;
- paiement et wallet ;
- lobby/check-in ;
- live temps reel ;
- mini-jeux configurables ;
- resultats et gains ;
- dashboard admin, audit et support ;
- notifications ;
- securite et anti-triche.

La refonte doit donc conserver l'ambition, mais retirer les melanges de responsabilites.

## Runtimes conserves

| Runtime | Decision | Raison |
|---|---|---|
| Next.js web | KEEP | App Router adapte aux parcours web/admin/joueur |
| Hono API | KEEP | API TypeScript legere, sous-routeurs et middleware typables |
| Colyseus | KEEP | Serveur autoritaire multijoueur deja present |
| Prisma/PostgreSQL | KEEP | Modele relationnel necessaire aux paiements, scores, audit |
| BullMQ/Redis | KEEP | Jobs idempotents, rappels, deadlines, reconciliation |
| Pixi.js | KEEP optional | Surface canvas pour jeux 2D, a utiliser seulement par runtime le justifiant |

## Principe directeur

Chaque couche doit repondre a une seule question :

- UI : que voit et fait l'utilisateur maintenant ?
- Application : quelle action est autorisee ?
- Domaine : quelle transition est valide ?
- Contrats : quel message traverse le reseau ?
- Realtime : quel etat live autoritaire est diffuse ?
- Persistence : quelles donnees durables sont enregistrees ?
- Observability : comment prouver ce qui s'est passe ?

## Domaines fonctionnels

### Identity and Access

Responsabilites :

- utilisateur ;
- session auth ;
- roles et permissions ;
- revocation ;
- rate limit auth ;
- security logs.

Source HEAD :

- `apps/api/src/auth/session.ts`
- `apps/api/src/routes/auth.ts`
- `packages/db/prisma/schema.prisma` : `User`, `AuthSession`, `PasswordResetToken`, `RoleAssignment`.

Decision :

- Conserver l'approche cookie opaque comme base technique possible.
- Ne pas choisir OAuth/JWT/fournisseur externe sans decision explicite.

### Game Planning

Responsabilites :

- creation d'une partie ;
- configuration ;
- horaire planifie ;
- visibilite ;
- programme de manches ;
- contraintes de publication.

Source HEAD :

- `apps/api/src/routes/admin/sessions.ts`
- `apps/api/src/admin/sessionConfig.ts`
- `packages/db/prisma/schema.prisma` : `GameSession`.

Regle :

- L'horaire planifie n'est jamais une transition automatique vers une manche active.

### Participation

Responsabilites :

- rattacher explicitement un joueur a une partie ;
- porter droits, etats de preparation, presence, connexion et statut de round ;
- distinguer joueur, observateur lecture seule et administrateur.

Source HEAD :

- `SessionRegistration`
- `PlayerConnection`
- `RoundParticipant`

Probleme HEAD :

- `SessionRegistration` porte trop de concepts : paiement, check-in, in-room.

Decision cible :

- Introduire ou formaliser `GameParticipation` comme pivot domaine.

### Preparation Lobby

Responsabilites :

- invites attendus ;
- hors ligne/connecte/present/pret/sans reponse ;
- annonces avant-match ;
- notifications associees ;
- confirmation de lancement admin si joueurs non prets.

Source HEAD :

- `apps/api/src/lobby/lobby.ts`
- `apps/web/src/components/lobby/LobbyPage.tsx`
- queues notification/check-in.

Regle :

- Les annonces de preparation ne sont pas affichees pendant la selection ou execution du mini-jeu.

### Realtime Game

Responsabilites :

- connexion temps reel ;
- state autoritaire ;
- commandes joueur ;
- evenements serveur ;
- reconnexion ;
- snapshots lecture seule ;
- fermeture de round.

Source HEAD :

- `apps/game-server/src/rooms/GameSessionRoom.ts`
- `apps/game-server/src/rooms/schema/LiveState.ts`
- `apps/game-server/src/live/sessionStore.ts`
- `apps/web/src/hooks/useGameRoom.ts`

Decision cible :

- Refaire la room en noyau mince.
- Deplacer chat/groupes/social/mini-jeux dans modules ou handlers separes.
- Contracter tous les messages.

### MiniGame Framework

Responsabilites :

- manifest de mini-jeu ;
- commandes autorisees ;
- state public/private ;
- validation commandes ;
- scoring provisoire ;
- anti-triche ;
- tests par runtime.

Source HEAD :

- 120 titres dans `docs/catalogue-mini-jeux.md`.
- 36 definitions dans `apps/api/src/minigames/catalogue.ts`.
- 3 runtimes dedies dans `packages/game-engine/src/runtimes`.
- 6 jeux recette dans `RECETTE_ROUND_KEYS`.

Decision cible :

- Ne pas implementer a partir du titre seul.
- Choisir un premier runtime et reconstruire son contrat complet.

### Scoring and Publication

Responsabilites :

- score provisoire ;
- evidence ;
- verification anomalies ;
- correction admin documentee ;
- publication explicite ;
- score visible joueur seulement apres publication.

Source HEAD :

- `apps/api/src/rounds/roundResolution.ts`
- `apps/api/src/results/results.ts`
- `RoundResult`, `RoundOutcome`, `ResolutionLog`, `GameResult`, `PrizeDistribution`.

Decision cible :

- Decoupler `ProvisionalScore` et `PublishedScore`.

### Admin Command Center

Responsabilites :

- vue globale partie ;
- vue participants ;
- progression live ;
- evenements importants ;
- incidents/anomalies ;
- verification/publication ;
- vue individuelle lecture seule.

Source HEAD :

- `apps/web/src/components/admin/*`
- `apps/api/src/admin/operations.ts`
- `docs/admin-arbitrage/*`

Decision cible :

- Conserver les exigences d'arbitrage Admin A/Admin B/Support comme source d'inspiration.
- Valider les roles exacts avant implementation.

### Notifications

Responsabilites :

- annonces ;
- rappels ;
- statuts de distribution ;
- preferences ;
- logs livraison.

Source HEAD :

- `apps/api/src/notifications/notifications.ts`
- `apps/worker/src/notifications.ts`
- `apps/whatsapp-gateway/src/index.ts`
- `NotificationJob`, `DeliveryLog`, `OutboundMessage`.

Decision cible :

- Notification ne demarre pas de partie et ne publie pas de score.

### Payments and Wallet

Responsabilites :

- paiement provider ;
- paiement wallet ;
- ledger ;
- reconciliation ;
- gains si applicable.

Source HEAD :

- `apps/api/src/payments/fapshi.ts`
- `apps/api/src/wallet/wallet.ts`
- `apps/worker/src/paymentReconciliation.ts`
- `PaymentTransaction`, `Wallet`, `LedgerEntry`.

Decision cible :

- Tout mouvement financier doit avoir une trace unifiee.

## Contrats reseau cible

Les contrats Protobuf ne doivent pas recopier les entites Prisma.

Organisation proposee :

```text
proto/session/v1/game.proto
proto/participation/v1/participation.proto
proto/preparation/v1/preparation.proto
proto/realtime/v1/events.proto
proto/minigame/v1/manifest.proto
proto/scoring/v1/scoring.proto
proto/admin/v1/admin.proto
proto/notification/v1/notification.proto
proto/common/v1/errors.proto
```

Transports :

- API navigateur : Connect ou HTTP compatible navigateur, a valider avec tooling.
- Temps reel : WebSocket/Colyseus pour events live et snapshots.
- Jobs internes : payloads versionnes, pas contrats UI.

## Arborescence cible proposee

```text
apps/
  web/
    src/app/
    src/features/
      player-session/
      admin-command-center/
      preparation-lobby/
      readonly-observer/
    src/shared-ui/
  api/
    src/modules/
      identity/
      game-planning/
      participation/
      preparation/
      scoring/
      notifications/
      payments/
      admin/
  game-server/
    src/rooms/
    src/modules/
      connection/
      round-runtime/
      readonly-stream/
      chat/
      social-groups/
  worker/
    src/jobs/
packages/
  contracts/
  game-domain/
  game-engine/
  db/
  shared/
  observability/
proto/
  common/v1/
  session/v1/
  participation/v1/
  realtime/v1/
  minigame/v1/
  scoring/v1/
  admin/v1/
```

Cette arborescence est une cible de migration, pas une obligation de tout creer maintenant.

## Regles d'import

Autorise :

- `apps/web` -> `packages/contracts`, `packages/shared`
- `apps/api` -> `packages/contracts`, `packages/game-domain`, `packages/db`, `packages/shared`
- `apps/game-server` -> `packages/contracts`, `packages/game-domain`, `packages/game-engine`, `packages/db`
- `apps/worker` -> `packages/game-domain`, `packages/db`, `packages/shared`

Interdit :

- `apps/web` -> `packages/db`
- `packages/game-domain` -> `apps/*`
- `packages/game-engine` -> `apps/*`, Prisma, Hono, Next, Colyseus
- routes API -> composants web
- Prisma models -> contrats reseau publics

## Migration depuis HEAD

1. Garder l'index `HEAD` et l'audit forensique comme reference.
2. Reintegrer un domaine a la fois, jamais un dossier entier.
3. Pour chaque domaine, extraire les regles depuis HEAD puis les reformuler en contrats et tests.
4. Remplacer les DTO JSON manuels par Protobuf avant nouveau endpoint public.
5. Rejouer les tests legacy utiles en les adaptant au nouveau domaine.
6. Supprimer definitivement le legacy seulement apres usage nul et validation.

## Acceptance gates d'architecture

Une tranche de reconstruction n'est acceptee que si :

- cas d'usage et acteur documentes ;
- contrat public documente ;
- modele de donnees ou absence de persistence justifie ;
- regles d'autorisation explicites ;
- tests unitaires domaine ;
- tests integration transport/persistence si applicable ;
- erreurs et reconnexion documentees ;
- observabilite minimale presente ;
- aucune dependance interdite.
