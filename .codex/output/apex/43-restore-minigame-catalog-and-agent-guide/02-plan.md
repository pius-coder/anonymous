# Step 02: Plan

## Implementation Plan

1. Extraire les titres depuis `HEAD:docs/catalogue-mini-jeux.md`.
2. Creer un catalogue `v0.1` list-only dans `docs/01-product/`.
3. Ajouter une analyse UML initiale versionnable.
4. Mettre a jour `docs/README.md` et le workflow d'integration mini-jeu.
5. Refondre `AGENTS.md` pour la fondation actuelle.
6. Ajouter une documentation locale par workspace.
7. Executer les validations du monorepo.

## Files to Modify

- `AGENTS.md`
- `docs/README.md`
- `docs/01-product/minigame-catalog.md`
- `docs/03-architecture/uml.md`
- `docs/05-workflows/minigame-integration.md`
- `apps/*/ARCHITECTURE.md`
- `packages/*/ARCHITECTURE.md`

## Tests to Run

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
