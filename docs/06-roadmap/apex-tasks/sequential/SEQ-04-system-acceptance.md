# SEQ-04 - Recette systeme et gel v0.1

## Instruction a la session Codex

Execute la recette finale apres merge des vagues A et B. Cette tache ne complete pas silencieusement une
feature manquante : elle prouve, classe ou renvoie le lot fautif.

## Prerequis et lectures

- Tous les merges acceptes sont presents sur la branche d'integration et leurs worktrees sont propres.
- Lire toutes les fiches terminees, la gap analysis, les acceptance gates, parcours UX, sprint 19 et
  matrice AC -> test.
- Context7 obligatoire : Playwright, Colyseus, ConnectRPC, Prisma et outils de charge reellement utilises.

## Ownership exclusif

Suites E2E systeme, rapports de recette, matrice de tracabilite et corrections de composition seulement.
Le code metier retourne au lot proprietaire si son AC echoue.

## Scenarios obligatoires

1. Register/login/reset/revocation.
2. Catalogue -> participation -> paiement -> lobby -> room.
3. Admin preparation -> round -> verification -> correction -> publication explicite.
4. Joueur voit les resultats seulement apres publication.
5. Observer/support/finance respectent lecture et permissions.
6. Reconnect, duplicate input, late input, timeout, retry worker et conflit multi-admin.
7. Mobile room sans overlap et commandes clavier/joystick.

## Criteres d'acceptation

- Services, DB et Redis reels; seed connu; aucun fallback local ou mock sur le parcours.
- No-leak scores/snapshots prouve par assertions negatives.
- L6 complet vert, artefacts conserves, risques residuels classes avec proprietaire.
- `v0.1-gap-analysis.md` et matrices mis a jour avec le nouvel etat prouve, sans pourcentage arbitraire.
