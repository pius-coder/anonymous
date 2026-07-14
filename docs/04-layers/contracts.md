# Contracts Layer

Responsabilite: Protobuf commandes, reponses, evenements, erreurs.
Possede: `.proto`, versionnement, compatibilite.
Ne contient jamais: schema Prisma ou logique metier cachee.
Entrees/sorties: messages Protobuf.
Contrats publics: packages `*.v1`.
Dependances autorisees: google well-known types.
Dependances interdites: imports DB.
Donnees: vues reseau.
Securite: champs sensibles separes par audience.
Ajout: nouveau message petit, enum `UNSPECIFIED = 0`.
Modification: ajouter champs, reserver suppressions.
Suppression: reserver numero et nom.
Tests: compatibilite binaire/golden fixtures.
Observabilite: correlation ids.
Validation: generation et lint proto futurs.

