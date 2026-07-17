# Risks And Open Decisions

## Risques

- L'integration Fapshi courante est incompatible avec l'API officielle et possede un fallback local.
- Aucun des six mini-jeux du lancement n'a de runtime jouable dans le code courant.
- Les preuves E2E ne couvrent pas worker/provider et le seed echoue sous concurrence Playwright.
- Les pages support/compliance/observer et plusieurs pages admin/joueur utilisent encore des donnees
  hardcodees ou des shells.
- Le depot ne contient pas encore de deploiement, rollback, restauration, alerting ou astreinte production.
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
- Fapshi est le provider paiement valide. Le programme production doit implementer son protocole
  officiel sandbox/live; aucun autre provider ni faux adaptateur n'est autorise sans nouvelle decision.
- Le premier lancement vise exactement six mini-jeux, un par famille.

## Decisions ouvertes

- Provider final de push.
- Conservation des evenements live (duree exacte archive).
- Archive exacte des documents legacy.
- Maintien Colyseus ou WebSocket Protobuf maison apres le lancement initial; Colyseus reste la baseline
  du programme production tant qu'une ADR ne le remplace pas.
- Formules de gain financier exactes par manche (finance / P-A-SCORING) — hors rulebook gameplay.
- Hebergement, region, services manages PostgreSQL/Redis, secrets et strategie de promotion.
- RPO/RTO, SLA/SLO, astreinte et fenetre de maintenance.
- Politique metier d'annulation et compensation : payout compensatoire, procedure manuelle ou hors
  scope; Fapshi n'expose pas d'endpoint refund natif.
- Versions CGU/confidentialite, retention, export, anonymisation et conservation financiere.

## Bloqueurs eventuels pour P-SEQ-02

Aucun bloqueur produit ouvert sur les six rulebooks v1.0.0.  
P-SEQ-02 peut figer les contrats a partir des commandes/phases documentees. Toute demande de nouvelle
cle ou de changement de condition de victoire exige un nouvel ADR et un bump de rulebook.
