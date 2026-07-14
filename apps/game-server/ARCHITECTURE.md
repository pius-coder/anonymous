# apps/game-server

## Objectif

Serveur temps reel autoritaire pour les manches, connexions live, commandes joueur et evenements de supervision.

## Perimetre

- Sessions ou rooms temps reel.
- Validation des commandes joueur.
- Diffusion des evenements serveur.
- Reconnexion et presence live.
- Snapshots lecture seule autorises.

## Hors perimetre

- UI.
- Publication finale des scores sans validation applicative.
- Stockage de captures ou videos en `v0.1`.
- Choix automatique de demarrage par timer.

## Dependances autorisees

- `packages/game-engine` pour regles pures.
- `packages/db` pour persistance minimale requise.
- Contrats Protobuf temps reel quand disponibles.
- Redis/BullMQ uniquement pour presence, jobs ou diffusion justifiee.

## Dependances interdites

- Faire confiance aux scores envoyes par le client.
- Importer des composants web.
- Cacher des decisions produit dans des callbacks transport.

## API publique du module

Commandes joueur, evenements serveur, snapshots lecture seule et erreurs live.
Ces contrats doivent etre documentes avant implementation.

## Tests attendus

- Tests commandes/evenements.
- Tests reconnexion.
- Tests anti-triche minimaux par mini-jeu.
- Tests de non fuite d'etat prive pour roles caches.

## Procedure d'extension

1. Lire `docs/03-architecture/realtime-and-streaming.md`.
2. Verifier la documentation Colyseus via `ctx7` avant toute modification runtime.
3. Definir contrats et transitions.
4. Implementer une room ou runtime mince.
5. Tester concurrence, reconnexion et erreurs.
