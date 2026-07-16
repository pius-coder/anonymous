# A-PREPARATION - Lobby, readiness et annonces

## Mission autonome

Apres SEQ-00/01/02, cabler le lobby joueur et la preparation admin. Une annonce persiste son contenu,
son audit et un intent NotificationJob, mais cette tache ne livre pas le message.

## Ownership

Use-cases et transport Preparation, composants/routes lobby et admin preparation, tests du domaine.

## Interdit

Contrats, Prisma/migrations/seed, `apps/worker`, whatsapp, tooling racine, routeur central,
`apps/web/src/services/rpcServices.ts`, paiement, round/scoring. Utiliser l'API NotificationJob publique
de SEQ-02 sans la modifier.

## Demarrage obligatoire

Lire AGENTS, gap analysis, sprint 08, workflows preparation/notification, contrats Preparation et legacy.
Context7 : ConnectRPC, TanStack Query et Prisma transaction si l'intent doit etre atomique.

## AC

- Open preparation reste une commande admin; aucun timer ne demarre la partie.
- Present/ready/leave sont distincts, idempotents et autorises cote serveur.
- Confirm start exige une raison exploitable si des participants manquent.
- Send announcement cree Announcement + AuditLog + NotificationJob de facon atomique.
- UI couvre loading/empty/error/stale, absents, reconnect et double submit.

## Tests et sortie

L3 atomicite/idempotence, L4 Preparation/RBAC, L5 admin open->joueur ready->confirm. Commit atomique,
rapport AC -> test, validations scope/integration/E2E/typecheck/lint/build; montage via SEQ-03.

## Etat de livrable (apex/a-preparation)

| Surface | Statut |
|---|---|
| Use-cases present/ready/leave/open/confirm/announce | Cables, idempotents, absents + raison |
| Annonce atomique Announcement + AuditLog + NotificationJob PENDING | Via `prisma.$transaction`, un job par participant destinataire (pas de delivery) |
| Transport REST Hono | Deja monte `/v1` et `/v1/admin` |
| Transport Connect `preparation-service.ts` | Livre, **montage `rpc/routes.ts` = SEQ-03** |
| UI lobby + admin preparation | TanStack Query, loading/empty/error/stale, double-submit, etat personnel restaure apres reload |
| No-leak joueur | Projection preparation refusee des que la partie sort de la phase preparation |
| Interdits | Contrats, Prisma seed/migrations, worker, `rpcServices.ts`, routeur central non modifies |

### AC → tests

| AC | Preuve |
|---|---|
| Open preparation admin, aucun timer | unit openPreparation + L4 RBAC ADMIN |
| Present/ready/leave distincts, idempotents | unit + L3 PG |
| Confirm start raison si absents | unit + L3 |
| Annonce atomique + jobs destinataires PENDING | L3 integration PG |
| UI etats et reprise session | LobbyPanel + AdminPreparationPanel + L5 navigateur multi-contexte sans skip |
| Annonce masquee hors preparation | L4 assertion negative sur `ROUND_ACTIVE` |
