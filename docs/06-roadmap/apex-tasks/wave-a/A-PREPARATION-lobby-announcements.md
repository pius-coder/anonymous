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
