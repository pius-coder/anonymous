# Rulebook — `trust-bridge` (Le pont fragile)

| Champ | Valeur |
|---|---|
| Cle | `trust-bridge` |
| Famille | Alliance (binome) |
| Titre affiche | Le pont fragile |
| Statut | `APPROVED` |
| Version | 1.0.0 |
| Proprietaire produit | `product-owner` |
| Decision de ratification | `DEC-P-SEQ-01-RATIFY` |
| Date | 2026-07-17 |

## 1. Objectif

Deux partenaires doivent synchroniser des actions pour "stabiliser un pont" : chaque joueur detient
une demi-information serveur et doit soumettre une action complementaire dans la fenetre. La reussite
est collective ; la trahison (action incompatible) fait echouer le binome.

## 2. Taille et formation

| Parametre | Valeur |
|---|---|
| Taille binome | 2 |
| Appairage | Deterministe : liste eligibles triee par `participantId`, paires (0,1), (2,3), … avec `pairingSeed` pour shuffle stable |
| **Joueur impair** | Si N impair : le dernier apres shuffle est `UNPAIRED` |
| Traitement `UNPAIRED` | (1) si un no-show libere un partenaire avant fin `PAIR_LOCK`, re-paire ; (2) sinon mode `SOLO_BRIDGE` : meme epreuve avec demie-info complete serveur-side simulant le partenaire **neutre** (actions auto-optimales a `soloAssistDelayMs`), score multiplie par `unpairedScoreFactor` (defaut **0.85**), flag `UNPAIRED` dans evidence |
| Remplacement | Interdit mid-round ; seulement avant `PAIR_LOCK` via re-pair no-show |

## 3. Phases

| Phase | Description | Timer |
|---|---|---|
| `BRIEFING` | Regles + revelation partenaire | `briefingMs` 5000 |
| `PAIR_LOCK` | Figage paires | `pairLockMs` 3000 |
| `PRIVATE_HINT` | Chaque joueur recoit sa demie-cle privee | `hintMs` 4000 |
| `SYNC_WINDOW` | Soumissions d'action | `syncMs` 8000 |
| `RESOLVE` | Compatibilite evaluee serveur | 2000 |
| `COMPLETE` | Fin | — |

## 4. Commandes

| Commande | Phase | Payload | Serveur | Erreurs |
|---|---|---|---|---|
| `submit_bridge_action` | `SYNC_WINDOW` | `{ actionId }` dans alphabet commun | une action par joueur ; lock au submit | `ERR_PHASE_INVALID`, `ERR_ALREADY_SUBMITTED`, `ERR_INVALID_PAYLOAD`, `ERR_DEADLINE_EXPIRED` |
| `forfeit_round` | avant COMPLETE | `{}` | binome `FAIL` si un forfait (defaut) | `ERR_ROUND_CLOSED` |

Alphabet actions : config `actionIds[]` (defaut 4 actions). Compatibilite : table serveur `compatiblePairs` derivee du seed (pas choisie client).

## 5. Limites

| Cle | Defaut |
|---|---|
| `syncMs` | 8000 |
| `unpairedScoreFactor` | 0.85 |
| `soloAssistDelayMs` | 500 |
| `requireBothActions` | true |
| `reconnectWindowSec` | 45 |

## 6. Timer

Deadlines serveur ; fin `SYNC_WINDOW` → resolution meme si une action manque.

## 7. Victoire / score / egalite

| Cas | Score binome |
|---|---|
| Deux actions compatibles dans le temps | `SUCCESS` score 100 × factor |
| Actions incompatibles | `FAIL` 0 |
| Une seule action (`requireBothActions`) | `FAIL` 0 (sauf SOLO_BRIDGE avec assist) |
| Aucune action | `FAIL` 0 |
| Classement | par score binome ; tie-break temps de double-submit (max des deux receiveTs) le plus bas ; puis id paire |

Gain : attribue a chaque membre du binome selon publication (split egal defaut).

## 8. No-show / abandon

| Cas | Effet |
|---|---|
| Partenaire no-show avant PAIR_LOCK | re-pair si possible ; sinon autre devient UNPAIRED → SOLO_BRIDGE |
| Partenaire no-show apres PAIR_LOCK | binome `FAIL` ou SOLO d'urgence si config `emergencySoloOnPartnerDrop=true` (defaut **false** → FAIL 0 pour les deux, flag PARTNER_NO_SHOW) |
| Abandon d'un membre | binome FAIL ; abandonne `FORFEIT` |

## 9. Reconnect / checkpoint

- Checkpoint : paires, hints hashes, actions soumises, phase, deadlines.
- Reconnect restitue **son** hint et **sa** action si deja soumise ; pas le hint partenaire.
- Si partenaire offline : timer continue ; pas de pause automatique.

## 10. Information

| Donnee | Self | Partenaire | Observer | Admin | Support |
|---|---|---|---|---|---|
| Identite partenaire (pseudo public) | oui | oui | oui | oui | oui |
| Demie-cle / hint | self only | non | non | non | non |
| Action self | self | apres RESOLVE (si publicite `revealActionsOnResolve=true` defaut true) | apres RESOLVE | oui | audit |
| Table de compatibilite complete | non | non | non | meta | non |

## 11. Anti-triche / fairness

- Compatibilite calculee serveur uniquement.
- Pas d'action "force success" client.
- Side channel hors bande non mitigeable techniquement ; regle produit : collusion = risque accepte en alliance forcee, telemetrie des timings anormaux.

## 12. Accessibilite

- Hints textuels + icones.
- Confirmation claire de soumission.
- Timer accessible (aria-live poli sur phase).

## 13. Assets

- Pont (etats stable/fragile/effondre), icones d'actions licencees.

## 14. Telemetrie

`bridge_pair`, `bridge_action`, `bridge_result`, `bridge_unpaired`, disconnect partenaire. Pas de hint en clair.

## 15. Scenarios

### S1 — Succes binome (L1)

- **Given** hints compatibles H1/H2  
- **When** A et B soumettent actions compatibles  
- **Then** SUCCESS 100

### S2 — Joueur impair (L1)

- **Given** 5 joueurs  
- **When** pairing  
- **Then** 2 paires + 1 UNPAIRED en SOLO_BRIDGE factor 0.85

### S3 — Partenaire drop apres lock (L1/L4)

- **Given** paire lockee, B disconnect expire  
- **When** fin SYNC  
- **Then** FAIL PARTNER_NO_SHOW (defaut)

### S4 — No-leak hint (L4)

- **When** snapshots observer/B  
- **Then** hint de A absent

### S5 — Reconnect conserve action (L3/L4)

- **Given** A a submit  
- **When** A reconnect  
- **Then** pas de second submit ; action conservee

### S6 — Publication (L5)

- **Then** scores membres = evidence binome

## 16. Mapping AC → preuves

| AC | Niveaux |
|---|---|
| Pairing deterministe + impair | L1 |
| Compatibilite serveur | L1 |
| No-leak hints | L1, L4 |
| Partner drop / solo | L1, L4 |
| Checkpoint | L3, L4 |
