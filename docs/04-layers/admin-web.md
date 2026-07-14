# Admin Web Layer

Responsabilite: centre de controle admin et supervision.
Possede: vues admin, confirmations, etats d'erreur.
Ne contient jamais: logique de score ou autorisation finale.
Entrees/sorties: contrats API -> composants.
Contrats publics: routes admin.
Dependances autorisees: contracts clients, design system.
Dependances interdites: Prisma direct.
Donnees: vues admin.
Securite: jamais exposer actions sans role.
Ajout: definir acteur, route, CTA, empty/loading/error.
Modification: tests UI.
Suppression: migration route.
Tests: component/E2E RBAC.
Observabilite: action admin, sync stale.
Validation: separation observer/command.

