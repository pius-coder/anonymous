# B-RESILIENCE - Durcissement multi-service

## Mission autonome

Apres SEQ-03, ajouter les preuves de resilience transversales sans changer les regles metier. Toute
defaillance fonctionnelle est renvoyee au lot proprietaire; cette tache possede les scenarios et outils.

## Ownership

Suites `tests/system/**` ou equivalent cree par SEQ-00, fixtures de charge non metier, assertions
observabilite et documentation des SLO/risques. Aucun fichier de production hors instrumentation validee.

## Interdit

Contrats, schema/migrations, use-cases, UI metier, room handlers, worker logic, packages racine/Turbo.

## Demarrage obligatoire

Lire AGENTS, rapports de tous les lots A, architecture observabilite/securite, acceptance gates et
strategie tests. Context7 : Playwright, Colyseus et outil de charge/observabilite effectivement utilise.

## AC

- Conflit deux admins, double submit, perte/reprise WS et stale client sont reproductibles.
- Retry worker, timeout provider et redemarrage ne doublent aucun effet.
- Tests no-leak inspectent les payloads, pas seulement l'UI visible.
- Logs contiennent correlation utile sans token/cookie/mot de passe.
- Echecs produisent artefacts et identifient le service responsable.

## Tests et sortie

Executer scenarios L4/L5 repetables, au moins deux runs pour les cas concurrents, puis typecheck/lint/build
et diff check. Livrer un commit atomique de tests/outillage et un rapport de risques, sans corriger en
cachette une feature.
