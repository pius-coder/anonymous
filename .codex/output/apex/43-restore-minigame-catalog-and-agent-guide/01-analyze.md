# Step 01: Analyze

## Repository Context

- Branche active : `v0.1`.
- Le nettoyage precedent a conserve le socle technique et supprime le legacy metier.
- `AGENTS.md` etait encore aligne sur les anciens dossiers `docs/plan/` et `docs/prd/features/`, supprimes du socle `v0.1`.
- L'ancien catalogue existe dans l'historique Git : `HEAD:docs/catalogue-mini-jeux.md`.

## User Requirements

- Ramener la liste de tous les mini-jeux.
- Continuer la refonte architecturale sans inventer de besoins fonctionnels.
- Garder en memoire le modele d'administration initial : preparation, lancement manuel, supervision lecture seule, verification et publication explicite.

## Existing Code Assessment

- Les workspaces restants sont `apps/web`, `apps/api`, `apps/game-server`, `apps/worker`, `apps/whatsapp-gateway`, `packages/game-engine`, `packages/db`, `packages/shared`.
- Les routes et composants legacy mini-jeux ont ete supprimes comme implementation.
- Le catalogue doit donc revenir comme document produit, pas comme code runtime.

## Acceptance Criteria

- Catalogue restaure dans `docs/01-product/minigame-catalog.md`.
- `AGENTS.md` remplace par un guide `v0.1`.
- Documentation locale ajoutee aux modules principaux.
- Validation CLI complete avant fin.
