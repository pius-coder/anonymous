# AGENTS.md

Guide principal pour tout agent qui travaille dans ce depot.

## Contexte du projet

Le projet reconstruit une plateforme de parties multijoueurs composees de manches et de mini-jeux.
La branche de reconstruction est `v0.1`.

La fondation actuelle est volontairement nettoyee, mais le projet n'est pas un MVP jetable.
Le `HEAD` legacy contenait une base ambitieuse : auth, paiement, wallet, sessions, live temps reel,
mini-jeux, resultats, admin, audit, support, notifications et anti-cheat.

Aucune fonctionnalite ne doit etre supposee presente dans le code courant sans preuve, mais aucune
decision legacy ne doit etre ignoree sans lire l'audit HEAD.

## Objectifs

-Toujours demadner a tes agents de faie des analyse officiel avec ctx7
- Architecture modulaire, maintenable, testable et adaptee au temps reel multijoueur.
- Responsabilites claires par couche.
- Contrats reseau Protobuf comme source de verite cible pour les API et evenements temps reel.
- Separation stricte des parcours administrateur, joueur et observateur lecture seule.
- Serveur autoritaire pour les donnees competitives : scores, timers, etats de manche, abandon,
  reconnexion et validation anti-triche.

## Source de verite locale

Lire d'abord `docs/README.md`, puis les documents adaptes a la demande :

- Audit : `docs/00-audit/`
- Audit forensique HEAD : `docs/00-audit/head-forensic-audit.md`
- Index complet HEAD : `docs/00-audit/head-file-index.md`
- Produit : `docs/01-product/`
- Mini-jeux : `docs/01-product/minigame-catalog.md`
- UX : `docs/02-ux/`
- Architecture : `docs/03-architecture/`
- Couches : `docs/04-layers/`
- Workflows : `docs/05-workflows/`
- Roadmap : `docs/06-roadmap/`

Les anciens dossiers `docs/plan/` et `docs/prd/features/` ne sont plus la source de verite sur `v0.1`.
Leur contenu historique doit etre consulte via `HEAD` ou via l'audit forensique lorsqu'une decision
semble manquer.

## Inspection obligatoire avant changement

Avant toute modification non triviale :

1. Executer `pwd`.
2. Executer `git branch --show-current`.
3. Executer `git status --short`.
4. Inspecter les fichiers avec `rg --files` ou `rg "<terme>"`.
5. Lire `package.json` et le `package.json` du workspace concerne.
6. Lire la documentation locale concernee dans `docs/`.
7. Identifier les changements utilisateur existants et ne jamais les ecraser silencieusement.

## Documentation externe

Pour toute question ou modification impliquant une bibliotheque, framework, SDK, API, CLI ou service
cloud, utiliser `ctx7` avant d'implementer :

1. `npx ctx7@latest library <Nom officiel> "<question complete>"`
2. Choisir l'ID officiel le plus pertinent.
3. `npx ctx7@latest docs <libraryId> "<question complete>"`

Ne pas lancer plus de trois commandes `ctx7` pour une meme question.
Si `ctx7` echoue par quota, stopper et demander une connexion avec `npx ctx7@latest login` ou
`CONTEXT7_API_KEY`.
Si `ctx7` ne couvre pas le fournisseur, utiliser uniquement la documentation officielle.

## Workspaces

- `apps/web` : interface Next.js App Router. Doit contenir presentation, layouts, navigation et etats UI.
- `apps/api` : API applicative Hono. Doit exposer des commandes et lectures applicatives, pas les regles UI.
- `apps/game-server` : serveur temps reel Colyseus ou transport equivalent. Source autoritaire live.
- `apps/worker` : traitements asynchrones et jobs planifies.
- `apps/whatsapp-gateway` : passerelle de notification, sans regle metier de partie.
- `packages/game-engine` : domaine et regles pures du jeu.
- `packages/db` : acces persistance, migrations et client Prisma.
- `packages/shared` : types ou utilitaires vraiment transversaux, sans logique metier specifique.

## Lecture obligatoire du legacy

Avant de reconstruire un domaine qui existait dans `HEAD`, lire :

1. `docs/00-audit/head-forensic-audit.md`.
2. Les fichiers HEAD mentionnes dans la section du domaine.
3. Les anciens rapports de `HEAD:docs/audit-rapport-incoherences.md`,
   `HEAD:docs/audit-ui-api-trace.md`, `HEAD:docs/analysis-live-connection-flow.md` si le sujet touche
   admin, live ou UI/API.
4. `HEAD:docs/admin-arbitrage/05-diagrammes.md` pour tout sujet d'administration, arbitrage,
   publication ou supervision.

## Couches et dependances

La cible documentaire est decrite dans `docs/04-layers/`.

Regles principales :

- UI -> cas d'utilisation ou API publique, jamais persistance directe.
- API -> cas d'utilisation, domaine, contrats, persistance via repositories.
- Game server -> domaine jeu, contrats temps reel, persistance minimale, validation serveur.
- Domaine -> aucune dependance framework, UI, transport ou DB.
- Persistance -> ne contient pas les regles metier essentielles.
- Notifications -> ne demarrent pas de partie et ne publient pas de score.
- Observabilite -> logs, traces et metriques sans secrets ni donnees sensibles inutiles.

Interdictions :

- Imports profonds entre modules lorsque l'API publique existe.
- DTO JSON manuels comme source de verite definitive pour les contrats reseau.
- Entites Prisma exposees directement comme contrats reseau.
- Regles competitives placees dans les composants UI.
- Controle admin direct sur le client joueur.

## Protobuf

Les futurs contrats API et evenements live doivent etre definis en Protobuf.

Regles minimales :

- Ajouter `UNSPECIFIED = 0` dans les enums.
- Ne jamais reutiliser un numero de champ supprime.
- Reserver les noms et numeros retires.
- Ne pas changer arbitrairement le type d'un champ existant.
- Garder des messages petits et par domaine.
- Distinguer contrats reseau et modele de persistance.

Ne pas generer de client Protobuf ni creer d'endpoint avant decision et workflow documente.

## Mini-jeux

Le catalogue est dans `docs/01-product/minigame-catalog.md`.

Avant de creer ou modifier un mini-jeu :

1. Lire `docs/05-workflows/minigame-integration.md`.
2. Identifier le mini-jeu exact, sa famille et son objectif.
3. Documenter les regles, commandes joueur, evenements serveur, scoring, anti-triche et reconnexion.
4. Definir les contrats Protobuf avant l'implementation.
5. Ajouter tests unitaires domaine, tests temps reel et tests d'integration si persistance.

Ne jamais implementer un mini-jeu a partir du titre seul.

## Administration

L'administration cible est separee du parcours joueur :

- planification sans demarrage automatique par timer ;
- lobby de preparation avec etats des participants ;
- annonces d'avant-match separees de la selection du mini-jeu ;
- lancement manuel de manche par administrateur autorise ;
- supervision globale et individuelle en lecture seule ;
- verification des scores provisoires ;
- publication explicite des scores ;
- decision explicite de manche suivante ou fin de partie.

Ces principes viennent des instructions produit initiales et doivent rester visibles dans les documents
et les futurs tickets.

## Authentification et autorisation

Prevoir les emplacements et contrats pour inscription, connexion, deconnexion, session utilisateur,
utilisateur courant, roles, permissions, guards, erreurs, revocation, limitation de tentatives et logs
de securite.

Ne pas choisir JWT, cookies, OAuth, fournisseur externe ou strategie de session sans verification du
stack, documentation officielle et decision explicite.

## UI et layouts

- `apps/web/src/app/layout.tsx` est le root layout Next.js et doit contenir la structure HTML racine.
- Les routes Next.js suivent l'App Router et la structure fichier.
- Les layouts ne contiennent pas de regles metier essentielles.
- Les parcours public, authentification, joueur, jeu et administration ne doivent etre crees que lorsque
  leur besoin est confirme.
- Chaque etat visible important doit prevoir loading, empty, error, reconnexion et accessibilite.

## Git

- Ne jamais utiliser `git reset --hard`, `git checkout --`, rebase ou suppression forcee sans demande
  explicite.
- Ne jamais pousser, ouvrir une PR ou merger sans demande explicite.
- Ne jamais masquer ou ecraser les modifications utilisateur.
- Travailler sur une branche non-main pour toute implementation.
- Documenter l'etat initial et final de `git status` pour les changements importants.

## Worktrees agents et dependances hors ligne

Lecture obligatoire avant toute session parallele :
`docs/05-workflows/agent-worktree-convention.md`.

Pour toute tache APEX parallele, l'agent doit travailler dans un worktree dedie. Le checkout principal
`/home/afreeserv/anonymous` reste sur `v0.1` ou sur la branche d'integration choisie. Il sert uniquement
a creer les worktrees, integrer les commits et executer les gates globaux. Un agent de lot ne doit
jamais y executer `git switch`, `git checkout`, `git rebase` ou une implementation metier.

Garde-fou obligatoire : si `pwd` vaut `/home/afreeserv/anonymous` et que la branche correspond a
`apex/*`, arreter la session immediatement. Ne pas tenter de corriger, stasher, reset ou changer la
branche; signaler la collision a l'integrateur.

Regles obligatoires :

1. Creer le worktree avec `pnpm worktree:create -- <task-id> [base-ref]`. Le dossier parent par defaut
   est `/home/afreeserv/worktrees/anonymous` et peut etre remplace par `SESSION_JEU_WORKTREE_ROOT`.
2. Une branche `apex/<task-id>` et un dossier par tache. Ne jamais ouvrir la meme branche dans deux
   worktrees.
3. Demarrer la session Codex avec son repertoire de travail fixe sur
   `/home/afreeserv/worktrees/anonymous/<task-id>`, jamais sur le checkout principal.
4. Au debut de la session, confirmer `pwd`, branche, commit de base et `git status --short`.
5. Executer les commandes avec `scripts/worktree-run <commande>` afin de charger `WORKTREE_ID`, ports,
   DB et Redis propres au worktree.
6. Ne jamais copier, deplacer ou symlinker `node_modules` entre worktrees. pnpm partage deja son store
   de contenu; chaque worktree conserve ses propres liens `node_modules`.
7. `scripts/worktree-up` tente toujours `pnpm install --offline --frozen-lockfile` avec le store partage.
   Le reseau n'est autorise que par `WORKTREE_ALLOW_NETWORK=1`; utiliser d'abord `pnpm deps:fetch` depuis
   le checkout source quand une connexion est disponible.
8. Ne pas lancer directement `pnpm install` avec un lockfile inchange. Relancer `scripts/worktree-up`.
9. Avant suppression : worktree propre, `scripts/worktree-down`, puis `git worktree remove <path>` depuis
   le checkout source. Ne jamais supprimer le dossier manuellement.

Configuration Codex partagee : `.codex/environments/environment.toml`. Procedure complete :
`docs/05-workflows/agent-worktree-convention.md`. Merge train et ownership :
`docs/05-workflows/apex-parallel-worktrees.md`.

## Workflow de fonctionnalite

Aucune fonctionnalite ne commence par un composant, une table ou un endpoint.

Pipeline obligatoire :

1. Definir le cas d'usage et l'acteur.
2. Definir preconditions et criteres d'acceptation.
3. Identifier les etats UI.
4. Identifier les transitions du cycle de vie.
5. Decouper par couche.
6. Definir ou modifier les contrats Protobuf.
7. Evaluer l'impact donnees.
8. Definir autorisations.
9. Definir evenements temps reel et notifications.
10. Definir erreurs et reconnexion.
11. Definir tests par couche.
12. Lire le canevas de changement de couche dans `docs/04-layers/`.
13. Executer le workflow Apex si une implementation ou correction importante est demandee.
14. Mettre a jour documentation et decisions d'architecture.

## Ambiguite

Si une demande est incomplete :

1. Chercher la reponse dans le depot, les docs, les configs et l'historique accessible.
2. Presenter ce qui est constate.
3. Distinguer ce qui est confirme, deduit, propose et inconnu.
4. Poser uniquement les questions bloqueantes.
5. Attendre la reponse avant d'implementer la decision fonctionnelle concernee.

Ne pas reposer une question dont la reponse existe deja dans le depot ou la conversation.

Avant une modification sensible, clarifier au minimum :

- probleme observe ;
- comportement actuel ;
- comportement attendu ;
- utilisateurs concernes ;
- scenario de reproduction ;
- contraintes metier ;
- contraintes techniques ;
- elements qui ne doivent pas changer.

## Creation ou modification de module

Un module important doit documenter :

- objectif ;
- perimetre ;
- structure ;
- dependances autorisees ;
- API publique ;
- regles metier ;
- evenements ;
- erreurs ;
- tests ;
- exemples d'utilisation ;
- procedure d'extension ;
- elements interdits dans le module.

Ajouter un module seulement s'il correspond a une responsabilite stable et prouvee.

## Suppression

Avant toute suppression non deja validee :

1. Identifier les fichiers concernes.
2. Decrire leur fonction actuelle.
3. Lister dependances et imports.
4. Justifier la suppression.
5. Proposer le remplacement futur.
6. Documenter le risque.
7. Attendre validation explicite si du code source metier est concerne.

Licences, mentions legales, lockfiles et configurations indispensables ne sont jamais supprimes
silencieusement.

## Tests et validations

Commandes de base :

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

Adapter les tests au risque :

- domaine : tests unitaires ;
- API et DB : tests integration ;
- temps reel : tests commandes/evenements/reconnexion ;
- securite : auth, permissions, validation d'entrees, rate limiting si applicable ;
- UI : etats visibles et parcours critiques ;
- concurrence : resultats, paiements, capacite, jobs, idempotence.

Ne pas declarer une implementation terminee si les validations requises n'ont pas ete executees ou si
leur echec n'est pas clairement documente.

## Securite

- Valider toutes les entrees externes.
- Ne jamais faire confiance aux valeurs competitives envoyees par le client.
- Ne pas exposer secrets, tokens, cles API ou donnees sensibles dans logs, erreurs ou docs.
- Verifier autorisations cote serveur.
- Eviter la securite par obscurite.
- Documenter les limites de protection connues.

## Limites connues v0.1

- La fondation actuelle ne contient pas encore de modele metier complet.
- Les routes legacy admin/joueur ont ete supprimees comme implementation.
- Les mini-jeux sont listes comme catalogue produit, pas comme runtimes implementes.
- Les contrats `.proto` ne sont pas encore crees.
- L'authentification n'est pas implementee.
- Le choix final d'hebergement, de notification et de stockage temps reel reste a decider.

## Reponse finale attendue

Pour une intervention importante, repondre avec :

- etat constate ;
- fichiers crees, modifies ou supprimes ;
- docs locales lues ;
- IDs Context7 utilises si applicable ;
- commandes executees ;
- tests et resultats ;
- risques restants ;
- questions encore ouvertes.
