# Realtime And Streaming

## Decision

Le streaming lecture seule est base sur snapshots et evenements. Aucun flux video v0.1.

## Transport

- APIs commande/requete: Connect + Protobuf pour compatibilite navigateur.
- Live bidirectionnel: WebSocket avec messages Protobuf ou Colyseus temporairement encapsule derriere des contrats de domaine.
- gRPC-Web bidirectionnel n'est pas retenu pour le live v0.1, car le support full-duplex depend d'HTTP/2 et n'est pas adapte a tous les navigateurs/proxies.

## Reconnexion

La reconnexion restaure une `StateView` par participation et ne rejoue pas les inputs.

