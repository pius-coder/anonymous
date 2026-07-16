# Route Map

Les routes ci-dessous sont conceptuelles. Elles guident `apps/web`, mais ne creent pas de routes tant que les contrats et sprints proprietaires ne sont pas prets.

## Routes Publiques Et Joueur

| Route                               | Acteur        | Ecran                                    | Garde                               | Sprints            |
| ----------------------------------- | ------------- | ---------------------------------------- | ----------------------------------- | ------------------ |
| `/`                                 | Invite/Joueur | Accueil catalogue ou redirection parties | Public                              | 05                 |
| `/parties`                          | Invite/Joueur | Catalogue parties publiees               | Public                              | 05                 |
| `/parties/:partyCode`               | Invite/Joueur | Detail public partie                     | Public, no admin fields             | 05, 06             |
| `/parties/:partyCode/participation` | Joueur        | Statut participation                     | Session + participation             | 06, 07             |
| `/parties/:partyCode/payment`       | Joueur        | Paiement participation                   | Participation payable               | 07                 |
| `/parties/:partyCode/lobby`         | Joueur        | Preparation, presence, ready             | Participation active                | 08, 09, 11         |
| `/parties/:partyCode/round`         | Joueur        | Briefing, mini-jeu, feedback live        | Live access court + participation   | 09, 10, 11, 14, 15 |
| `/parties/:partyCode/waiting`       | Joueur        | Attente verification                     | Round termine, no provisional score | 10, 11, 13         |
| `/parties/:partyCode/results`       | Joueur        | Resultats publies                        | `RESULTS_PUBLISHED`                 | 13, 19             |
| `/account`                          | Joueur        | Session, deconnexion                     | Session                             | 04                 |

## Routes Admin

| Route                               | Acteur        | Ecran                                        | Garde                              | Sprints        |
| ----------------------------------- | ------------- | -------------------------------------------- | ---------------------------------- | -------------- |
| `/admin`                            | Admin         | Liste parties admin                          | Role admin                         | 05             |
| `/admin/parties/new`                | Admin         | Creation brouillon                           | Role admin                         | 03, 05         |
| `/admin/parties/:partyId/setup`     | Admin         | Configuration, validation, publication       | Role admin                         | 05, 14         |
| `/admin/parties/:partyId/control`   | Admin         | Command center decideur                      | Role admin + lease si requis       | 08, 10, 12, 13 |
| `/admin/parties/:partyId/monitor`   | Admin/Support | Monitoring lecture seule                     | Admin/support                      | 09, 12, 16, 18 |
| `/admin/parties/:partyId/scores`    | Admin         | Scores provisoires, corrections, publication | `RESULT_VERIFY` / `RESULT_PUBLISH` | 13             |
| `/admin/parties/:partyId/audit`     | Admin/Support | Audit et timeline                            | Read audit permission              | 12, 18         |
| `/admin/parties/:partyId/incidents` | Admin/Support | Incidents et risk signals                    | Support/admin                      | 18             |

## Routes Observer

| Route                               | Acteur      | Ecran                    | Garde              | Sprints    |
| ----------------------------------- | ----------- | ------------------------ | ------------------ | ---------- |
| `/observe/parties/:partyId`         | Observateur | Snapshot global readonly | `READONLY_OBSERVE` | 09, 10, 16 |
| `/observe/parties/:partyId/results` | Observateur | Resultats publics        | Resultats publies  | 13, 16     |

## Routes Support Et Finance

| Route                                         | Acteur  | Ecran                                | Garde        | Sprints            |
| --------------------------------------------- | ------- | ------------------------------------ | ------------ | ------------------ |
| `/support`                                    | Support | Recherche dossier                    | Role support | 04, 18             |
| `/support/parties/:partyId`                   | Support | Dossier partie readonly              | Role support | 06, 08, 11, 12, 18 |
| `/support/parties/:partyId/players/:playerId` | Support | Snapshot joueur autorise             | Role support | 11, 16             |
| `/finance`                                    | Finance | Recherche ledger                     | Role finance | 04, 07             |
| `/finance/transactions/:transactionId`        | Finance | Detail transaction et reconciliation | Role finance | 07, 19             |

## Redirections Attendues

| Situation                                   | Redirection ou rendu                           |
| ------------------------------------------- | ---------------------------------------------- |
| Invite clique live                          | Connexion ou message participation requise.    |
| Joueur sans participation clique lobby/live | `DeniedState` participation requise.           |
| Joueur deja inscrit clique s'inscrire       | Statut participation existante.                |
| Admin sans role ouvre control               | `DeniedState` role insuffisant.                |
| Support ouvre command center decideur       | Route monitor readonly.                        |
| Observer tente route joueur                 | `DeniedState` audience invalide.               |
| Resultats non publies                       | Attente verification, jamais table provisoire. |
