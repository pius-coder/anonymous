# packages/contracts

## Objectif

Source de verite des contrats reseau Protobuf. Definit les messages, enums et services echanges entre les couches transport et application.

## Perimetre

- Fichiers `.proto` organises par domaine et version.
- Conventions : `syntax = "proto3"`, enums avec `UNSPECIFIED = 0`, champs reserves.
- Separation commandes, requetes, evenements et erreurs.
- Messages reseau independants du schema Prisma.

## Hors perimetre

- Schema Prisma ou logique metier cachee.
- Imports DB ou framework.
- Generation de code (deferree a une feature dediee future).

## Dependances autorisees

- `google/protobuf/timestamp.proto`
- `google/protobuf/wrappers.proto`
- Autres fichiers `.proto` du package.

## Dependances interdites

- Imports TypeScript vers apps ou packages metier.
- Bibliotheques externes.

## API publique du module

Le module exporte la liste des chemins proto et la version des contrats. Les types reels sont produits par generation future.

## Tests attendus

- Golden fixtures pour messages critiques.
- Tests de non exposition de champs sensibles par audience.
- Tests de conformite des conventions (UNSPECIFIED=0, champs reserves).
