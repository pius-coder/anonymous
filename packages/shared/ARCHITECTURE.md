# packages/shared

## Objectif

Regrouper uniquement les utilitaires transversaux stables et non metier.

## Perimetre

- Types generiques.
- Resultats types.
- Erreurs techniques communes.
- Helpers de test transversaux.
- Constantes vraiment globales.

## Hors perimetre

- Regles de partie.
- Logique de mini-jeu.
- Acces DB.
- Clients reseau concrets.
- Fourre-tout de fonctions non reliees.

## Dependances autorisees

- TypeScript standard.
- Bibliotheques sans effet de bord si leur usage est documente et justifie.

## Dependances interdites

- Next.js, Hono, Colyseus, Prisma.
- Dependances cycliques vers apps ou packages metier.
- Donnees sensibles ou secrets.

## API publique du module

Exports explicites depuis `src/index.ts`.
Tout ajout doit etre utilise par au moins deux modules ou justifier son caractere transversal.

## Tests attendus

- Tests unitaires des utilitaires.
- Tests de compatibilite pour les types ou erreurs partages.

## Procedure d'extension

1. Verifier que le besoin n'appartient pas a un domaine.
2. Verifier qu'il est reutilise par plusieurs modules.
3. Ajouter une API petite et testee.
4. Documenter l'usage et les limites.
