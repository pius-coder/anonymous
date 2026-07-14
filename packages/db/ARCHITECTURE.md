# packages/db

## Objectif

Centraliser le modele de persistance, Prisma, migrations et acces donnees.

## Perimetre

- `schema.prisma`.
- Migrations.
- Client de persistance.
- Repositories ou adaptateurs de donnees.
- Seeds techniques documentes.

## Hors perimetre

- Contrats reseau.
- Regles metier essentielles.
- UI.
- Orchestration temps reel.

## Dependances autorisees

- Prisma.
- Types internes de persistance.
- Interfaces de repositories definies par les cas d'utilisation si necessaire.

## Dependances interdites

- Exposer directement les entites Prisma aux clients.
- Modifier `schema.prisma` sans migration correspondante.
- Melanger seed demo et donnees requises sans documentation.

## API publique du module

Client ou repositories explicitement exportes.
Toute evolution du schema doit etre reliee a une decision et a un test de migration.

## Tests attendus

- Tests d'integration repositories.
- Tests migration depuis DB vide quand une migration existe.
- Tests contraintes d'unicite et integrite.

## Procedure d'extension

1. Lire `docs/05-workflows/database-change.md`.
2. Definir impact domaine et contrat.
3. Modifier schema et migration ensemble.
4. Ajouter tests DB.
5. Verifier que les contrats reseau ne copient pas les entites DB.
