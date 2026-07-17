# P-C-PLATFORM - Plateforme, deploiement et rollback

## Mission autonome

Choisir et livrer une plateforme reproductible pour web, API, game-server, worker, gateway, PostgreSQL
et Redis, avec TLS, secrets manages, promotion immuable et rollback exerce.

## Prerequis et lectures

- P-SEQ-06 merge; ADR hebergement/region/services manages approuvee au debut du lot.
- Lire runtime topology, security, worktree/env, audit et exigences Fapshi/websocket.
- Context7 et docs officielles de Next.js, Colyseus et de la plateforme choisie.

## Ownership

`deploy/**`, Dockerfiles/images, IaC/manifests, reverse proxy/TLS, workflows reutilisables, environnements,
secrets references, scripts de deploy/rollback et runbooks plateforme. L'integration `.github/workflows`
racine appartient a P-SEQ-07. Pas de feature metier.

## Interdit

Secret dans Git/image/log, tag `latest`, SSH manuel non trace, rebuild entre staging/prod, `next dev`,
DB/Redis ephemeres, fallback localhost ou deploy depuis un worktree sale.

## Livrables production

- ADR provider/region/topologie et matrice cout/capacite/dependances;
- builds multi-stage non-root, health/readiness, resource limits et images signees;
- DNS/TLS/reverse proxy/WebSocket/streaming, timeouts superieurs au keep-alive applicatif;
- secrets manages et rotation sans rebuild;
- pipeline build->scan->staging->approval->prod par digest;
- deploy rolling/blue-green minimal, drain et rollback applicatif/migration compatible;
- environnements isoles, ownership et runbooks outage/rotation/rollback.

## Criteres d'acceptation

- recreation d'un environnement vierge depuis IaC sans etape cachee;
- meme digest en staging/prod et provenance verifiable;
- connexions live survivent/drainent selon la politique pendant deploy;
- rollback chrono respecte l'objectif et ne perd pas les jobs/transactions;
- aucune route interne, port admin ou secret n'est expose publiquement.

## Tests et sortie

Validation IaC, scan image, deploy staging, smoke HTTP/Connect/WS/worker, rotation secret et rollback.
Gates lot, cout estime, diagramme final et commit atomique sans deploiement prod non autorise.
