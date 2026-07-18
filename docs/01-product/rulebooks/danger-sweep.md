# Rulebook — `danger-sweep` (Le rayon balayeur)

| Champ | Valeur |
|---|---|
| Cle | `danger-sweep` |
| Famille | Survie collective |
| Titre affiche | Le rayon balayeur |
| Statut | `APPROVED` |
| Version | 1.0.0 |
| Proprietaire produit | `product-owner` |
| Decision de ratification | `DEC-P-SEQ-01-RATIFY` |
| Date | 2026-07-17 |

## 1. Objectif

Tous les joueurs eligibles evoluent sur une grille logique. Un **rayon de danger** balaye la zone
selon une trajectoire simulee **entierement serveur**. Les joueurs envoient des **intentions de
deplacement** ; positions, collisions et eliminations sont calculees par le serveur. Survit qui reste
jusqu'a la fin ou jusqu'au dernier debout selon mode.

## 2. Taille et formation

| Parametre | Valeur |
|---|---|
| Joueurs | 2–N (`maxPlayers` partie), tous vs environnement |
| Equipes | Aucune (FFA survie) |
| Placement initial | Positions spawn deterministes depuis seed (grille) |

## 3. Phases

| Phase | Description | Timer / tick |
|---|---|---|
| `BRIEFING` | Regles + zone | 5000 ms |
| `COUNTDOWN` | 3…2…1 serveur | 3000 ms |
| `SURVIVAL` | Simulation ticks + inputs | `matchDurationMs` defaut 60000 ; tick `tickHz` defaut 10 |
| `ELIM_CHECK` | (interne par tick) | — |
| `RESOLVE` | Classement survie | 2000 |
| `COMPLETE` | Fin | — |

Fin anticipatee si `lastStandingWins` et ≤1 vivant, ou timer epuise.

## 4. Commandes

| Commande | Phase | Payload | Serveur | Erreurs |
|---|---|---|---|---|
| `move_intent` | `SURVIVAL` si `ALIVE` | `{ dir: N\|S\|E\|W\|STAY, clientSeq }` | file d'intention ; applique au prochain tick | `ERR_PHASE_INVALID`, `ERR_INVALID_PAYLOAD`, `ERR_RATE_LIMIT`, `ERR_ROUND_CLOSED` si deja elimine (`ERR_NOT_YOUR_TURN` mappe `ERR_ELIMINATED`) |
| `forfeit_round` | SURVIVAL | `{}` | elimination volontaire | |

**Interdit :** envoyer `x,y` absolus, `collision=false`, `alive=true`, score, ou "j'ai dodge".

Code dedie : `ERR_ELIMINATED` = commande d'un joueur deja elimine.

## 5. Simulation serveur

| Element | Regle |
|---|---|
| Grille | `width`×`height` (defaut 9×9), cellules entieres |
| Vitesse joueur | 1 cellule / `moveCooldownTicks` (defaut 2 ticks) |
| Rayon | segment ou balayage angulaire derive du seed ; position danger `f(tick, seed)` pure |
| Hit-test | si cellule joueur ∈ cellules danger au tick → `ELIMINATED` a `elimTick` |
| Autorite | seule la simu serveur mute `position` et `status` |
| Lag | intentions en retard s'appliquent au tick courant s'il reste du budget ; pas de rewinding |

## 6. Limites / config

| Cle | Defaut |
|---|---|
| `tickHz` | 10 |
| `matchDurationMs` | 60000 |
| `grid` | 9×9 |
| `moveCooldownTicks` | 2 |
| `dangerSpeed` | config seed |
| `lastStandingWins` | true |
| `reconnectWindowSec` | 30 |
| `maxIntentsPerSec` | 20 |

## 7. Victoire / score / egalite

| Mode | Regle |
|---|---|
| Score | `survivalTimeMs` (elimTick ou fin) ; bonus +500 si dernier debout |
| Classement | survivalTime desc ; tie-break plus de cellules parcourues valides ; puis `participantId` |
| Dernier debout | gagne le bonus ; si tous elimines meme tick → egalite sur ce rang |
| Gain | selon publication |

## 8. No-show / abandon

- No-show (jamais en room au COUNTDOWN) → elimine tick 0, score 0.
- Abandon → elimine immediat.
- Disconnect : corps reste en place (derniere position serveur) et peut etre touche par le rayon ; reconnect reprend controle sans teleport.

## 9. Reconnect / checkpoint

- Checkpoint chaque tick N ou chaque transition : positions, status, tick index, danger state, seed.
- Reconnect : snapshot self (position, alive) + danger **public** ; pas de rewind.
- Crash room : reprise tick T checkpoint ; clients resync.

## 10. Information

| Donnee | Self | Autres joueurs | Observer | Admin | Support |
|---|---|---|---|---|---|
| Positions publiques, danger public, tick | oui | oui | oui | oui | oui |
| Intent queue non appliquee | self only | non | non | non | non |
| Seed brut | non | non | non | non | non |

Positions sont publiques (survie spectaculaire) ; pas de role cache ici.

## 11. Anti-triche / fairness

- Toute position client ignoree.
- Speedhack : cooldown serveur.
- Prediction client purement cosmetique.
- Charge : tick budget ; si surcharge serveur → pause admin / VOID, pas de sous-simulation silencieuse fausse.

## 12. Accessibilite

- Direction clavier fleches/WASD + boutons tactiles.
- Danger : couleur **et** motif **et** annonce textuelle "danger approche".
- Mode reduced-motion : simplifier FX, garder clarte cellules.

## 13. Assets

- Tiles sol, sprite rayon, indicateurs elimination (licencees).

## 14. Telemetrie

`surv_tick_summary` (agregats), `surv_elim`, `surv_move_reject`, `surv_reconnect`. Pas de flood par intent brut en prod analytics.

## 15. Scenarios

### S1 — Hit serveur (L1)

- **Given** joueur sur cellule C, danger couvre C au tick T  
- **When** simu tick T  
- **Then** ELIMINATED, ignore `move_intent` ulterieurs

### S2 — Position client rejetee (L1)

- **When** payload avec x,y  
- **Then** `ERR_INVALID_PAYLOAD`

### S3 — Disconnect immobile (L4)

- **Given** disconnect  
- **When** danger passe sur case  
- **Then** elimine sans input

### S4 — Reconnect controle (L4)

- **Then** position identique checkpoint, pas de teleport safe-zone

### S5 — Determinisme seed (L1)

- **Given** meme seed + intents  
- **Then** memes elim ticks

### S6 — Publication (L5)

- **Then** classement = survivalTime evidence

## 16. Mapping AC → preuves

| AC | Niveaux |
|---|---|
| Simulation pure serveur | L1 |
| Rejet position client | L1, L4 |
| Reconnect / crash reprise | L3, L4 |
| Charge tick (non-fonctionnel) | L4 soak / P-C-SCALE |
| E2E | L5 |
