# Rulebook — `memory-sequence` (Sequence memoire)

| Champ | Valeur |
|---|---|
| Cle | `memory-sequence` |
| Famille | Solo |
| Titre affiche | Sequence memoire |
| Statut | `APPROVED` |
| Version | 1.0.0 |
| Proprietaire produit | `product-owner` |
| Decision de ratification | `DEC-P-SEQ-01-RATIFY` |
| Date | 2026-07-17 |

## 1. Objectif

Le joueur memorise une sequence de symboles generee et affichee par le serveur, puis la reproduit
exactement. La progression (longueur, etapes reussies) est verifiee exclusivement cote serveur.

## 2. Taille et formation

| Parametre | Valeur |
|---|---|
| Joueurs actifs | 1 par instance de manche solo (N joueurs d'une partie jouent en parallele, instances isolees) |
| Formation | Individuel ; pas d'equipe |
| Spectateurs | Observateur lecture seule sur progression publique uniquement |

## 3. Phases

| Phase | Entree | Sortie | Timer serveur |
|---|---|---|---|
| `BRIEFING` | `start_round` admin | auto ou admin `advance` | config `briefingMs` (defaut 5000) |
| `DISPLAY` | fin briefing | fin affichage sequence | `displayMs` par symbole × longueur + gaps |
| `INPUT` | fin DISPLAY | soumission complete, erreur fatale, ou deadline | `inputMs` (defaut 15000 + 1500×longueur) |
| `FEEDBACK` | fin INPUT | auto | `feedbackMs` (defaut 2000) |
| `COMPLETE` | fin FEEDBACK | resolution manche | — |

Transitions hors table → `ERR_PHASE_INVALID`.

## 4. Commandes joueur

| Commande | Phase | Payload intention | Acceptation serveur | Reponse | Erreurs |
|---|---|---|---|---|---|
| `submit_symbol` | `INPUT` | `{ symbolId, clientSeq }` | verifie ordre attendu, nonce/deadline, rate limit | `SYMBOL_OK` + index progres **ou** `SYMBOL_FAIL` + fin INPUT | `ERR_PHASE_INVALID`, `ERR_DEADLINE_EXPIRED`, `ERR_INVALID_PAYLOAD`, `ERR_RATE_LIMIT`, `ERR_ALREADY_SUBMITTED` (si complete) |
| `forfeit_round` | `BRIEFING`–`INPUT` | `{}` | marque `FORFEIT` | `FORFEIT_ACK` | `ERR_ROUND_CLOSED` |

Interdit : envoyer la sequence, un `roundIndex` de progression, un score, un "level complete" client.

## 5. Limites et config versionnee

| Cle config | Defaut v1 | Bornes |
|---|---|---|
| `initialLength` | 3 | 2–6 |
| `maxLength` | 12 | ≤ 20 |
| `lengthIncrement` | 1 | 1–2 |
| `alphabetSize` | 4 | 3–9 |
| `symbolDisplayMs` | 700 | 300–1500 |
| `gapMs` | 200 | 0–500 |
| `inputMsBase` | 15000 | 5000–60000 |
| `inputMsPerSymbol` | 1500 | 0–5000 |
| `maxWrong` | 1 | 1 (fail-fast v1) |
| `reconnectWindowSec` | 30 | 20–60 |

Seed : `roundSeed` serveur (CSPRNG). Sequence = derive deterministe `(seed, alphabetSize, length)`.

## 6. Timer

- Deadlines = `serverNow + duration` monotones stockees en checkpoint.
- Le client peut afficher un compte a rebours **indicatif** ; le refus se base sur le serveur.

## 7. Victoire, egalite, score

| Concept | Regle |
|---|---|
| Score | `symbolsCorrectTotal + 1000 * maxStreakLength` (formule v1) ; alternative config `scoreFormulaId` |
| Victoire solo | Pas de gagnant unique inter-joueurs en live ; classement apres publication par score desc |
| Egalite inter-joueurs | Tie-break : (1) plus grande longueur atteinte, (2) temps total INPUT serveur le plus bas, (3) `participantId` lexicographique |
| Gain | Applique apres publication selon regles finance/partie ; hors scope calcul runtime |

## 8. No-show, abandon

| Cas | Effet |
|---|---|
| Jamais connecte a la room avant fin `BRIEFING` | score 0, `NO_SHOW` |
| `forfeit_round` | score 0, `FORFEIT` |
| Deconnecte pendant `INPUT` sans reconnect | a expiration fenetre → score partiel des symboles deja acceptes **si** config `partialOnDisconnect=true` (defaut **false** → 0) |

## 9. Reconnect et checkpoint

- Checkpoint : phase, length courante, index input, sequence hash (pas sequence en clair dans logs), deadline, score partiel.
- Reconnect en `DISPLAY` : serveur renvoie le **reste d'affichage** depuis l'horloge (pas de replay complet avantageux si deja passe).
- Reconnect en `INPUT` : renvoie index attendu + alphabet public ; **jamais** la sequence reponse.
- Colyseus : `allowReconnection` 30s ; inputs deja `SYMBOL_OK` non rejouables.

## 10. Information publique / privee / support

| Donnee | Joueur | Observer | Admin | Support |
|---|---|---|---|---|
| Alphabet, phase, timer | oui | oui | oui | oui |
| Sequence a reproduire | uniquement pendant DISPLAY (stream ephemere) ; jamais en INPUT | non | non | non |
| Index de progression self | oui | non (seulement "en cours/fini") | meta | meta |
| Score provisoire | feedback local optionnel en FEEDBACK | non jusqu'a publication | oui | audit |

## 11. Anti-triche et fairness

- Sequence jamais dans le state public Schema ni analytics.
- `submit_symbol` hors ordre → fail ; pas de correction client.
- Prediction / autofill : rate limit + flag anomaly si cadence < `minHumanIntervalMs` (defaut 80ms).
- Pas de confiance en `clientSeq` pour le score (seulement anti-replay soft).

## 12. Accessibilite

- Symboles : forme + label texte + option pattern (pas couleur seule).
- INPUT clavier (touches mappees) et tactile.
- `prefers-reduced-motion` : transitions non essentielles reduites ; DISPLAY reste temporel (competitif).

## 13. Assets

- Set de N symboles SVG/PNG licences maison ou CC0.
- Sons optionnels de confirmation (non requis pour jouer).
- Inventaire et licences obligatoires avant P-C-QA.

## 14. Telemetrie

`ms_phase`, `ms_symbol_ok`, `ms_symbol_fail`, `ms_complete`, `ms_forfeit`, `ms_reconnect` + latence commande. Pas de sequence en clair.

## 15. Scenarios Given/When/Then

### S1 — Progression valide (L1)

- **Given** seed S, length 3, phase `INPUT`, index 0  
- **When** joueur envoie les 3 symboles corrects dans l'ordre  
- **Then** serveur accepte, passe en `FEEDBACK`/`COMPLETE`, score > 0, evidence rejouable

### S2 — Mauvais symbole (L1)

- **Given** phase `INPUT`, prochain symbole attendu A  
- **When** joueur envoie B  
- **Then** `SYMBOL_FAIL`, fin INPUT, pas d'increment de longueur

### S3 — Deadline (L1/L4)

- **Given** deadline passee  
- **When** `submit_symbol`  
- **Then** `ERR_DEADLINE_EXPIRED`, pas de changement de progression

### S4 — Reconnect mid-input (L4)

- **Given** 2 symboles OK, disconnect  
- **When** reconnect dans la fenetre  
- **Then** index 2 restaure, sequence non revelee, pas de double credit

### S5 — Observer no-leak (L4)

- **Given** manche en DISPLAY/INPUT  
- **When** observer recoit snapshots  
- **Then** aucun champ sequence / symbole attendu

### S6 — Publication (L5)

- **Given** scores provisoires calcules  
- **When** admin publie  
- **Then** joueurs voient le score issu de l'evidence runtime

## 16. Mapping AC → preuves

| AC | Niveaux |
|---|---|
| Determinisme seed/commandes | L1 |
| Refus skip/late/double | L1, L4 |
| Checkpoint/reprise | L3, L4 |
| No-leak sequence | L1 projection, L4 wire, L5 UI |
| Publication = evidence | L3, L5 |
