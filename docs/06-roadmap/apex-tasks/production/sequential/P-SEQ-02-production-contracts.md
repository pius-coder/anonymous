# P-SEQ-02 - Freeze des contrats production

## Mission autonome

Faire de Protobuf la frontiere complete des parcours production et des six jeux, sans payload gameplay
opaque ni DTO JSON parallele comme source de verite.

## Prerequis et lectures

- `P-SEQ-01` merge et six rulebooks approuves.
- Lire matrice RPC, transport exceptions, audience/no-leak, couches API/realtime et compatibilite.
- Context7 : Buf, ConnectRPC et Colyseus. Documentation officielle Fapshi pour les types provider;
  les secrets/header Fapshi ne deviennent jamais des champs clients.

## Ownership exclusif

`packages/contracts/proto/**`, Buf, fixtures/golden, generated output et registre des exceptions REST.

## Interdit

Schema Prisma, implementions API/web/runtime et lockfile hors besoin explicite de generation. Ne pas
reutiliser un numero supprime; enums avec `UNSPECIFIED = 0`; aucune information privee dans un message
d'audience publique.

## Livrables production

- 12 services complets et contrats des 18 methodes non montees/implementees;
- commandes, configs, etats publics/prives, evenements, erreurs et preuves types pour les six jeux;
- statuts Fapshi internes distincts des statuts wire provider, webhooks/inbox et reconciliation;
- contrats notifications, compliance, incident, support, export/retention et readiness utiles;
- enveloppe d'erreur stable, pagination, idempotency keys, versions et fixtures d'audience;
- table de transport finale : Connect, Colyseus/WS ou exception REST signee.

## Criteres d'acceptation

- lint/breaking/generation Buf deterministes et diff genere propre;
- aucun `bytes`/JSON gameplay sans schema/version/limite explicites;
- fixtures negatives prouvent l'absence de secret, role, choix cache et score provisoire;
- les six jeux peuvent evoluer par compatibilite additive;
- tous les lots suivants consomment le freeze sans modifier les Proto.

Tout besoin decouvert apres freeze retourne a cette fiche : modification compatible, nouveau hash de
descripteurs, breaking/golden relances et revalidation explicite de chaque lot descendant affecte.

## Tests et sortie

Buf lint/breaking/generate, golden round-trip, tests d'audience et compatibility gate. Executer les
gates du package contracts et racine. Commit atomique de freeze et hash des descripteurs.
