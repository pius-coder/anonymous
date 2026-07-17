# Risks And Open Decisions

## Risques

- Worktree initial sale: `v0.1` inclut des changements non valides.
- Colyseus state actuel peut fuiter des donnees si mal filtre.
- Resultats diffuses trop tot.
- Suppression legacy a fort risque sans tests.
- Protobuf ajoute une discipline de compatibilite absente actuellement.
- Les sprints 02 et 03 peuvent figer trop tot des domaines futurs si les contrats ou tables `draft` ne sont
  pas revalides dans leurs sprints proprietaires.
- Un token live persiste en clair ou une state view Colyseus trop large peut exposer des donnees de session.

## Decisions fermees (P-SEQ-01)

- Six cles du premier lancement **ratifiees** sans remplacement (`DEC-P-SEQ-01-RATIFY`) :
  `memory-sequence`, `pure-reaction-duel`, `trust-bridge`, `team-relay`, `danger-sweep`, `silent-vote`.
- Rulebooks `APPROVED` v1.0.0 + matrice fairness + ADR 0003.
- `silent-vote` = produit **Le saboteur** (roles caches), pas le vote majoritaire legacy.
- Compensation RTT duel : **non** en v1.
- Reconnexion : fenetre defaut 30s (20–60s par jeu), Colyseus `allowReconnection`.

## Decisions ouvertes

- Provider final de push.
- Conservation des evenements live (duree exacte archive).
- Archive exacte des documents legacy.
- Maintien Colyseus ou WebSocket Protobuf maison apres Sprint 09.
- Formules de gain financier exactes par manche (finance / P-A-SCORING) — hors rulebook gameplay.

## Bloqueurs eventuels pour P-SEQ-02

Aucun bloqueur produit ouvert sur les six rulebooks v1.0.0.  
P-SEQ-02 peut figer les contrats a partir des commandes/phases documentees. Toute demande de nouvelle
cle ou de changement de condition de victoire exige un nouvel ADR et un bump de rulebook.
