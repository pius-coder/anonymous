# A-WORKERS - Runners, retries et livraison notification

## Mission autonome

Apres SEQ-00/01/02, rendre operationnels les jobs deadline, reconciliation et notification. Cette tache
consomme NotificationJob/DeliveryLog mais ne modifie ni schema ni use-case preparation.

## Ownership

`apps/worker/**`, `apps/whatsapp-gateway/**`, tests workers/providers et documentation operationnelle du
runner. Les adaptations repository passent uniquement par les APIs publiques figees de SEQ-02.

## Interdit

Contrats, Prisma/migrations/seed, API preparation/payment/round, web, game-server, tooling racine/Turbo.

## Demarrage obligatoire

Lire AGENTS, gap analysis, sprint 17, workflows notifications/jobs, security/logging et legacy gateway.
Context7 : BullMQ, Prisma/PostgreSQL et SDK officiel du provider choisi; si aucun provider valide, utiliser
un faux contractuel injectable et conserver le gateway production explicitement non configure.

## AC

- Queue/Worker demarrent, ferment proprement et reclament chaque job de facon atomique.
- Retry/backoff et nombre max de tentatives sont explicites; echec final ecrit DeliveryLog.
- Deadline/reconciliation sont idempotents et ne demarrent jamais une partie.
- Deux workers concurrents ne traitent pas deux fois le meme effet.
- Logs redactes, correlation et metriques succes/retry/echec.

## Tests et sortie

L3 PostgreSQL+Redis avec claims concurrents, integration provider fake, retry et shutdown. Executer
validations scope/integration/typecheck/lint/build, commit atomique et rapport. Aucun montage central.
