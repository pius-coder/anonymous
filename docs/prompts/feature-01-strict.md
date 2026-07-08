# Prompt strict - Feature 01

Utilise ce prompt pour le prochain agent. Il est volontairement prescriptif pour eviter les interpretations.

```text
Tu dois corriger et finaliser la Feature 01 : Acquisition, landing et catalogue public.

Avant toute modification :
1. Lire entierement `/home/afreeserv/anonymous/AGENTS.md`.
2. Lire entierement :
   - `/home/afreeserv/anonymous/docs/plan/01-acquisition-catalogue-public.md`
   - `/home/afreeserv/anonymous/docs/prd/features/01-acquisition-catalogue-public.md`
   - `/home/afreeserv/anonymous/docs/BRAINSTORMING.md`
   - `/home/afreeserv/anonymous/docs/PRD_PHASE_1.md`
   - `/home/afreeserv/anonymous/docs/PRD_PHASE_2.md`
   - `/home/afreeserv/anonymous/docs/cahier_des_charges_technique_plateforme_sessions_jeu.md`
   - `/home/afreeserv/anonymous/docs/deep-research-report.md`
3. Inspecter le repo avec :
   - `pwd`
   - `git status --short`
   - `cat package.json`
   - `rg --files`
   - `pnpm list --depth 1`
4. Executer le gate documentaire Context7 :
   - Next.js App Router, metadata, server data loading, build sans reseau externe.
   - Hono routing, zValidator, route grouping, redirects.
   - Prisma schema, migrations, filtered relation count, pagination.

Tu dois corriger les problemes suivants si presents :
1. Si `schema.prisma` contient `visibility`, une migration doit creer l enum/colonne `visibility`. Il est interdit de laisser une migration qui cree seulement `isPublic`.
2. `PUBLIC` est listable.
3. `UNLISTED` est absent du catalogue mais accessible par detail/lien direct autorise.
4. `PRIVATE` est inaccessible via catalogue, detail public et lien partageable generique.
5. Un lien partageable ne doit pas utiliser simplement `GameSession.code` si cela permet d atteindre `PRIVATE`.
6. `placesRemaining` est calcule cote serveur.
7. Le CTA detail ne doit pas etre `href="#"`.
8. L UI ne doit pas afficher `Prize pool`.
9. L UI ne doit pas contenir `pari`, `mise`, `jackpot`, `gain garanti`, ni promesse financiere comme `les meilleurs joueurs remportent les gains`.
10. Le layout ne doit pas garder `Create Next App`.
11. Le build ne doit pas dependre de Google Fonts si l environnement n a pas acces reseau.
12. Les fautes visibles doivent etre corrigees : `auditablesv`, `auditableset`, `progressionnez`.

Tests obligatoires a ajouter ou corriger :
1. Unit test `placesRemaining`.
2. Integration API : PUBLIC visible, UNLISTED absent du catalogue, PRIVATE absent/refuse.
3. Integration API detail : PUBLIC OK, UNLISTED OK, PRIVATE refuse.
4. Integration API share : token invalide 404, token PRIVATE refuse, session annulee/fermee geree.
5. Test migration/schema : DB migree depuis zero possede `visibility`.
6. Test contenu UI : termes interdits et formulations de promesse financiere absents.
7. Test UI ou E2E : landing -> catalogue -> detail -> CTA.

Commandes finales obligatoires :
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test -- --force`
- `pnpm build`
- `pnpm format:check`

Tu ne peux pas declarer la feature terminee si une de ces commandes echoue.

Reponse finale obligatoire :
- docs locales lues ;
- library IDs Context7 utilises ;
- fichiers modifies ;
- migrations creees/modifiees ;
- tests ajoutes ;
- commandes executees et resultats ;
- risques restants.
```

