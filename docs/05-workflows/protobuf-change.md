# Protobuf Change

1. Identifier package et version sous `packages/contracts/proto/`.
2. Ajouter message/champ sans casser (evolution additive).
3. Enum avec `*_UNSPECIFIED = 0`.
4. Reserver champs/noms supprimes (`reserved`).
5. Mettre a jour fixtures golden si message critique.
6. Documenter migration client/server et matrice transport si service/methode change.
7. Si exception REST : mettre a jour `packages/contracts/docs/rest-exceptions.md`.
8. Generer et valider (proprietaire contrats uniquement) :

```bash
pnpm --filter @session-jeu/contracts lint:proto
pnpm --filter @session-jeu/contracts generate
pnpm --filter @session-jeu/contracts test
pnpm --filter @session-jeu/contracts breaking
```

9. Les lots metier hors SEQ-01 / proprietaire contrats ne modifient pas `packages/contracts/**`.

