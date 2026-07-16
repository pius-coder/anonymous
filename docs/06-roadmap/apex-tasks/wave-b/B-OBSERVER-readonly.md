# B-OBSERVER - Parcours readonly reel

## Mission autonome

Apres SEQ-03 et A-REALTIME/A-SCORING, brancher l'observateur sur les snapshots reels sans ajouter de
commande. Distinguer observateur, joueur elimine et admin; prouver le no-leak.

## Ownership

Routes/composants `/observe/**`, adaptateur client readonly et tests E2E observer. Consommer les APIs
publiques realtime/scoring sans modifier la room core.

## Interdit

Contrats, Prisma, game-server core, tooling racine, scoring use-cases, admin/support/finance.

## Demarrage obligatoire

Lire AGENTS, sprints 09/13/16, UX observer, architecture projections/audiences et legacy spectator.
Context7 : Colyseus, ConnectRPC, TanStack Query et Playwright.

## AC

- Snapshot readonly reel avec loading/reconnect/stale/error.
- Aucun score provisoire, identifiant interne ou champ prive joueur.
- Toute commande envoyee par client observeur malveillant est refusee serveur.
- Joueur elimine conserve uniquement les capacites documentees; pas d'escalade vers observateur/admin.
- Resultats visibles seulement apres publication.

## Tests et sortie

L4 projection/commande refusee et L5 navigateur multi-role avec assertions negatives. Validations
completes, commit atomique et rapport AC -> test.
