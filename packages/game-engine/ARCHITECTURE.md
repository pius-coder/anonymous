# packages/game-engine

## Objectif

Contenir le domaine pur du jeu : regles, etats, transitions et calculs testables.

## Perimetre

- Etats de partie, manche et mini-jeu.
- Regles de scoring provisoire.
- Validation de commandes abstraites.
- Invariants de domaine.

## Hors perimetre

- UI.
- Hono, Next.js, Colyseus ou Prisma.
- Appels reseau.
- Effets de bord.

## Dependances autorisees

- TypeScript standard.
- Types de domaine locaux.
- Eventuels utilitaires purs de `packages/shared` s'ils ne tirent aucun framework.

## Dependances interdites

- Acces DB.
- Date systeme non injectee dans les regles sensibles.
- Aleatoire non injecte pour les tests.
- Logique specifique transport.

## API publique du module

Exports de fonctions pures, types de domaine et erreurs de domaine.
Les details internes ne doivent pas etre importes par les apps.

## Tests attendus

- Tests unitaires exhaustifs des invariants.
- Tests cas limites et erreurs.
- Tests anti-triche pour les regles competitives.

## Procedure d'extension

1. Documenter la regle metier.
2. Ajouter types et fonctions pures.
3. Ajouter tests avant integration transport.
4. Exposer uniquement l'API publique necessaire.
