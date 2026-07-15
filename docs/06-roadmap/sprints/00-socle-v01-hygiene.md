# Sprint 00 - Socle v0.1 et hygiene

## Objectif

Stabiliser la base de reconstruction, rendre les docs source de verite et cadrer le worktree avant toute
feature produit. Hors scope: ajouter une fonctionnalite metier.

## User Stories Produit

| ID | Role | User story | Valeur produit | Priorite |
|---|---|---|---|---|
| US-00-01 | Admin | En tant qu'admin, je veux que les actions de lancement et publication soient cadrees avant implementation, afin de ne pas demarrer ou publier par erreur. | Les futures surfaces admin ont des interdictions produit explicites. | Must |
| US-00-02 | Joueur | En tant que joueur, je veux que l'acces live soit protege par participation, afin de ne pas entrer dans une partie sans droit. | Le parcours joueur futur a une barriere d'admission claire. | Must |
| US-00-03 | Observateur | En tant qu'observateur, je veux une lecture seule garantie, afin de suivre sans influencer la partie. | L'observation future n'a pas de commandes joueur. | Must |
| US-00-04 | Support | En tant que support, je veux voir les limites de mes actions, afin d'aider sans modifier la competition. | Le support futur est separe des decisions admin. | Must |
| US-00-05 | Worker/Systeme | En tant que systeme, je veux que les timers soient bornes, afin de ne jamais demarrer une manche active automatiquement. | Les jobs futurs ne violent pas la lifecycle. | Must |

## Scenarios D'Acceptation Atomiques

| ID | Story | Surface | Given | When | Then | UML liee | Contrat/Test |
|---|---|---|---|---|---|---|---|
| AC-00-01 | US-00-01 | Command center cible | Partie seulement `SCHEDULED` | L'admin clique `Lancer la manche` | Action indisponible; demarrage interdit sans preparation | [state machines](../../03-architecture/uml/state-machines.md) | Test lifecycle futur |
| AC-00-02 | US-00-01 | Command center cible | Scores non verifies | L'admin clique `Publier les resultats` | Action indisponible; publication exige verification | [scoring publication](../../03-architecture/uml/scoring-publication.md) | Test publication futur |
| AC-00-03 | US-00-02 | Detail partie cible | Joueur sans participation active | Le joueur clique `Entrer dans le live` | Acces refuse avec erreur participation requise | [permissions](../../03-architecture/uml/permissions.md) | Test RBAC futur |
| AC-00-04 | US-00-03 | Vue observer cible | Observateur en lecture seule | L'observateur tente `Envoyer une action` | Aucun bouton d'action; commande serveur refusee si forcee | [realtime flow](../../03-architecture/uml/realtime-flow.md) | Test no-input futur |
| AC-00-05 | US-00-04 | Dossier partie cible | Role support lecture seule | Le support clique `Corriger le score` | Action absente ou refusee par RBAC | [permissions](../../03-architecture/uml/permissions.md) | Test support futur |
| AC-00-06 | US-00-05 | Scheduler cible | Heure planifiee atteinte | Le systeme declenche `scheduled_time_reached` | Preparation/rappel seulement; pas `ACTIVE_ROUND` | [state machines](../../03-architecture/uml/state-machines.md) | Test timer futur |

## Sources Docs Obligatoires

- Produit: [vision](../../01-product/vision-and-scope.md), [use cases](../../01-product/use-cases.md)
- UX: [screen states](../../02-ux/screen-state-matrix.md), [information architecture](../../02-ux/information-architecture.md)
- Architecture/UML: [architecture cible](../../03-architecture/target-architecture.md), [UML index](../../03-architecture/uml.md), [contexte](../../03-architecture/uml/context-system.md)
- Couches: [README couches](../../04-layers/README.md), [observability](../../04-layers/observability.md)
- Workflow: [pipeline agentique](../../05-workflows/agentic-feature-pipeline.md), [Apex](../../05-workflows/apex-workflow.md)
- Tests: [strategie de test](../../05-workflows/test-strategy.md)

## Preuves Legacy

- [audit forensic HEAD](../../00-audit/head-forensic-audit.md)
- [index HEAD](../../00-audit/head-file-index.md)
- [manifest suppression](../../00-audit/deletion-manifest.md)
- [keep rewrite delete](../../00-audit/keep-rewrite-delete.md)

## UML Concernee

- Lire [contexte systeme](../../03-architecture/uml/context-system.md) et [domaines](../../03-architecture/uml/domains.md).
- Modifier seulement si le socle change les limites de runtime ou packages.

## Pipeline Par Couche

- Web: verifier layout racine et separation parcours sans ajouter de route produit.
- API/ConnectRPC: aucun endpoint nouveau; documenter les exceptions legacy.
- Game-server: aucun comportement live nouveau.
- Domaine: verifier absence de dependances framework.
- DB: conserver migrations utiles, sans mutation destructive.
- Worker: conserver jobs existants sans nouveau workflow metier.
- Notifications: aucune decision provider.
- Observabilite: tracer commandes de validation et etat initial.

## Contrats Protobuf Et ConnectRPC

Aucun nouveau message obligatoire. Les contrats futurs restent identifies dans
[strategie Protobuf](../../03-architecture/protobuf-contract-strategy.md).

## Data

Documenter seulement les donnees conservees, supprimees, inconnues ou a revalider.

## UI States

Les docs doivent prevoir loading, empty, error, reconnect et denied pour les parcours futurs.

## Permissions

Ne pas deduire les roles finaux depuis les composants web. Les permissions serveur restent la cible.

## Erreurs Observabilite

Documenter les echecs de validation avec commande, cause, fichier et sprint de correction.

## Tests Attendus

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm docs:check`

## Definition Of Done

- Worktree inspecte avant changement.
- Docs locales lues et references.
- Aucun changement utilisateur masque.
- Les echecs de validation sont documentes avec risque restant.

## Interdictions Specifiques

- Ne pas restaurer un dossier legacy entier.
- Ne pas supprimer lockfiles, licences ou configs indispensables.
- Ne pas ajouter de feature produit pour "tester" le socle.
