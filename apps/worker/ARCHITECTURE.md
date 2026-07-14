# apps/worker

## Objectif

Executer les traitements asynchrones et planifies qui ne doivent pas bloquer les APIs ou le temps reel.

## Perimetre

- Jobs BullMQ.
- Rappels et notifications planifiees.
- Reconciliation technique.
- Taches de maintenance documentees.

## Hors perimetre

- Demarrage automatique d'une partie active.
- Decisions d'arbitrage humain.
- UI ou handlers HTTP publics.

## Dependances autorisees

- `packages/db` pour lire/ecrire l'etat persistant necessaire.
- Gateways externes via modules dedies.
- `packages/shared` pour utilitaires transversaux.

## Dependances interdites

- Regles competitives non testees.
- Acces aux composants web.
- Suppression silencieuse de donnees.

## API publique du module

Noms de jobs, payloads versionnes, erreurs et resultats observables.

## Tests attendus

- Tests d'idempotence.
- Tests retries et erreurs.
- Tests integration avec persistance si le job modifie l'etat.

## Procedure d'extension

1. Documenter le job, son declencheur et son idempotence.
2. Definir payload et resultat.
3. Verifier BullMQ via `ctx7` si l'API est modifiee.
4. Ajouter tests et logs sans donnees sensibles.
