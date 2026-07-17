# Rulebook — `pure-reaction-duel` (Course au signal)

| Champ | Valeur |
|---|---|
| Cle | `pure-reaction-duel` |
| Famille | Duel |
| Titre affiche | Course au signal |
| Statut | `APPROVED` |
| Version | 1.0.0 |
| Proprietaire produit | `product-owner` |
| Decision de ratification | `DEC-P-SEQ-01-RATIFY` |
| Date | 2026-07-17 |

## 1. Objectif

Deux joueurs attendent un signal **imprevisible** emis par le serveur. Le premier dont la commande
`react` est **recue et horodatee par le serveur** apres le signal gagne le point. Aucun
`clickedAtMs` client n'est une verite competitive.

## 2. Taille et formation

| Parametre | Valeur |
|---|---|
| Joueurs | Exactement 2 |
| Appairage | Deterministe par `pairingSeed` + liste ordonnee des participants eligibles |
| Impair global partie | Les joueurs hors paire de cette manche recoivent bye documente (score neutre `BYE`) si non appaires ; hors scope d'une instance duel |

## 3. Phases

| Phase | Description | Timer |
|---|---|---|
| `BRIEFING` | Presentation des regles | `briefingMs` defaut 4000 |
| `WAIT_SIGNAL` | Attente ; clics = faux depart | delai aleatoire serveur `minDelayMs`–`maxDelayMs` (defaut 1500–5000) |
| `SIGNAL_OPEN` | Signal emis ; reactions acceptees | `reactWindowMs` defaut 2000 |
| `RESOLVE` | Gagnant/egalite/faux depart | `resolveMs` defaut 2000 |
| `COMPLETE` | Fin | — |

Emission signal : evenement serveur `SIGNAL` avec `signalServerTs` (monotone). Option v1 : pas de commit/reveal crypto (delai serveur suffit) ; si ADR futur commit/reveal, non requis pour 1.0.0.

## 4. Commandes

| Commande | Phase | Effet serveur | Reponse | Erreurs |
|---|---|---|---|---|
| `react` | `WAIT_SIGNAL` | enregistre **faux depart** (`FALSE_START`) pour l'auteur ; l'adversaire peut gagner sur timeout de phase si politique `falseStartLoses=true` (defaut **true**) | `FALSE_START_ACK` | `ERR_ALREADY_SUBMITTED` si deja faux depart resolu |
| `react` | `SIGNAL_OPEN` | horodate `receiveServerTs` ; premier valide gagne | `REACT_ACCEPT` + resultat en RESOLVE | `ERR_DEADLINE_EXPIRED` si fenetre close |
| `react` | autres | refuse | — | `ERR_PHASE_INVALID` |
| `forfeit_round` | avant COMPLETE | `FORFEIT`, adversaire gagne | `FORFEIT_ACK` | `ERR_ROUND_CLOSED` |

Payload `react` : `{}` ou `{ clientSeq }` uniquement. **Champs timestamp client ignores / rejetes si presents en mode strict** (`ERR_INVALID_PAYLOAD` si `clickedAtMs` envoye et `rejectClientTimestamps=true`, defaut true).

## 5. Limites et config

| Cle | Defaut | Notes |
|---|---|---|
| `minDelayMs` | 1500 | ≥ 500 |
| `maxDelayMs` | 5000 | > min |
| `reactWindowMs` | 2000 | |
| `falseStartLoses` | true | faux depart = defaite immediate de l'auteur |
| `simultaneityEpsilonMs` | 0 | si `|t1-t2| <= epsilon` → egalite ; defaut 0 = strict premier |
| `reconnectWindowSec` | 30 | |
| `rttCompensation` | false | **interdit** de compenser le RTT en v1 |

## 6. Timer / horodatage

- `signalServerTs` et `receiveServerTs` issus de l'horloge room.
- Gagnant = min `receiveServerTs` parmi `react` valides post-signal sans faux depart.

## 7. Victoire, egalite, score

| Cas | Resultat |
|---|---|
| Un seul react valide | ce joueur `WIN` (score 1), autre `LOSS` (0) |
| Deux reacts, t1 < t2 | t1 gagne |
| Egalite (|t1-t2|≤epsilon) | `DRAW` score 1–1 ou 0.5 selon `drawScoreMode` (defaut 0.5 chacun) |
| Les deux faux depart | `DRAW` 0–0 |
| Un faux depart (falseStartLoses) | adversaire `WIN` |
| Aucun react dans la fenetre | `DRAW` 0–0 |
| Un seul present | `WIN` par forfait si autre `NO_SHOW` |

## 8. No-show / abandon

- Absent a fin `BRIEFING` → `NO_SHOW`, adversaire gagne.
- Abandon → adversaire gagne.
- Disconnect pendant `WAIT_SIGNAL`/`SIGNAL_OPEN` : horloge continue ; a expiration reconnect → traite comme no-react ou forfeit selon `disconnectPolicy` (defaut `NO_REACT`).

## 9. Reconnect / checkpoint

- Checkpoint : phase, `signalAt` (si planifie ou emis), faux depart flags, reacts enregistres.
- Reconnect **ne re-emet pas** un nouveau signal et **ne change pas** `signalServerTs`.
- Si signal deja passe et fenetre close → joueur voit `RESOLVE`.

## 10. Information

| Donnee | Joueur | Partenaire (adversaire) | Observer | Admin | Support |
|---|---|---|---|---|---|
| Phase, timer public WAIT (sans reveler l'instant exact du signal) | oui | oui | oui | oui | oui |
| Instant exact futur du signal | non | non | non | non | non |
| `receiveServerTs` self apres coup | oui en RESOLVE | adversaire voit gagnant, pas forcement le delta brut | gagnant public | details | audit |
| RTT individuel | self optionnel floute | non | non | agregats | audit |

Observer ne recoit **pas** `SIGNAL` avant les joueurs (meme tick / meme broadcast room autorise ; pas de canal premature).

## 11. Anti-triche / fairness

- Ignorer/rejeter timestamps client.
- Predire le signal : delai aleatoire CSPRNG serveur ; distribution telemetre pour anomalies.
- Spam `react` : premier seul compte ; rate limit.
- Pas de compensation RTT (fairness documentee : avantage ping reconnu, mitige plus tard par ADR).

## 12. Accessibilite

- Signal **multimodal** obligatoire : flash visuel + vibration/haptic si dispo + bip audio + changement texte "GO".
- Reaction : espace/clic/tap zones larges.
- Ne pas dependre uniquement de la couleur.

## 13. Assets

- Picto signal, son GO court (licence claire), etats faux depart.

## 14. Telemetrie

`duel_false_start`, `duel_react`, `duel_result`, deltas serveur, flags anomaly. Sans PII.

## 15. Scenarios

### S1 — Premier serveur gagne (L1)

- **Given** signal a T0  
- **When** A recoit a T0+10, B a T0+30  
- **Then** A gagne

### S2 — Timestamp client ignore (L1)

- **Given** B envoie `clickedAtMs` anterieur  
- **When** serveur ordonne par receive  
- **Then** ordre receive prevaut ; payload timestamp rejete ou ignore

### S3 — Faux depart (L1/L4)

- **Given** phase WAIT_SIGNAL  
- **When** A `react`  
- **Then** FALSE_START, A perd si `falseStartLoses`

### S4 — Reconnect avant signal (L4)

- **Given** A disconnect en WAIT  
- **When** A reconnect avant signal  
- **Then** meme delai/signal, pas de reset avantageux

### S5 — Latence asymetrique (L4)

- **Given** deux clients latence differente  
- **When** memes intentions humaines simulees  
- **Then** resultat = ordre arrivee serveur (documente)

### S6 — Publication (L5)

- **Given** evidence deltas  
- **When** publish  
- **Then** scores publies = evidence

## 16. Mapping AC → preuves

| AC | Niveaux |
|---|---|
| Horodatage serveur | L1, L4 |
| Faux depart / egalite | L1, L4 |
| Rejet timestamp client | L1, L4 |
| Reconnect sans nouveau signal | L3, L4 |
| Observer non premature | L4, L5 |
