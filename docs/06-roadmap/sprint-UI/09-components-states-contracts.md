# Components, States And Contracts

## Composants Transverses

| Composant                | Role                                | Acteurs                          | Sprints            |
| ------------------------ | ----------------------------------- | -------------------------------- | ------------------ |
| `AppShell`               | Structure globale par audience      | Tous                             | 04, 05, 11, 12, 16 |
| `LifecycleBanner`        | Etat partie/round visible           | Joueur, admin, observer, support | 01, 08, 10, 13     |
| `ConnectionStatus`       | Connexion live, stale, reconnect    | Joueur, admin, observer          | 09, 10, 11, 16     |
| `PageState`              | Loading, empty, error, denied       | Tous                             | Tous               |
| `CommandConfirmModal`    | Confirmation action sensible        | Admin                            | 08, 10, 12, 13, 18 |
| `AuditReasonModal`       | Raison obligatoire                  | Admin, support si autorise       | 08, 13, 18         |
| `ReadonlyBadge`          | Signal mode lecture seule           | Observer, support, admin monitor | 12, 16, 18         |
| `Timeline`               | Evenements, audit, incidents        | Admin, support                   | 12, 18, 19         |
| `DeliveryStatus`         | Statut notifications                | Admin, support, joueur simplifie | 08, 17             |
| `PaymentStatusCard`      | Statut paiement public              | Joueur, admin limite             | 07                 |
| `LedgerTable`            | Mouvements financiers               | Finance                          | 07, 19             |
| `ParticipantStatusTable` | Presence, pret, paiement, connexion | Admin, support readonly          | 06, 08, 12         |
| `PlayerStatePanel`       | Projection joueur autorisee         | Joueur, support/admin readonly   | 09, 11, 16         |
| `ReadonlySnapshot`       | Projection observer/support         | Observer, support, admin         | 09, 16             |
| `MiniGameFrame`          | Hote UI mini-jeu joueur             | Joueur                           | 14, 15             |
| `MiniGameReadonlyFrame`  | Rendu mini-jeu sans private state   | Observer, support/admin          | 14, 15, 16         |
| `ProvisionalScoreTable`  | Review admin scores                 | Admin                            | 13                 |
| `PublishedResultsView`   | Resultats officiels                 | Joueur, observer, admin          | 13, 19             |
| `ComplianceGatePanel`    | Gate, evidence, decision            | Admin                            | 05, 18             |
| `RiskSignalList`         | Anti-cheat redige                   | Admin, support                   | 14, 15, 18         |

## PageState Spec

| Etat              | Copie UI minimale                  | Action                                  |
| ----------------- | ---------------------------------- | --------------------------------------- |
| Loading           | `Chargement de {resource}`         | Spinner/progress, pas de faux contenu   |
| Empty             | `{resource} introuvable ou absent` | CTA de creation/retour si autorise      |
| Denied            | `Acces refuse: {reason}`           | Connexion, retour, support              |
| Stale             | `Donnees obsoletes depuis {time}`  | `Rafraichir`; bloquer commande sensible |
| Recoverable error | `Impossible de {action}. {reason}` | `Reessayer`                             |
| Blocking error    | `{code produit}: {message}`        | Retour ou support                       |
| Reconnecting      | `Reconnexion en cours`             | Etat place/input/deadline               |
| Success           | `{action} confirmee`               | Prochaine etape                         |

## Projections Et Contrats Cibles

| Projection/contrat         | Utilisation UI                      | Audience                           |
| -------------------------- | ----------------------------------- | ---------------------------------- |
| `CurrentUser`              | Session, role, navigation           | Tous connectes                     |
| `PublicPartyView`          | Catalogue/detail public             | Public/joueur                      |
| `ParticipationView`        | Statut inscription/admission        | Joueur                             |
| `PaymentStatusView`        | Paiement public joueur              | Joueur                             |
| `AdminGameState`           | Command center                      | Admin                              |
| `AdminEventView`           | Timeline/audit                      | Admin/support selon filtre         |
| `PlayerStateView`          | Lobby, live, waiting, results       | Joueur                             |
| `ReadonlySnapshot`         | Observer/support/admin monitor      | Observer/support/admin             |
| `MiniGameManifest`         | Config admin et render UI           | Admin/joueur/observer selon champs |
| `MiniGamePublicState`      | Rendu joueur/observer public        | Joueur/observer                    |
| `MiniGamePrivateState`     | Rendu joueur uniquement si autorise | Joueur concerne                    |
| `ProvisionalScoreView`     | Table review admin                  | Admin uniquement                   |
| `PublishedResultsView`     | Resultats officiels                 | Joueur/observer/admin              |
| `NotificationDeliveryView` | Delivery status                     | Admin/support/joueur simplifie     |
| `LedgerView`               | Finance                             | Finance                            |
| `IncidentView`             | Support/compliance                  | Support/admin                      |
| `RiskSignalView`           | Anti-cheat redige                   | Support/admin                      |

## Donnees Interdites Par Audience

| Audience | Interdit                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------------- |
| Public   | Champs admin, participants prives, paiement detaille, audit, scores non publies.                     |
| Joueur   | Scores provisoires, rangs provisoires, private state autre joueur, secrets provider, ledger complet. |
| Observer | Inputs, private state, scores provisoires, paiement, emails, tokens.                                 |
| Support  | Commandes competition, secrets provider, reponses cachees, correction score par defaut.              |
| Admin    | Controle direct client joueur, secrets provider inutiles, modification ledger.                       |
| Finance  | Commandes round, private state mini-jeu, controle participant live.                                  |

## Actions Sensibles

| Action                 | UI requise                           |
| ---------------------- | ------------------------------------ |
| Publier partie         | Confirmation, gate status, audit.    |
| Ouvrir preparation     | Confirmation si impact participant.  |
| Confirmer avec absents | Raison obligatoire.                  |
| Lancer briefing        | Etat READY_TO_START visible.         |
| Demarrer manche        | Confirmation, no stale, role admin.  |
| Pause/reprendre        | Statut timer et raison si decide.    |
| Fermer manche          | Message no publication.              |
| Corriger score         | Raison obligatoire, preview version. |
| Publier resultats      | Confirmation consequences, gates OK. |
| Waiver compliance      | Raison obligatoire.                  |
| Reconciler paiement    | Idempotency visible, audit finance.  |
| Retry job              | Statut idempotent visible.           |

## Accessibilite Et Live Regions

- Les changements de statut visibles doivent etre annonces via un role adapte (`status`, `alert`, `log` selon composant final).
- Les erreurs ne reposent pas uniquement sur la couleur.
- Les timers ne doivent pas voler le focus.
- Une modal qui exige une decision prend le focus et rend une sortie claire.
- Les commandes mini-jeu doivent rester utilisables au clavier lorsque le mini-jeu le permet.
