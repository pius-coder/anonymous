# APEX, worktrees paralleles et merge train

Ce workflow complete `apex-workflow.md`. Git worktree separe le `HEAD` et l'index de chaque tache, mais
les worktrees partagent le depot Git et ses references. Une meme branche ne doit pas etre ouverte dans
deux worktrees.

## 1. Preparation sequentielle

1. Verifier un worktree d'integration propre avec `git status --short`.
2. Creer la branche `integration/v0.1-completion` depuis le commit de baseline documente.
3. Executer SEQ-00, SEQ-01 et SEQ-02 dans cet ordre.
4. Publier le commit de base de chaque vague et ne plus le reecrire.
5. Creer un worktree par tache avec une branche `apex/<task-id>`.

Exemple apres validation de la baseline :

```bash
git worktree add ../anonymous-wt/a-identity -b apex/a-identity integration/v0.1-completion
git worktree add ../anonymous-wt/a-payment -b apex/a-payment integration/v0.1-completion
git worktree list --porcelain
```

## 2. Isolation obligatoire

Chaque worktree recoit un `WORKTREE_ID` stable et des ressources derivees :

| Ressource | Regle |
|---|---|
| PostgreSQL | base ou schema unique, jamais la base de dev partagee |
| Redis | prefix/DB unique par worktree et purge au teardown |
| API | port unique derive de `WORKTREE_ID` |
| Game server | port unique, jamais fourni par le client comme politique serveur |
| Web | port et `PLAYWRIGHT_BASE_URL` uniques |
| Next/coverage | sorties locales au worktree; aucun dossier genere copie entre worktrees |
| Turbo | cache local partage autorise; les outputs de tache restent declares dans `turbo.json` |

Les secrets ne sont ni commits ni inclus dans le nom du worktree, les logs ou les commandes Context7.

## 3. Ownership et conflits

SEQ-00 est seul proprietaire du lockfile, des packages racine, de Turbo et de la CI. SEQ-01 est seul
proprietaire des proto et du code genere. SEQ-02 est seul proprietaire du schema, des migrations et du
seed. SEQ-03 est seul proprietaire des fichiers de composition centraux lors du merge.

Si un lot metier decouvre un besoin sur une surface interdite :

1. il documente le changement minimal et le scenario bloque;
2. il n'edite pas le fichier partage;
3. l'integrateur ajoute le changement sur la branche d'integration;
4. le lot rebase/merge la nouvelle baseline seulement apres validation du proprietaire.

## 4. Boucle APEX par worktree

Chaque tache suit Analyze, Plan, Execute, eXamine :

1. **Analyze** : verifier branche/status, docs, legacy, code et Context7; confirmer AC et ownership.
2. **Plan** : plan fichier par fichier, contrats consommes, donnees, permissions et tests L0-L6.
3. **Execute** : tests-first, changements scopes, aucun fichier interdit.
4. **eXamine** : validations du lot, review adversariale, diff/status, risques et preuve AC->test.

Une tache n'est prete a merger que si son rapport contient : commit de base, fichiers modifies,
Context7 IDs, commandes, resultats, migrations/contrats consommes, risques et commit de sortie.

## 5. Gates avant remise a l'integrateur

Le lot execute au minimum :

```bash
pnpm docs:check
pnpm typecheck
pnpm lint
pnpm test
```

Il execute en plus les niveaux qui touchent son scope : PostgreSQL reel, transport Connect/Hono,
serveur/client Colyseus, worker Redis et Playwright multi-service. `pnpm build` est obligatoire si le
lot modifie un workspace buildable ou sa composition.

Les scripts `test:unit`, `test:integration`, `test:e2e` et `test:all` sont fournis par SEQ-00
(voir `docs/05-workflows/test-commands.md`). Les lots paralleles doivent les utiliser pour prouver L3-L5.

## 6. Merge train sequentiel

Pour chaque lot :

1. verifier que le worktree source est propre et que son commit est atomique;
2. fusionner dans `integration/v0.1-completion` avec `git merge --no-ff`;
3. monter les exports du lot dans les fichiers de composition centraux;
4. regenerer contrats/Prisma uniquement via leurs proprietaires;
5. lancer tests du lot, integration affectee, migration DB vide, typecheck et lint;
6. annuler ou corriger le merge avant d'accepter le lot suivant si un gate echoue;
7. lancer la suite complete a la fin de chaque vague.

Un worktree n'est supprime qu'apres merge confirme, branche integree et `git status --short` vide. Ne
jamais forcer la suppression d'un worktree sale.

## 7. Regles anti-retour en arriere

- Ne pas commencer WAVE-A avant les trois baselines sequentielles.
- Ne pas creer deux migrations ou deux generations concurrentes.
- Ne pas accepter un fallback local dans un E2E cense prouver un service reel.
- Ne pas renommer un test mocke en integration; changer son harness.
- Ne pas fusionner plusieurs lots avant d'identifier lequel casse un gate.
- Ne pas marquer un sprint fait sur la seule presence d'un shell UI, d'un proto ou d'un schema.
- Conserver la matrice AC -> test -> commande comme preuve de recette.
