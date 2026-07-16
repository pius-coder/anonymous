# UI Validation Checklist

## Avant De Coder Une Surface

- [ ] Lire la fiche sprint concernee.
- [ ] Lire le parcours dans [use-case-coverage.md](../use-case-coverage.md).
- [ ] Lire la source produit liee dans `docs/01-product/`.
- [ ] Identifier acteur, route, preconditions et contrats.
- [ ] Identifier les donnees visibles et interdites.
- [ ] Identifier tous les etats visibles: loading, empty, denied, error, stale, reconnect.
- [ ] Verifier si une action demande confirmation ou raison.
- [ ] Verifier si la surface doit etre readonly.
- [ ] Verifier si le sprint depend d'un contrat Protobuf non encore cree.

## Checklist Joueur

- [ ] Le joueur sait toujours dans quelle phase il se trouve.
- [ ] La prochaine action est unique ou priorisee.
- [ ] Le joueur ne voit aucun score provisoire.
- [ ] Les erreurs de commande sont traduites et actionnables.
- [ ] La reconnexion indique place, input et deadline.
- [ ] Mobile sans overlap ni texte tronque.

## Checklist Admin

- [ ] Lecture, decision et publication sont separees.
- [ ] Les actions sensibles sont confirmees.
- [ ] Les raisons obligatoires sont exigees.
- [ ] L'etat stale bloque les actions sensibles.
- [ ] Le support ne voit pas les boutons admin interdits.
- [ ] L'admin ne peut jamais jouer a la place du joueur.

## Checklist Observer

- [ ] Aucun input possible.
- [ ] Snapshot filtre.
- [ ] Private state absent du payload et du rendu.
- [ ] Scores provisoires invisibles.
- [ ] Etat stale/reconnect visible.

## Checklist Support

- [ ] Dossier lisible sans commande competition.
- [ ] Snapshot autorise uniquement.
- [ ] Incident et audit consultables selon permission.
- [ ] Secrets et reponses cachees rediges.

## Checklist Finance Et Paiement

- [ ] Joueur voit statut paiement public, pas payload provider brut.
- [ ] Admin voit blocage paiement, pas commande ledger.
- [ ] Finance voit ledger et idempotency.
- [ ] Retry/reconciliation ne peut pas creer de doublon.
- [ ] Gains bloques avant `RESULTS_PUBLISHED`.

## Checklist Mini-Jeux

- [ ] Manifest versionne connu.
- [ ] UI joueur, readonly observer et support incident sont separes.
- [ ] Commandes valides et invalides ont feedback clair.
- [ ] Duplicate nonce et late input sont visibles sans fuite.
- [ ] Private state jamais rendu dans observer/support.
- [ ] Reconnexion restaure la state view sans replay input.

## Checklist Notifications Et Workers

- [ ] Delivery status visible et comprehensible.
- [ ] Provider errors redigees.
- [ ] Retry idempotent.
- [ ] Notification ne demarre pas une partie.
- [ ] Notification ne publie pas de score.

## Tests UI Attendus

| Surface                 | Tests minimaux                                                      |
| ----------------------- | ------------------------------------------------------------------- |
| Public catalogue/detail | Loading, empty, CTA par etat, no admin fields.                      |
| Auth/RBAC               | Denied par role, session expiree, logout.                           |
| Participation           | Double inscription, annulation, participation absente.              |
| Paiement                | Pending, confirmed, failed, wallet insuffisant, provider down.      |
| Lobby                   | Present, ready, annonce, rappel sans start.                         |
| Live joueur             | Briefing, active, rejected command, waiting review, reconnect.      |
| Admin control           | Role forbidden, stale, confirmation, audit reason.                  |
| Scoring                 | Provisional admin only, correction reason, publish, no-leak joueur. |
| Observer                | Snapshot filtre, forced input refuse, stale.                        |
| Support                 | Readonly, incident, audit, no command competition.                  |
| Finance                 | Ledger, reconcile, idempotency, no round command.                   |

## Definition Of Done UI

- [ ] L'ecran est mappe a un sprint et une user story.
- [ ] Les donnees proviennent d'une projection/contrat nomme.
- [ ] Les etats transverses sont couverts.
- [ ] Les actions interdites sont absentes ou clairement disabled.
- [ ] Les tests no-leak existent pour les audiences sensibles.
- [ ] Les routes legacy ne sont pas conservees par accident.
- [ ] La documentation de ce dossier est mise a jour si l'interface change.
