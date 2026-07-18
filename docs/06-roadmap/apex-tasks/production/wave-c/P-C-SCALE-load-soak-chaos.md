# P-C-SCALE - Charge, soak, concurrence et recovery

## Mission autonome

Mesurer et signer la capacite initiale de la plateforme et des six jeux, puis prouver le comportement
sous saturation, latence, deconnexion et panne partielle.

## Prerequis et lectures

- P-C-OBSERVABILITY et P-C-QA merges; environnement staging representatif disponible.
- Lire resilience, realtime, worker, payment, six rulebooks et topologie.
- Context7 outils de charge et Colyseus; docs officielles DB/Redis/provider pour limites.

## Ownership

`tests/load/**`, modeles de trafic, scripts load/soak/fault, datasets, dashboards de capacite, budgets
et rapport. La composition pipeline appartient a P-SEQ-07; les optimisations code retournent aux lots.

## Interdit

Charge sur Fapshi live sans accord, donnees personnelles, seuil arbitraire, test WebSocket sans gameplay,
succes moyen masquant p95/p99 ou chaos production non autorise.

## Livrables production

- modele joueurs/parties/rooms/checkout/jobs et pics attendus;
- tests ramp/steady/spike/soak pour API, WS, six jeux, worker, DB/Redis;
- concurrence derniere place, webhook/reconcile, multi-admin, publication et notification;
- lag/drop/reconnect, kill instance, Redis/DB/provider degrade et backpressure;
- seuils p50/p95/p99, tick/patch, CPU/RAM/connexions/queue et capacity margin;
- autoscaling/limites/degradation controlee et plan capacite/cout.

## Criteres d'acceptation

- chaque SLO tient a la charge signee avec marge decidee;
- saturation refuse/retarde proprement sans corruption, double paiement ou fuite;
- `danger-sweep` respecte tick/patch budgets au pire cas approuve;
- recovery converge apres panne sans storm de reconnect/retry;
- rapport reproductible relie commit, config, dataset et dashboards.

## Tests et sortie

Ramp, spike, soak, fault injection et recovery en staging isole. Publier seuils, goulets et capacite GO;
commit scripts/rapport atomique, aucune correction hors ownership.
