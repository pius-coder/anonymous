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

## Decisions ouvertes

- Provider final de push.
- Duree de reconnexion et stockage exact des deadlines.
- Conservation des evenements live.
- Archive exacte des documents legacy.
- Maintien Colyseus ou WebSocket Protobuf maison apres Sprint 09.
