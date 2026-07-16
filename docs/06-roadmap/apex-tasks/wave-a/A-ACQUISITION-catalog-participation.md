# A-ACQUISITION - Catalogue, detail et participation reels

## Mission autonome

Apres SEQ-00/01/02, remplacer les mocks du catalogue/detail/participation par les contrats et use-cases
reels. Le joueur peut trouver une partie publiee, voir ses informations autorisees et s'inscrire une fois.

## Ownership

Use-cases party/participation, implementations Session/Participation RPC, adaptateurs web de ces deux
domaines, routes `/parties`, `/parties/[partyCode]` et `/participation`, composants directement associes.

## Interdit

Contrats/codegen, Prisma/migrations/seed, tooling racine, routeur central,
`apps/web/src/services/rpcServices.ts`, payment, lobby, room, round, waiting/results et admin scoring. Ne
pas modifier les cinq fichiers mock pour les besoins d'autres lots; retirer seulement les imports de tes
surfaces et creer au besoin des adaptateurs Session/Participation propres au domaine.

## Demarrage obligatoire

Lire AGENTS, gap analysis, sprints 05/06, user stories UI, contrats Session/Participation, REST existant et
legacy acquisition. Context7 : ConnectRPC, TanStack Query et Next.js.

## AC

- Catalogue public filtre les brouillons/champs admin et gere loading/empty/error/stale.
- Detail inconnu, non publie et stale ont des etats actionnables.
- Register/cancel sont idempotents, verifient capacite/permission cote serveur et invalident les queries.
- Double clic ne cree pas deux participations; UI reflete le statut serveur.
- Aucun client ne decide paiement, readiness ou admission live.

## Tests et sortie

L3 capacite/concurrence, L4 Session/Participation avec RBAC/erreurs, L5 catalogue->detail->register/cancel.
Executer validations scope + integration/E2E/typecheck/lint/build. Commit atomique, rapport AC -> test;
laisser le montage central a SEQ-03.

## Livraison (worktree `apex/a-acquisition`)

Exports a monter par SEQ-03 :

- `apps/api/src/rpc/session-service.ts` → `sessionService`
- `apps/api/src/rpc/participation-service.ts` → `participationService`

Adaptateurs web (hors `rpcServices.ts`) :

- `apps/web/src/services/session/sessionAdapter.ts`
- `apps/web/src/services/participation/participationAdapter.ts`

Cancel participation reste REST (`POST /v1/parties/:code/cancel`) tant qu'aucun RPC Cancel n'est
contracte. Le catalogue/detail public filtrent brouillons et champs admin via use-cases
`listPublicParties` / `getPublicParty`.
