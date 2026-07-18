# Screen State Matrix

| Etat produit | Joueur | Admin | Observateur |
|---|---|---|---|
| Preparation ouverte | Lobby + annonce | Readiness + annonce | Non applicable |
| Round actif | Mini-jeu | Monitoring + commandes limitees | Rendu snapshot |
| Joueur termine | Attente verification | Statut termine | Snapshot sans controle |
| Verification | Attente | Table scores provisoires | Progression globale |
| Resultats publies | Resultats | Publication confirmee | Resultats publics autorises |
| Reconnexion | Reconnexion guidee | Signal risque joueur | Dernier snapshot autorise |

