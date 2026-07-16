# SEQ-03 - Integrer la WAVE-A

## Instruction a la session Codex

Tu es l'integrateur unique. Ne reecris pas les features. Fusionne chaque lot WAVE-A atomiquement,
branche ses exports publics dans les compositions centrales et detecte la premiere regression avant le
lot suivant.

## Prerequis

- SEQ-00/01/02 sont dans `integration/v0.1-completion` et tous les lots WAVE-A selectionnes fournissent
  commit de base, rapport APEX, Context7 IDs, tests et worktree propre.
- Lire les sept fiches WAVE-A, le workflow worktrees, la strategie de tests et les AC des sprints.
- Context7 obligatoire pour Git merge/worktree et toute API de composition modifiee.

## Ownership exclusif

Fichiers de composition centraux : `apps/api/src/index.ts`, `apps/api/src/rpc/routes.ts`,
`apps/web/src/services/rpcServices.ts`, providers web, exports publics, plus resolutions de conflits
approuvees. Les contrats, migrations et lockfile restent aux proprietaires SEQ correspondants.

## Procedure obligatoire

1. Verifier le commit de base et l'ownership du lot.
2. `git merge --no-ff` d'un seul lot.
3. Monter ses services/exports sans copier sa logique dans les fichiers centraux.
4. Lancer generation, migration DB vide, tests du lot et integration affectee.
5. Corriger ou annuler ce lot avant le suivant si un gate echoue.
6. Apres le dernier lot, lancer L6 complet et produire la matrice AC -> test.

## Criteres d'acceptation

- Historique avec un merge identifiable par lot, aucun squash multi-feature opaque.
- 11 services/50 methodes mesures a nouveau et ecarts restants documentes.
- DB vide + seed + unit + integration + E2E affectes + typecheck/lint/build verts.
- Aucun conflit resolu par choix aveugle d'un cote et aucun changement utilisateur perdu.
