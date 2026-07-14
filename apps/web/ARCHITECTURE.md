# apps/web

## Objectif

Interface utilisateur Next.js App Router pour les parcours publics, joueur, administration et observation.
Sur `v0.1`, seule la fondation existe ; aucun parcours legacy n'est conserve comme implementation cible.

## Perimetre

- Pages, layouts et etats UI.
- Composants de presentation.
- Appels vers API publique ou client temps reel.
- Adaptation responsive et accessibilite.

## Hors perimetre

- Regles competitives.
- Persistance directe.
- Validation serveur des scores.
- Orchestration de partie.

## Dependances autorisees

- Contrats publics generes ou types partages stables.
- API applicative exposee par `apps/api`.
- Client temps reel expose par `apps/game-server`.
- Helpers UI locaux.

## Dependances interdites

- Acces Prisma direct.
- Imports internes de `packages/db`.
- Regles de domaine enfouies dans les composants.
- Controle direct d'un client joueur depuis une vue admin.

## API publique du module

Les routes et layouts exposes par l'App Router constituent l'API visible.
Toute route nouvelle doit etre documentee dans `docs/02-ux/` et reliee a un cas d'usage valide.

## Tests attendus

- Tests de rendu pour les etats principaux.
- Tests E2E pour les parcours critiques quand ils existent.
- Tests d'accessibilite cibles pour formulaires, navigation et etats d'erreur.

## Procedure d'extension

1. Lire `docs/02-ux/` et `docs/04-layers/admin-web.md` ou `player-web.md`.
2. Verifier la documentation Next.js via `ctx7`.
3. Definir routes, layouts, etats loading/empty/error/reconnexion.
4. Consommer des contrats publics, jamais des details internes.
5. Ajouter tests et documentation de parcours.
