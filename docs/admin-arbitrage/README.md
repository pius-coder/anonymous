# Source de verite - Dashboard administration, arbitrage et mini-jeux

Statut : source de verite produit/technique pour la refonte du dashboard d'administration, du cockpit live, de l'arbitrage et de l'exploitation des 120 mini-jeux.

Date : 2026-07-11

## Regle de reprise apres compaction

Si le contexte de l'agent est compacte, perdu ou ambigu, relire obligatoirement ces fichiers avant de reprendre l'analyse ou l'implementation :

1. `docs/admin-arbitrage/README.md`
2. `docs/admin-arbitrage/01-reglement-arbitrage.md`
3. `docs/admin-arbitrage/02-user-stories-dashboard.md`
4. `docs/admin-arbitrage/03-edge-cases.md`
5. `docs/admin-arbitrage/04-ui-jeux-dashboard.md`
6. `docs/admin-arbitrage/05-diagrammes.md`
7. `docs/admin-arbitrage/06-plan-apex-implementation.md`

Ces documents priment sur les souvenirs de conversation. Ils ne remplacent pas les PRD existants : ils les specialisent pour le systeme d'administration/arbitrage.

## Documents

| Fichier                          | Role                                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `01-reglement-arbitrage.md`      | Reglement global, profils d'arbitrage, fiche mini-jeu, multi-admin, registre evenementiel |
| `02-user-stories-dashboard.md`   | Epics et user stories completes pour le dashboard operateur/arbitre                       |
| `03-edge-cases.md`               | Catalogue des edge cases et decisions par defaut                                          |
| `04-ui-jeux-dashboard.md`        | Contrat UI/UX des jeux, panels par famille, dashboard Admin A/Admin B                     |
| `05-diagrammes.md`               | 15 diagrammes Mermaid/structurels demandes pour cadrer l'implementation                   |
| `06-plan-apex-implementation.md` | Plan APEX par sprints, validations et Definition of Done                                  |

## Sources projet a conserver en parallele

- `docs/catalogue-mini-jeux.md` : 120 jeux, 6 familles, timers serveur, rooms Colyseus, `winnersCount` externe.
- `docs/prd/features/09-session-live-temps-reel.md` : phases live, deadlines DB, Colyseus, reconnexion, pause.
- `docs/prd/features/10-game-engine-resolution-rounds.md` : resolvers deterministes, evidence, seedLog, replay.
- `docs/prd/features/11-catalogue-mini-jeux-configurables.md` : MiniGameDefinition, configSchema, allowedActions, resolver, antiCheatPolicy.
- `docs/prd/features/12-resultats-gains-distribution.md` : resultats officiels, corrections auditees, credits idempotents.
- `docs/prd/features/13-dashboard-admin-audit-support.md` : actions sensibles avec role, reason, audit, support/finance.
- `docs/prd/features/15-securite-anti-triche-conformite.md` : serveur source de verite, anti-cheat, moderation, compliance.
- `docs/plan/19-phase3-operateur-lancement.md` : live control admin, polling, countdown, joueurs, incidents.

## Decision centrale

Le systeme ne doit pas produire un dashboard admin generique. Il doit produire une feuille de match interactive et un cockpit d'arbitrage.

Le serveur produit la decision automatique initiale. Admin B verifie et recommande. Admin A tranche et publie. Toute correction irreversible qui modifie un resultat, une elimination, un score, une qualification, un role secret ou une publication exige une preuve enregistree et une approbation a deux administrateurs.

## Non-negociables

- Pas de 120 procedures admin separees.
- Pas de dashboard simplifie qui ignore les familles de jeux.
- Pas de score modifie directement sans decision, preuve et audit.
- Pas de role cache visible par defaut pendant la partie.
- Pas de pause seulement en base de donnees : la room doit recevoir la commande.
- Pas de resultat final sans statut, version, preuves et integrityHash.
- Pas de mutation critique sans `commandId`, `adminId`, `sessionVersion`, permission et raison.
- Pas de publication si un incident peut changer les qualifies, gagnants ou credits.
- Pas de mini-jeu officiel sans fiche reglementaire complete.
