# apps/api

## Objectif

API applicative HTTP pour les commandes et lectures non temps reel.

## Perimetre

- Handlers HTTP.
- Validation d'entrees.
- Appel des cas d'utilisation.
- Mapping erreurs applicatives vers reponses transport.
- Authentification et autorisation cote serveur quand elles seront decidees.

## Hors perimetre

- Regles de mini-jeu dans les handlers.
- Acces UI.
- Evenements live autoritaires de manche.
- Jobs longs ou planifies.

## Dependances autorisees

- `packages/shared` pour utilitaires transversaux.
- `packages/game-engine` pour domaine pur.
- `packages/db` via interfaces de persistance explicites.
- Contrats Protobuf lorsqu'ils seront crees.

## Dependances interdites

- Import de composants web.
- Exposition directe d'entites Prisma comme reponses reseau.
- DTO JSON manuels comme source de verite definitive.

## API publique du module

Les endpoints ne doivent exister qu'apres contrat documente.
La cible est Protobuf/Connect pour les APIs navigateur, sauf exception JSON documentee.

## Tests attendus

- Tests unitaires de mapping erreurs.
- Tests integration API + persistance.
- Tests permissions et validation d'entrees.

## Procedure d'extension

1. Lire le cas d'usage dans `docs/01-product/`.
2. Definir contrat Protobuf.
3. Ajouter handler mince.
4. Appeler un cas d'utilisation.
5. Tester les chemins succes, erreur et interdiction.
