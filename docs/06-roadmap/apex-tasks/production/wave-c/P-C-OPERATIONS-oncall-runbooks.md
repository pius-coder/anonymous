# P-C-OPERATIONS - Astreinte, incidents et exploitation

## Mission autonome

Rendre la plateforme exploitable par des humains : ownership, astreinte, severites, runbooks, support,
communication, changement, reconciliation quotidienne et exercices d'incident.

## Prerequis et lectures

- P-C-PLATFORM/DATA/SECURITY/OBSERVABILITY/SCALE/LEGAL/QA merges.
- Lire observability, support/incidents, finance, security, release et risques ouverts.
- Documentation officielle des outils incident/on-call retenus.

## Ownership

`docs/operations/**`, rotations, matrices RACI/escalade, templates incident/status/postmortem, release
checklist, exercices et automatisation ops isolee. La composition release appartient a P-SEQ-07;
aucun code metier.

## Interdit

Contact personnel non consenti dans Git, runbook non teste, action DB manuelle sans garde/audit,
dependance a une seule personne, incident clos sans reconciliation/impact.

## Livrables production

- proprietaire/service, on-call, escalade Fapshi/provider/hebergeur et niveaux SEV;
- runbooks paiement incoherent, webhook perdu, queue/DLQ, DB/Redis, live rooms, no-leak, secret compromis;
- checklist ouverture/fermeture de partie, finance quotidienne et support joueur;
- gestion changement, maintenance, rollback, status communication et postmortem sans blame;
- acces least privilege, break-glass, journal et revue periodique;
- exercices table-top et techniques avec temps detection/ack/mitigation.

## Criteres d'acceptation

- toute alerte P0/P1 a un humain, backup et runbook joignables;
- un operateur non auteur execute les procedures critiques avec succes;
- exercice paiement/live/DB mesure les temps dans les objectifs;
- passation, contacts providers et fenetre de release sont verifies;
- actions break-glass et manuelles sont auditees puis revoquees.

## Tests et sortie

Table-top puis game day staging : Fapshi degrade, queue bloquee, room crash, restore et rollback. Rapport
d'exercice, ecarts proprietaires, gates docs et commit atomique.
