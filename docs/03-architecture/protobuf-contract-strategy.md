# Protobuf And ConnectRPC Contract Strategy

## Sources Context7

- `/connectrpc/connect-es`: clients TypeScript, transports web/node, migration Connect ES v2.
- `/protocolbuffers/protocolbuffers.github.io`: conventions proto3, enums zero-value, champs et noms reserves.

## Position cible

Les contrats reseau cible sont Protobuf. ConnectRPC sert aux commandes et lectures HTTP navigateur/Node.
Le live bidirectionnel reste porte par Colyseus/WebSocket ou transport equivalent, avec payloads versionnes.
ConnectRPC ne remplace donc pas le game-server realtime.

`@connectrpc/*` n'est pas encore installe. Aucun code ne doit supposer la generation disponible avant le
sprint tooling contrats.

Connect ES v2 utilise les descriptors generes par Protobuf-ES v2 via `protoc-gen-es`. Ne pas ajouter
`protoc-gen-connect-es`, qui appartient a l'ancien modele de generation.

## Organisation cible

```text
packages/contracts/proto/common/v1/*.proto
packages/contracts/proto/identity/v1/*.proto
packages/contracts/proto/session/v1/*.proto
packages/contracts/proto/participation/v1/*.proto
packages/contracts/proto/preparation/v1/*.proto
packages/contracts/proto/realtime/v1/*.proto
packages/contracts/proto/round/v1/*.proto
packages/contracts/proto/minigame/v1/*.proto
packages/contracts/proto/scoring/v1/*.proto
packages/contracts/proto/admin/v1/*.proto
packages/contracts/proto/notification/v1/*.proto
packages/contracts/proto/payment/v1/*.proto
```

## Regles

- `syntax = "proto3"`.
- Une valeur `*_UNSPECIFIED = 0` dans chaque enum.
- Ne jamais reutiliser un numero de champ supprime.
- Reserver les numeros et noms retires.
- Ajouter des champs est la voie normale d'evolution.
- Eviter les messages geants.
- Separer commandes, reponses, evenements et erreurs.
- Ne pas exposer les entites Prisma comme contrats reseau.

## Transport cible futur

- Navigateur: `@connectrpc/connect` + `@connectrpc/connect-web`.
- Serveur/client Node: `@connectrpc/connect` + `@connectrpc/connect-node`.
- API HTTP: services ConnectRPC pour commands/queries applicatives.
- Live bidirectionnel: WebSocket/Colyseus pour events live, snapshots et commandes temps reel.
- JSON seulement pour webhooks providers, contraintes externes imposees, ou adaptateurs Hono transitoires
  explicitement documentes.

## Generation

Pas de generation hors sprint tooling. La future generation doit produire:

- types TS client web;
- descriptors Protobuf-ES v2;
- services ConnectRPC;
- clients web;
- validateurs contractuels;
- fixtures de tests compatibilite.

Reference Context7: `/connectrpc/connect-es` confirme que Connect ES v2 s'appuie sur les descriptors
generes par Protobuf-ES v2 avec `protoc-gen-es`, et que le plugin `protoc-gen-connect-es` doit etre retire
du modele de generation v2.

## Gate endpoint

Aucun endpoint Hono public nouveau ne doit etre ajoute sans:

1. message `.proto` identifie;
2. service ConnectRPC futur ou exception documentee;
3. erreur publique stable;
4. test de contrat ou fixture golden;
5. audience et champs sensibles verifies.
6. validation serveur des entrees externes;
7. auth/RBAC serveur pour les routes non publiques et toute action sensible;
8. audit ou log securite sans secret pour les actions sensibles;
9. test de refus pour auth/RBAC/validation, et rate limit lorsque le risque l'exige.

Exception transitoire: avant le cablage ConnectRPC, un endpoint Hono mince peut adapter un message `.proto`
si l'exception est documentee dans la fiche sprint, que la fixture golden existe, et que la route ne devient
pas la source de verite du contrat.
