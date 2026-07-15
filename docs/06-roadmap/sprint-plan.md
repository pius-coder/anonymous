# Roadmap v0.1

La roadmap est un index. La logique executable par agent vit dans les fiches autonomes de
`docs/06-roadmap/sprints/`.

## Regles globales

- Une feature ne commence jamais par une table, un endpoint ou un composant.
- Chaque sprint suit `../05-workflows/agentic-feature-pipeline.md`, `../05-workflows/apex-workflow.md`
  et `../05-workflows/test-strategy.md`.
- Chaque sprint important remplit le canevas de couche avant implementation.
- Aucun endpoint Hono nouveau ne doit etre ajoute sans contrat `.proto` ou exception documentee.
- ConnectRPC est la cible pour commandes/queries HTTP. Il ne remplace pas le game-server realtime.
- Les scores provisoires restent caches aux joueurs jusqu'a publication explicite.
- Le timer ne demarre jamais une partie active sans commande admin autorisee.
- Le design system n'est pas un sprint `sprint-UI` parallele. Il est un gate transversal: chaque
  fiche metier doit referencer les user stories UI, l'inventaire d'ecrans et les etats obligatoires.
- La prochaine fiche metier ne demarre pas tant que le gate frontend prioritaire decrit dans
  `../02-ux/frontend-architecture.md` n'est pas vert.

## Index des sprints

| Sprint | Fiche | Theme | Sortie verifiable |
|---|---|---|---|
| 00 | [Socle v0.1 et hygiene](sprints/00-socle-v01-hygiene.md) | Fondation documentaire et worktree | Source de verite, gates et validations de base |
| 01 | [Modele produit et domaine](sprints/01-modele-produit-domaine.md) | Invariants metier purs | Types, transitions et erreurs domaine |
| 02 | [Tooling contrats Protobuf et ConnectRPC](sprints/02-tooling-contrats-protobuf-connectrpc.md) | Source de verite reseau | Packages proto, generation planifiee, fixtures |
| 03 | [Persistence minimale et migrations](sprints/03-persistence-minimale-migrations.md) | Schema durable par domaine | Prisma minimal, repositories, migrations DB vide |
| 04 | [Identity auth et RBAC](sprints/04-identity-auth-rbac.md) | Sessions et autorisations | Auth serveur, roles, guards, revocation |
| 05 | [Acquisition publique et planification](sprints/05-acquisition-publique-planification.md) | Catalogue public et configuration admin | Partie publiee sans demarrage live |
| 06 | [Participation et admission joueur](sprints/06-participation-admission-joueur.md) | Inscription explicite | Participation active, capacite, admission |
| 07 | [Paiements wallet et ledger](sprints/07-paiements-wallet-ledger.md) | Finance auditable | Transactions, ledger, reconciliation |
| 08 | [Preparation lobby et annonces](sprints/08-preparation-lobby-annonces.md) | Avant-match | Presence, pret, annonces, confirmation |
| 09 | [Realtime core et reconnexion](sprints/09-realtime-core-reconnexion.md) | Noyau live | Handshake, room mince, snapshots filtres |
| 10 | [Round orchestration](sprints/10-round-orchestration.md) | Cycle de manche | Start/close/review sans publication auto |
| 11 | [Experience joueur live](sprints/11-experience-joueur-live.md) | Etats joueur | UI explicite, commandes et erreurs contractees |
| 12 | [Admin command center](sprints/12-admin-command-center.md) | Supervision et commandes | Centre admin separe du parcours joueur |
| 13 | [Scoring verification publication](sprints/13-scoring-verification-publication.md) | Resultats officiels | Provisoire, review, correction, publication |
| 14 | [Framework integration mini-jeux](sprints/14-framework-integration-mini-jeux.md) | Runtime mini-jeux | Manifest, runtime, no-leak, harness |
| 15 | [Lot pilote mini-jeux](sprints/15-lot-pilote-mini-jeux.md) | Jeux pilotes | Petit lot jouable de bout en bout |
| 16 | [Observer carte et social utile](sprints/16-observer-carte-social-utile.md) | Lecture seule et social borne | Snapshots filtres, interactions justifiees |
| 17 | [Notifications et workers](sprints/17-notifications-workers.md) | Jobs idempotents | Rappels, delivery logs, reconciliation |
| 18 | [Compliance support audit anti-cheat](sprints/18-compliance-support-audit-anti-cheat.md) | Actions sensibles | Gates, incidents, risk signals, audit |
| 19 | [Migration legacy controlee et recette](sprints/19-migration-legacy-controlee-recette.md) | Fermeture migration | Manifeste applique, E2E critiques, dette bornee |

## Couverture et gates

- [Couverture narrative des cas d'utilisation](use-case-coverage.md)
- [Acceptance gates](acceptance-gates.md)
- [Risques et decisions ouvertes](risks-and-open-decisions.md)
- [Sequence de migration](migration-sequence.md)

## Ordre strict

Les sprints 00 a 04 sont bloquants. Les sprints 05 a 13 construisent le parcours principal de bout en
bout. Les sprints 14 a 16 ajoutent les mini-jeux et l'observation. Les sprints 17 et 18 durcissent les
operations. Le sprint 19 ferme la migration seulement apres stabilisation des modules cibles.
