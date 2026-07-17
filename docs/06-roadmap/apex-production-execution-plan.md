# Plan APEX de sortie production

Ce programme commence **apres** la baseline reconstruite SEQ-03. Il ne renomme pas SEQ-04 en
"production" : il ajoute une couche de features, hardening, exploitation et recette commerciale.

Source d'audit : `docs/00-audit/production-readiness-gap-analysis.md`.  
Fiches executables : `docs/06-roadmap/apex-tasks/production/`.

## Cible commerciale initiale

- utilisateurs reels avec paiement Fapshi;
- parcours joueur, admin, finance, support et observateur cable a des services reels;
- six mini-jeux, exactement un par famille pour le premier lancement;
- PostgreSQL, Redis, API, game-server, worker, gateway et web deployes/observes/restaurables;
- aucune donnee hardcodee, aucun provider factice et aucun fallback local sur un parcours inclus;
- go-live explicite, reversible et signe apres une repetition generale.

Les six cles ci-dessous sont la baseline technique la mieux etayee par le legacy. Le nombre de jeux et
la couverture des six familles sont confirmes; les cles/titres exacts sont ratifies ou remplaces de
facon explicite dans P-SEQ-01 avant le freeze des contrats.

## Politique no-mock

Un double de test est autorise seulement dans un test unitaire L1. Une AC de DB, queue, transport,
provider, navigateur, reconnect, paiement ou notification exige la frontiere reelle correspondante.

En sandbox de recette : Fapshi sandbox et provider de notification sandbox reel. En repetition de
production : credentials de preproduction, URLs publiques et donnees de test controlees. En go-live :
une transaction Fapshi de faible montant, compensee ou comptabilisee selon la procedure finance.

## Graphe d'execution

```text
P-SEQ-00 baseline production/no-mock
  -> P-SEQ-01 rulebooks des six jeux
    -> P-SEQ-02 contrats production
      -> P-SEQ-03 donnees production
        -> [WAVE-A coeur commercial]
          -> P-SEQ-04 composition coeur
            -> P-SEQ-05 plateforme mini-jeux
              -> [WAVE-B six jeux]
                -> P-SEQ-06 composition six jeux
                  -> [P-C-PLATFORM | P-C-LEGAL]
                    -> [P-C-DATA | P-C-SECURITY | P-C-OBSERVABILITY | P-C-QA]
                      -> P-C-SCALE
                        -> P-C-OPERATIONS
                          -> P-SEQ-07 release candidate
                            -> P-SEQ-08 repetition generale
                              -> P-SEQ-09 decision go-live
```

## WAVE-A - coeur commercial

| ID                | Feature production                                      | Dependances principales |
| ----------------- | ------------------------------------------------------- | ----------------------- |
| P-A-IDENTITY      | Sessions, reset, rate limit et edge auth durcis         | P-SEQ-03                |
| P-A-PLAYER        | Acquisition, capacite et parcours joueur sans hardcode  | P-SEQ-03                |
| P-A-PREPARATION   | Lobby social, presence, ready, groupes et moderation    | P-SEQ-03                |
| P-A-FAPSHI        | Collecte officielle sandbox/live et checkout reel       | P-SEQ-03                |
| P-A-WALLET        | Solde, historique et paiement wallet joueur             | P-A-FAPSHI              |
| P-A-FINANCE       | Admission, reconciliation, compensations et payouts     | P-A-FAPSHI              |
| P-A-ADMIN         | Command center complet et arbitrage audite              | P-SEQ-03                |
| P-A-REALTIME      | Admission live, reconnexion et persistence autoritaires | P-SEQ-03                |
| P-A-SCORING       | Preuve runtime, verification, publication et gains      | P-SEQ-03                |
| P-A-NOTIFICATIONS | Outbox, provider reel, templates et delivery            | P-SEQ-03                |
| P-A-OBSERVER      | Projection readonly sans fuite et sans commande         | P-A-REALTIME            |
| P-A-SUPPORT       | Support, compliance, incidents et audit durable         | P-SEQ-03                |

Les douze lots sont obligatoires sauf amendement de scope signe avant leur lancement. Les lots
possedent leurs modules. `P-SEQ-04` reste seul proprietaire des montages centraux et de la composition
inter-lots.

## WAVE-B - six jeux

Chaque fiche est une feature verticale autonome : rulebook signe, contrats consommes, runtime pur,
adapter game-server, persistence/checkpoint, scoring, UI joueur, projection readonly, accessibilite,
assets licencies, telemetrie et preuves L1/L3/L4/L5.

| ID              | Famille    | Cle                  |
| --------------- | ---------- | -------------------- |
| P-B-SOLO        | Solo       | `memory-sequence`    |
| P-B-DUEL        | Duel       | `pure-reaction-duel` |
| P-B-ALLIANCE    | Alliance   | `trust-bridge`       |
| P-B-TEAM        | Equipe     | `team-relay`         |
| P-B-SURVIVAL    | Survie     | `danger-sweep`       |
| P-B-HIDDEN-ROLE | Role cache | `silent-vote`        |

## WAVE-C - exploitation et hardening

| ID                | Feature production                                | Dependances                  | Preuve de sortie                             |
| ----------------- | ------------------------------------------------- | ---------------------------- | -------------------------------------------- |
| P-C-PLATFORM      | Images, IaC, CD, promotion et rollback            | P-SEQ-06                     | Deploiement reproductible et rollback chrono |
| P-C-LEGAL         | Consentement, retention et droits donnees         | P-SEQ-06                     | Preuves juridiques et techniques             |
| P-C-DATA          | Backup, PITR, restore et migrations sures         | P-C-PLATFORM                 | Restore drill avec RPO/RTO mesures           |
| P-C-SECURITY      | Edge, secrets et supply chain                     | P-C-PLATFORM                 | Scan, SBOM, rotation et tests d'abus         |
| P-C-OBSERVABILITY | Logs, metriques, traces, SLO et alertes           | P-C-PLATFORM                 | Alertes injectees et runbooks suivis         |
| P-C-QA            | Navigateurs, mobile, accessibilite et performance | P-C-PLATFORM                 | Matrice supportee verte                      |
| P-C-SCALE         | Charge, soak, concurrence et recovery             | P-C-OBSERVABILITY, P-C-QA    | Capacite signee des six jeux                 |
| P-C-OPERATIONS    | Astreinte, support, incident et release           | Tous les lots P-C precedents | Exercice incident et ownership 24/7 defini   |

Sous-vagues : `PLATFORM | LEGAL`, puis `DATA | SECURITY | OBSERVABILITY | QA`, puis `SCALE`, puis
`OPERATIONS`. Elles ne doivent pas etre lancees comme huit branches sans dependances.

## Ownership des surfaces partagees

- contracts et generated output : P-SEQ-02 uniquement;
- schema, migrations, seed et repositories partages : P-SEQ-03 uniquement;
- routeur RPC, providers/layouts web centraux et runner worker : P-SEQ-04;
- registry/montage MiniGame et manifests globaux : P-SEQ-05 puis P-SEQ-06;
- CI/CD, configuration root, release manifest et composition des outils WAVE-C : P-SEQ-07;
- jobs notification, paiement et deadline : modules distincts possedes respectivement par
  P-A-NOTIFICATIONS, P-A-FINANCE et P-A-REALTIME.

Un besoin contracts/DB decouvert apres freeze retourne au jalon proprietaire. Le hash de freeze est
regenere et tous les lots descendants affectes sont rebase/revalides; aucun lot ne modifie la surface
partagee en contournant cette procedure.

## Regles de lancement

1. Une fiche = un worktree et une branche `apex/<task-id>`.
2. Toute session lit `AGENTS.md`, sa fiche, l'audit production, les docs de couche et les preuves HEAD.
3. Context7 est obligatoire pour les bibliotheques; Fapshi utilise uniquement sa documentation officielle.
4. Les surfaces partagees appartiennent au jalon sequentiel indique; aucun lot ne les modifie en parallele.
5. Une tache n'est pas terminee par une UI, un schema ou un test mocke pris seul.
6. Un commit atomique, un rapport de preuve et un worktree propre sont obligatoires avant merge train.
7. Aucun push, merge ou deploiement sans demande/autorisation explicite de l'integrateur humain.

## Definition du go-live

Le gate `P-SEQ-09` est binaire. Tout P0 doit etre ferme. Une derogation P1 exceptionnelle exige des
compensations testees, les signatures produit/securite/legal/operations concernees, une expiration et
un plan de correction. Le gate refuse aussi la release si un des six jeux n'a pas son parcours reel,
si Fapshi ou les notifications retombent sur un fake, ou si restore/rollback/alerting/on-call ne sont
pas exerces.
