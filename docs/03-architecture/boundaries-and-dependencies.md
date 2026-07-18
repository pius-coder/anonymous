# Boundaries And Dependencies

## Dependances autorisees

- UI -> contrats generes -> transports.
- API -> application use cases -> persistence.
- Game server -> contrats events -> game-engine -> persistence minimale.
- Worker -> application use cases planifies.

## Dependances interdites

- UI -> Prisma.
- Mini-jeu -> paiement/wallet.
- Worker timer -> start automatique de partie active.
- Contrat Protobuf -> entite DB brute.
- Observateur -> commande joueur.

