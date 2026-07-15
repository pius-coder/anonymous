# Acceptance Gates

- Gate produit: vocabulaire respecte.
- Gate lifecycle: aucune transition timer vers partie active.
- Gate contrat: Protobuf versionne.
- Gate securite: RBAC et participation obligatoires.
- Gate realtime: reconnect teste.
- Gate publication: scores visibles seulement apres publication.
- Gate suppression: manifeste valide.
- Gate qualite: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.
- Gate UI: theme Noya, shells par audience, routes et etats issus des user stories.
- Gate viewport: aucun scroll document; scroll uniquement dans les listes, tables, sheets ou panneaux.
- Gate composants: aucune primitive generique locale si une primitive RetroUI Base existe.
