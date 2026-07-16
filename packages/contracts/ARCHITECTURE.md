# packages/contracts

## Objectif

Source de vérité des contrats réseau Protobuf. Définit messages, enums et services échangés entre
les couches transport et application. Baseline figée par SEQ-01.

## Périmètre

- Fichiers `.proto` organisés par domaine et version sous `proto/`.
- Conventions : `syntax = "proto3"`, enums avec `*_UNSPECIFIED = 0`, champs réservés si retrait.
- Séparation commandes, requêtes, événements et erreurs.
- Messages réseau indépendants du schéma Prisma.
- Génération déterministe TypeScript (Protobuf-ES v2 / `protoc-gen-es`).
- Fixtures golden JSON et tests audience / conventions.
- Matrice transport : `docs/service-transport-matrix.md`.
- Exceptions REST : `docs/rest-exceptions.md`.

## Hors périmètre

- Schéma Prisma ou logique métier cachée.
- Montage d'endpoints Hono / enregistrement Connect (apps/api).
- Runtime Colyseus (apps/game-server).
- `protoc-gen-connect-es` (Connect ES v2 consomme les descriptors Protobuf-ES).

## Dépendances autorisées

- `google/protobuf/*` well-known types si besoin.
- Autres fichiers `.proto` du package.
- Runtime `@bufbuild/protobuf` pour le code généré.

## Dépendances interdites

- Imports TypeScript vers apps ou packages métier.
- `@connectrpc/*` dans ce package (installé uniquement dans les apps consommatrices).

## API publique du module

- `CONTRACTS_VERSION`, `getContractsFoundation()`
- Namespaces générés : `IdentityV1`, `SessionV1`, … `ComplianceV1`, `CommonV1`, `CommonErrorsV1`
- `FROZEN_SERVICES`, `getServiceMatrixSummary()`, audience helpers (`assertAudienceSafe`, …)
- Export map package : `"."` → `dist/index.js`

## Génération

```bash
pnpm --filter @session-jeu/contracts generate   # buf generate
pnpm --filter @session-jeu/contracts lint:proto # buf lint
pnpm --filter @session-jeu/contracts breaking   # buf breaking vs HEAD
```

Sortie : `src/gen/**/*_pb.ts` (option `import_extension=js`).
Build : `pnpm generate && tsc` → `dist/`.

## Tests attendus

- Golden fixtures pour messages critiques.
- Projections joueur/observer/admin sans champs interdits.
- Conventions UNSPECIFIED=0, proto3, package.
- Inventaire services/méthodes aligné sur la matrice freeze.

## Freeze

Les lots métier ne modifient pas ce package. Toute évolution passe par le workflow
`docs/05-workflows/protobuf-change.md` et le propriétaire contrats.
