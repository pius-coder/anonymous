# AGENTS.md

Regles simples pour tout agent qui travaille dans ce repo.

## Regle principale

Ne jamais implementer au feeling. Toujours verifier avec les fichiers du projet, la documentation actuelle et les commandes CLI avant de modifier le code.

Si une instruction est ambigue, ne pas choisir l option la plus rapide. L agent doit transformer l ambiguite en decision explicite, documentee dans la reponse, puis verifier cette decision avec les PRD, le plan et les tests.

## Workflow obligatoire

1. Lire la fiche de plan dans `docs/plan/`.
2. Lire la fiche PRD correspondante dans `docs/prd/features/`.
3. Lire les documents source demandes par la feature :
   - `docs/BRAINSTORMING.md`
   - `docs/PRD_PHASE_1.md`
   - `docs/PRD_PHASE_2.md`
   - `docs/cahier_des_charges_technique_plateforme_sessions_jeu.md`
   - `docs/deep-research-report.md`
   - `docs/catalogue-mini-jeux.md` si gameplay ou mini-jeux sont touches.
4. Inspecter le repo avec la CLI avant de coder :
   - `pwd`
   - `git status --short`
   - `find` ou `rg --files`
   - `cat package.json`
   - `pnpm list` si une dependance est concernee.
5. Pour toute librairie, framework, SDK, API, CLI ou service cloud, utiliser Context7 avant implementation :
   - `npx ctx7@latest library <Nom officiel> "<question complete>"`
   - `npx ctx7@latest docs <libraryId> "<question complete>"`
6. Noter dans la reponse :
   - docs locales lues ;
   - library IDs Context7 utilises ;
   - versions/packages verifies ;
   - commandes CLI executees ;
   - tests executes et resultat.
7. Implementer seulement apres ces verifications.
8. Lancer les validations CLI avant de terminer.

## Workflow autonome APEX obligatoire

Pour toute implementation de feature ou correction importante, utiliser APEX en mode autonome complet :

- Flags par defaut obligatoires : `-a -b -pr -s -t -x`.
- Ne pas utiliser `-e` / economy mode par defaut. L economy mode est interdit sauf demande explicite du user.
- Toujours travailler sur une branche non-main. Ne jamais commit directement sur `main`.
- Toujours utiliser `gh` pour le cycle PR : creation, verification, checks, mergeabilite et merge.
- Ne pas attendre que le user dise `continue` si la suite est claire dans `docs/plan/` et `docs/prd/features/`.

Rythme strict a repeter feature par feature :

1. Depuis `main`, executer `git pull --ff-only`.
2. Creer une branche dediee avec APEX `-b`.
3. Lire les docs locales requises et les docs actuelles via `ctx7`, `curl` ou `fetch`.
4. Implementer uniquement la feature courante dans le scope de sa fiche.
5. Ajouter ou mettre a jour les tests obligatoires de la fiche.
6. Executer et faire passer au minimum :
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm test`
   - `pnpm build`
7. Corriger en boucle jusqu a ce que toutes les validations passent.
8. Commit et push la branche.
9. Ouvrir une PR avec `gh pr create`.
10. Verifier la PR avec `gh pr view`, `gh pr checks` et les informations de mergeabilite.
11. Si la PR est mergeable et que les checks sont verts, merger avec `gh pr merge`.
12. Revenir sur `main`, executer `git pull --ff-only`, puis passer a la feature suivante.

Ne jamais devaluer ou jeter le travail existant :

- Ne pas supprimer ou reecrire une implementation valide pour aller plus vite.
- Ne pas ignorer une feature deja partiellement implementee ; l analyser, la stabiliser et la completer.
- Ne pas contourner les tests, les migrations ou les checks PR.
- Si un blocage externe empeche le merge ou la validation, le documenter clairement dans la reponse et dans les notes APEX.

Source de verite :

- Les fiches `docs/plan/` et `docs/prd/features/` sont prioritaires.
- Les documents source dans `docs/` fixent les decisions produit et metier.
- La documentation externe doit venir de `ctx7` ou de sources officielles recuperees par `curl` / `fetch`.
- Ne pas utiliser des suppositions ou souvenirs de librairies comme source de verite.

## Interdictions

- Ne pas coder a partir de memoire.
- Ne pas supposer une API de librairie sans documentation actuelle.
- Ne pas installer une dependance sans verifier sa version, ses peer dependencies et son usage officiel.
- Ne pas ignorer une erreur de build, typecheck, lint ou test.
- Ne pas declarer une feature terminee si les tests obligatoires de la fiche `docs/plan/` ne sont pas valides.
- Ne pas declarer une feature terminee si `pnpm typecheck`, `pnpm lint`, `pnpm test` et `pnpm build` ne passent pas.
- Ne pas toucher aux features hors scope sauf dependance minimale documentee.
- Ne pas exposer secrets, cles API, mots de passe ou donnees sensibles.
- Ne pas remplacer un concept metier par un raccourci technique. Exemple : ne pas remplacer `PUBLIC/UNLISTED/PRIVATE` par un simple booleen si le PRD demande trois etats.
- Ne pas ajouter un champ Prisma sans migration correspondante.
- Ne pas modifier `schema.prisma` sans verifier que la migration SQL ou la migration Prisma existe et se lance depuis une DB vide.

## Regles anti-ambiguite

Quand une feature touche l UI, l agent doit definir explicitement :

- les pages exactes ;
- les routes exactes ;
- les textes interdits ;
- les CTA exacts ;
- les etats vides/erreur/loading ;
- le comportement mobile minimal ;
- les tests UI/E2E associes.

Quand une feature touche la DB, l agent doit definir explicitement :

- les modeles modifies ;
- les enums modifies ;
- la migration attendue ;
- les seeds modifies ;
- les tests DB ou integration qui prouvent que la migration fonctionne.

Quand une feature touche API + UI, l agent doit verifier que :

- le contrat de reponse API correspond aux types utilises par l UI ;
- les erreurs API sont gerees cote UI ;
- les tests couvrent au moins un parcours complet.

## Regles CLI

Toujours utiliser la CLI pour verifier l etat reel du projet.

Commandes recommandees :

- Recherche fichiers : `rg --files`
- Recherche texte : `rg "<terme>"`
- Etat git : `git status --short`
- Dependances : `pnpm list`, `cat package.json`
- Validation : `pnpm typecheck`, `pnpm lint`, `pnpm test`
- Build si necessaire : `pnpm build`

Si une commande n existe pas, lire `package.json` et utiliser le script reel.

## Regles documentation

Context7 est obligatoire pour :

- Next.js
- Hono
- Prisma
- PostgreSQL
- Colyseus
- BullMQ
- Redis
- Fapshi
- WhatsApp / Meta API
- Docker Compose
- toute autre librairie ou service externe.

Si Context7 echoue par quota, stopper et demander login ou `CONTEXT7_API_KEY`.

Si Context7 ne couvre pas le provider, lire uniquement la documentation officielle.

## Regle Colyseus

Avant toute modification dans `apps/game-server` :

1. Lire la documentation Colyseus actuelle via Context7.
2. Verifier la version installee de `colyseus` et des packages `@colyseus/*`.
3. Confirmer les imports officiels pour cette version.
4. Ne pas utiliser une ancienne API comme `new Server(...)` sans preuve documentaire.
5. Verifier `defineServer`, `defineRoom`, `Room`, `Client`, `Schema`, `type`, transport, presence Redis et contraintes TypeScript avant de coder.

## Tests obligatoires

Chaque feature doit valider les criteres de tests de sa fiche dans `docs/plan/`.

Minimum obligatoire :

- Tests unitaires pour la logique metier.
- Tests integration pour API + DB.
- Tests securite pour auth/RBAC/donnees sensibles.
- Tests E2E pour parcours utilisateur visible.
- Tests concurrence/idempotence pour paiement, wallet, capacite, resultats ou jobs.

Si un test est impossible maintenant, creer une tache de rattrapage et expliquer pourquoi.

## Definition of Done agent

Une tache est terminee seulement si :

- les documents requis ont ete lus ;
- les docs actuelles des librairies ont ete consultees ;
- le code est implemente dans le scope ;
- les tests obligatoires sont ajoutes ou mis a jour ;
- les commandes `pnpm typecheck`, `pnpm lint`, `pnpm test` et `pnpm build` passent ;
- les migrations DB sont coherentes avec `schema.prisma` ;
- aucun test obligatoire de la fiche `docs/plan/` n est manquant ;
- la reponse finale liste fichiers modifies, commandes executees et resultats.
