# Convention worktree obligatoire pour les agents

Ce fichier est la procedure autonome a lire avant de lancer une session Codex parallele. Il fixe le
repertoire, la branche, l'installation pnpm, l'isolation locale et la remise a l'integrateur.

## Invariant du checkout principal

Le checkout principal est toujours :

```text
/home/afreeserv/anonymous
```

Il reste sur `v0.1` ou sur la branche d'integration explicitement choisie. Il sert uniquement a :

- creer et lister les worktrees;
- integrer les commits termines;
- executer les gates globaux;
- supprimer un worktree deja integre et propre.

Une session de lot n'y implemente rien et n'y execute jamais `git switch`, `git checkout`, `git rebase`,
`git reset`, `git stash` ou une commande APEX qui cree/change une branche.

Garde-fou : si `pwd` vaut `/home/afreeserv/anonymous` et que `git branch --show-current` retourne
`apex/*`, arreter immediatement. Ne pas corriger l'etat Git. Informer l'integrateur, car une autre session
peut posseder des changements non commits dans ce checkout.

## Un dossier et une branche par tache

Depuis un checkout principal propre :

```bash
cd /home/afreeserv/anonymous
git status --short
pnpm worktree:create -- <task-id> HEAD
```

La commande cree les deux identifiants associes :

```text
Branche : apex/<task-id>
Dossier : /home/afreeserv/worktrees/anonymous/<task-id>
```

Exemple :

```bash
pnpm worktree:create -- a-scoring HEAD
cd /home/afreeserv/worktrees/anonymous/a-scoring
```

La session Codex doit etre ouverte avec ce dernier dossier comme repertoire de travail. Une branche ne
peut etre attachee qu'a un seul worktree et deux taches ne partagent jamais un dossier.

## Verification obligatoire au demarrage

La premiere action de chaque session est :

```bash
pwd
git branch --show-current
git rev-parse --short HEAD
git status --short
git worktree list --porcelain
```

La session continue seulement si :

- `pwd` correspond exactement au dossier de sa tache;
- la branche correspond exactement a `apex/<task-id>`;
- le commit de base satisfait les prerequis de la fiche APEX;
- aucun changement inattendu d'une autre tache n'est present.

En cas d'ecart, l'agent s'arrete et signale le constat. Il ne deplace pas les changements et ne modifie
pas les branches pour tenter une reparation autonome.

## Dependances avec connexion lente

Chaque worktree conserve son propre `node_modules`. Il est interdit de copier, deplacer ou symlinker ce
dossier. pnpm reutilise son store de contenu global, visible avec :

```bash
pnpm store path --silent
```

Quand la connexion est disponible, precharger une seule fois le store depuis le checkout principal :

```bash
cd /home/afreeserv/anonymous
pnpm deps:fetch
```

La creation appelle `scripts/worktree-up`, qui tente d'abord une installation strictement hors ligne et
figee par le lockfile. Si un paquet manque, la session s'arrete sans telecharger. Le fallback reseau doit
etre demande explicitement :

```bash
WORKTREE_ALLOW_NETWORK=1 scripts/worktree-up
```

Les commandes de travail passent par le chargeur d'environnement :

```bash
scripts/worktree-run pnpm typecheck
scripts/worktree-run pnpm test:unit
```

Il charge `.env.worktree.local` afin d'isoler `WORKTREE_ID`, ports, PostgreSQL, Redis et URLs. La
configuration Codex `.codex/environments/environment.toml` appelle automatiquement les scripts de
setup et de nettoyage.

## Remise et nettoyage

L'agent de lot termine dans son propre dossier :

```bash
git status --short
git diff --check
```

Il fournit a l'integrateur le commit de base, le commit de sortie, les validations et les risques. Il ne
merge, ne pousse et ne supprime pas son worktree sans demande explicite.

Apres integration confirmee, l'integrateur nettoie depuis le checkout principal :

```bash
cd /home/afreeserv/worktrees/anonymous/<task-id>
scripts/worktree-down
cd /home/afreeserv/anonymous
git worktree remove /home/afreeserv/worktrees/anonymous/<task-id>
git worktree prune
```

Un worktree sale n'est jamais supprime de force. Pour l'ownership des fichiers et l'ordre du merge
train, lire `docs/05-workflows/apex-parallel-worktrees.md`.
