# Protobuf Contract Strategy

## Sources

- Context7 `/protocolbuffers/protocolbuffers.github.io`
- Context7 `/connectrpc/connect-es`

## Organisation cible

```text
packages/contracts/proto/session/v1/*.proto
packages/contracts/proto/lobby/v1/*.proto
packages/contracts/proto/round/v1/*.proto
packages/contracts/proto/minigame/v1/*.proto
packages/contracts/proto/admin/v1/*.proto
packages/contracts/proto/notification/v1/*.proto
packages/contracts/proto/common/v1/*.proto
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

## Transport

- Connect pour requetes/reponses navigateur et Node.
- WebSocket pour evenements live bidirectionnels, avec payloads Protobuf versionnes.
- JSON seulement pour webhooks providers ou contraintes externes imposees.

## Generation

Pas de generation pendant cette mission. La future generation doit produire:

- types TS client web;
- handlers API;
- validateurs contractuels;
- fixtures de tests compatibilite.

