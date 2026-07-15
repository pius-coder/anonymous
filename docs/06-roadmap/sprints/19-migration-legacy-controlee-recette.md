# Sprint 19 - Migration legacy controlee et recette

## Objectif

Appliquer le manifeste de migration et supprimer la dette legacy uniquement avec preuves. Hors scope:
commencer avant stabilisation des modules cibles.

## User Stories Produit

| ID | Role | User story | Valeur produit | Priorite |
|---|---|---|---|---|
| US-19-01 | Joueur | En tant que joueur, je veux parcourir public, participation, preparation, live et resultats, afin de valider le produit de bout en bout. | Parcours critique joueur. | Must |
| US-19-02 | Admin | En tant qu'admin, je veux planifier, lancer, verifier et publier avec audit, afin de valider l'exploitation. | Parcours critique admin. | Must |
| US-19-03 | Observateur | En tant qu'observateur, je veux suivre en lecture seule sans input, afin de valider la projection readonly. | Observation E2E. | Must |
| US-19-04 | Support | En tant que support, je veux lire incidents et audit, afin de valider l'assistance. | Support E2E. | Should |
| US-19-05 | Finance | En tant que finance, je veux valider paiement, wallet et reconciliation, afin de fermer la boucle finance. | Finance E2E. | Should |
| US-19-06 | Worker/Systeme | En tant que systeme, je veux executer jobs critiques sans doublon, afin de valider l'exploitation. | Jobs E2E. | Must |

## Scenarios D'Acceptation Atomiques

| ID | Story | Surface | Given | When | Then | UML liee | Contrat/Test |
|---|---|---|---|---|---|---|---|
| AC-19-01 | US-19-01 | Parcours joueur | Partie publiee | Le joueur clique `Voir details` puis `S'inscrire` | Participation creee, paiement/preparation accessibles | [state machines](../../03-architecture/uml/state-machines.md) | E2E joueur |
| AC-19-02 | US-19-01 | Live joueur | Joueur pret, round actif | Le joueur clique `Envoyer mon action` puis `Terminer` | Attente verification puis resultats apres publication | [scoring publication](../../03-architecture/uml/scoring-publication.md) | E2E live |
| AC-19-03 | US-19-02 | Command center | Partie configuree | L'admin clique `Ouvrir preparation`, `Demarrer la manche`, `Publier les resultats` | Toutes les transitions auditees | [sequences](../../03-architecture/uml/sequences.md) | E2E admin |
| AC-19-04 | US-19-03 | Observer | Round actif | L'observateur clique `Observer la partie` | Snapshot filtre, aucune action possible | [realtime flow](../../03-architecture/uml/realtime-flow.md) | E2E no-input |
| AC-19-05 | US-19-04 | Support | Incident ouvert | Le support clique `Voir audit` | Incident et audit lisibles, commandes absentes | [permissions](../../03-architecture/uml/permissions.md) | E2E support |
| AC-19-06 | US-19-05 | Finance | Paiement realise | La finance clique `Reconciler` | Ledger coherent, aucun doublon | [data flow](../../03-architecture/uml/data-flow.md) | E2E finance |
| AC-19-07 | US-19-06 | Jobs critiques | Retry apres failure | Le systeme relance `Retry job` | Job idempotent, pas de double notification/paiement | [data flow](../../03-architecture/uml/data-flow.md) | E2E worker |

## Sources Docs Obligatoires

- Produit: [use cases](../../01-product/use-cases.md), [vision](../../01-product/vision-and-scope.md)
- UX: [screen states](../../02-ux/screen-state-matrix.md), [information architecture](../../02-ux/information-architecture.md)
- Architecture/UML: [target architecture](../../03-architecture/target-architecture.md), [context UML](../../03-architecture/uml/context-system.md), [data flow](../../03-architecture/uml/data-flow.md)
- Couches: [README couches](../../04-layers/README.md), [observability](../../04-layers/observability.md)
- Workflow: [pipeline agentique](../../05-workflows/agentic-feature-pipeline.md), [safe removal](../../05-workflows/safe-removal.md)
- Tests: [strategie de test](../../05-workflows/test-strategy.md)

## Preuves Legacy

- `HEAD` contenait routes, docs, sorties agents, assets et tests utiles mais melanges.
- Les anciens dossiers `docs/plan/` et `docs/prd/features/` ne sont plus source de verite.
- [deletion manifest](../../00-audit/deletion-manifest.md) et [keep rewrite delete](../../00-audit/keep-rewrite-delete.md).

## UML Concernee

- Relire tout [l'index UML](../../03-architecture/uml.md) et modifier les diagrammes dont la recette prouve un ecart.

## Pipeline Par Couche

- Web: E2E parcours critiques, suppression surfaces legacy inutiles.
- API/ConnectRPC: bascule endpoints selon contrats ou exceptions.
- Game-server: live stable, no-leak, reconnect.
- Domaine: invariants finals.
- DB: migration DB vide et donnees de recette.
- Worker: jobs critiques idempotents.
- Notifications: reminders et delivery status.
- Observabilite: bilan dette, audit, validation finale.

## Contrats Protobuf Et ConnectRPC

Tous les endpoints publics restants pointent vers contrat `.proto` ou exception documentee avec date de retrait.

## Data

Mapper chaque element HEAD vers conserve, reecrit, supprime, archive ou inconnu. Aucune suppression sans preuve.

## UI States

Recette loading/empty/error/reconnect/denied sur public, auth, player live, admin, observer, finance/support.

## Permissions

RBAC complet verifie sur parcours admin/support/finance/observer/joueur.

## Erreurs Observabilite

Tout echec E2E documente avec reproduction, couche, risque et sprint de correction.

## Tests Attendus

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- E2E parcours critiques.
- Tests migration DB vide.
- Tests no-leak realtime.

## Definition Of Done

- Aucun fichier legacy supprime sans preuve et remplacement.
- Aucun parcours critique perdu sans decision explicite.
- Les questions ouvertes restantes sont documentees dans [risques](../risks-and-open-decisions.md).

## Interdictions Specifiques

- Ne pas reintroduire dette par compatibilite temporaire non bornee.
- Ne pas confondre recette demo et produit pret.
