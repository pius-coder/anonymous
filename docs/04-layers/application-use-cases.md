# Application Use Cases Layer

Responsabilite: orchestrer cas d'usage.
Possede: preconditions, appels domaine, transactions applicatives.
Ne contient jamais: rendu UI ou code provider direct.
Entrees/sorties: Command Protobuf/adapters -> Result.
Contrats publics: use cases nommes.
Dependances autorisees: domain, ports persistence/notification/realtime.
Dependances interdites: composants React.
Donnees: DTO internes separes des entites DB.
Securite: verifier acteur et participation.
Ajout: partir de `05-workflows/feature-delivery.md`.
Modification: mettre a jour tests integration.
Suppression: verifier routes et workers consommateurs.
Tests: unitaires + integration ports.
Observabilite: success/failure par use case.
Validation: idempotence et erreurs documentees.

