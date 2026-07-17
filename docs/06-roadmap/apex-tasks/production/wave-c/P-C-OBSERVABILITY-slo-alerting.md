# P-C-OBSERVABILITY - SLO, alertes et traces

## Mission autonome

Rendre le parcours commercial et les six jeux observables sans exposer de secrets : logs structures,
metriques, traces, dashboards, SLI/SLO, alertes actionnables et synthetic checks.

## Prerequis et lectures

- P-C-PLATFORM merge; P-SEQ-06 merge.
- Lire observability, privacy, runbooks, payment/live/worker et budgets performance.
- Context7/OpenTelemetry et docs officielles du backend monitoring choisi.

## Ownership

`packages/observability/**`, instrumentation module-local, collectors/exporters, dashboards, alert
rules, SLO, correlation et synthetics. La composition root appartient a P-SEQ-07. Pas de logique metier.

## Interdit

Token, email, role cache, vote, sequence, payload joueur ou credential en telemetry; cardinalite user ID;
alerte sans runbook/proprietaire; metrique seulement memoire-processus.

## Livrables production

- correlation request/party/round/runtime/job/payment par identifiants non sensibles;
- SLIs disponibilite/latence/error pour web/API/WS, Fapshi, queues, DB/Redis et six jeux;
- dashboards business techniques : checkout, admission, reconnect, tick, publication, DLQ;
- alertes burn-rate/SLO et seuils critiques avec routage/on-call;
- traces echantillonnees et redaction testee;
- synthetics register/catalogue, live, Fapshi controle et notification;
- retention/cout/acces aux donnees d'observabilite.

## Criteres d'acceptation

- pannes provider, DB, Redis, queue bloquee, tick degrade et no-webhook declenchent l'alerte attendue;
- chaque alerte indique impact, dashboard, runbook et proprietaire;
- une recherche automatique ne trouve aucun secret/role/information interdite;
- SLO et error budgets ont une fenetre et une decision de release;
- telemetry survit au multi-instance et au redemarrage.

## Tests et sortie

Fault injection staging, tests alert rules/redaction, verification dashboards/traces/synthetics et cout.
Gates lot, captures redigees et commit atomique.
