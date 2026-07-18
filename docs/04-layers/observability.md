# Observability Layer

Responsabilite: traces, logs, metriques, audits.
Possede: conventions nommage et correlation.
Ne contient jamais: donnees sensibles brutes.
Entrees/sorties: events techniques -> dashboards/alerts.
Contrats publics: noms metriques.
Dependances autorisees: toutes couches en emission.
Dependances interdites: decisions metier dans dashboards.
Donnees: correlationId, actorId pseudonymise si necessaire.
Securite: redaction secrets.
Ajout: definir metrique avec seuil.
Modification: compatibilite dashboards.
Suppression: periode de deprecation.
Tests: logs sans secrets.
Observabilite: elle-meme auditee par coverage.
Validation: chaque use case critique emet succes/echec.

