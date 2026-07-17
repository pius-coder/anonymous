# Rulebook — `silent-vote` (Le saboteur)

| Champ | Valeur |
|---|---|
| Cle | `silent-vote` |
| Famille | Role cache |
| Titre affiche | Le saboteur |
| Statut | `APPROVED` |
| Version | 1.0.0 |
| Proprietaire produit | `product-owner` |
| Decision de ratification | `DEC-P-SEQ-01-RATIFY` |
| Date | 2026-07-17 |

> **Avertissement legacy :** le nom de cle `silent-vote` et d'anciens resolvers de "vote majoritaire"
> ne definissent **pas** ce jeu. Ce rulebook impose des **roles caches reels**, une information privee,
> une discussion, un vote verrouille et des conditions de victoire de camp.

## 1. Objectif

Parmi les joueurs, un ou plusieurs **Saboteurs** cherchent a ne pas etre identifies. Les **Villageois**
discutent puis votent pour eliminer un suspect. La victoire depend du camp, pas d'un simple score de
points individuels.

## 2. Taille et formation

| Joueurs N | Saboteurs | Villageois |
|---|---:|---:|
| 4–5 | 1 | N−1 |
| 6–8 | 2 | N−2 |
| 9–12 | 3 | N−3 |

- N min = 4, max = 12 (sinon manche `INELIGIBLE_SIZE` / void admin).
- Distribution : derivee de `roleSeed` CSPRNG serveur ; **une seule** assignation par manche.
- Aucun choix de role joueur.

## 3. Phases

| Phase | Description | Timer |
|---|---|---|
| `BRIEFING_PUBLIC` | Regles sans reveler qui est quoi | 5000 |
| `ROLE_PRIVATE` | Remise du role self | 4000 |
| `DISCUSSION` | Chat/reactions autorises selon config | `discussionMs` defaut 90000 |
| `VOTE_OPEN` | Chaque joueur vote **une** cible ou `ABSTAIN` | `voteMs` defaut 30000 |
| `VOTE_LOCK` | Plus aucune modification de vote | immediat a deadline ou tous votes |
| `RESOLUTION` | Depouillement serveur | 2000 |
| `REVELATION` | Revelation autorisee (roles des elimines / fin) | 5000 |
| `COMPLETE` | Fin | — |

## 4. Roles et victoire

### Roles

| Role | Information privee | Objectif |
|---|---|---|
| `VILLAGER` | "Vous etes Villageois" | Eliminer au moins un saboteur (ou majorite des saboteurs si multi) selon `villagerWinMode` |
| `SABOTEUR` | "Vous etes Saboteur" + si `saboteurTeamVisible=true` (defaut **false** en v1) liste co-saboteurs | Survie : ne pas etre elimine par le vote (mode `saboteurWinMode=SURVIVE_VOTE` defaut) |

v1 defauts :

- `villagerWinMode` = `ELIMINATE_ALL_SABOTEURS` si le vote elimine un joueur qui est saboteur **et**, s'il reste des saboteurs en multi-tour, une **seule** ronde de vote v1 elimine **un** joueur : victoire villageoise si la cible est saboteur ; sinon victoire saboteur.
- Pour multi-saboteurs en **une** ronde : villageois gagnent si cible ∈ saboteurs ; saboteurs gagnent sinon (y compris egalite/abstention majoritaire).
- `saboteurWinMode` = `AVOID_ELIMINATION` (aucun saboteur elimine → saboteurs gagnent).

### Resolution du vote

1. A `VOTE_LOCK`, chaque vote est immuable.
2. Depouillement : comptes par cible ; `ABSTAIN` ne compte pas pour une cible.
3. Cible elue = max votes ; si **egalite stricte** entre ≥2 cibles → `NO_ELIMINATION`.
4. Si tous abstention ou aucun vote valide → `NO_ELIMINATION`.
5. `NO_ELIMINATION` ⇒ **victoire saboteur** (defaut `noElimBenefitsSaboteur=true`).
6. Si cible unique elue : joueur `ELIMINATED` ; camps evalues ; revelation selon matrice.

## 5. Commandes

| Commande | Phase | Payload | Serveur | Erreurs |
|---|---|---|---|---|
| `cast_vote` | `VOTE_OPEN` | `{ targetParticipantId \| ABSTAIN }` | upsert vote self jusqu'au lock | `ERR_PHASE_INVALID`, `ERR_INVALID_PAYLOAD` (self-vote interdit si `allowSelfVote=false` defaut), `ERR_DEADLINE_EXPIRED` |
| `cast_vote` apres lock | — | refuse | `ERR_ROUND_CLOSED` / `ERR_PHASE_INVALID` | |
| `discussion_message` | `DISCUSSION` | `{ text }` borne | moderation rate limit ; pas de canal role | `ERR_RATE_LIMIT`, `ERR_INVALID_PAYLOAD` |
| `forfeit_round` | avant RESOLUTION | `{}` | joueur sort ; son role reste en simu ; vote auto `ABSTAIN` | |

Observer / admin **ne votent pas** : `ERR_FORBIDDEN_AUDIENCE`.

## 6. Limites / config

| Cle | Defaut |
|---|---|
| `discussionMs` | 90000 |
| `voteMs` | 30000 |
| `allowSelfVote` | false |
| `saboteurTeamVisible` | false |
| `noElimBenefitsSaboteur` | true |
| `reconnectWindowSec` | 45 |
| `maxMessageLen` | 200 |
| `encryptRolesAtRest` | true (exigence plateforme) |

## 7. Score / gain

| Camp gagnant | Score joueur |
|---|---|
| Villageois gagnent | chaque villageois 100 ; chaque saboteur 0 |
| Saboteurs gagnent | chaque saboteur 100 ; chaque villageois 0 |
| Forfeit individuel | 0, n'inverse pas seul le camp sauf s'il etait dernier villageois (N/A v1 single elim) |

Egalite de score inter-joueurs du meme camp : tie-break non applicable au gain de camp ; classement secondaire par participation id si besoin UI.

## 8. No-show / abandon

| Cas | Effet |
|---|---|
| No-show avant ROLE_PRIVATE | exclus ; redistribution **interdite** si roles deja tires → si roles non tires, retirer de la pool ; si deja tires, role reste "ghost" non votable, `NO_SHOW` score 0, ne compte pas comme elimine pour victoire |
| Disconnect pendant vote | peut reconnect et voter tant que `VOTE_OPEN` ; sinon abstention |
| Abandon | `ABSTAIN` force, score 0, role non revele avant REVELATION |

**Interdit :** redistribuer un role a la reconnexion.

## 9. Reconnect / checkpoint

- Checkpoint : phase, role cipher per player, votes cipher, discussion meta, deadlines.
- Reconnect : **meme role**, meme vote s'il existe, phase courante.
- Jamais de nouveau `roleSeed` mid-round.

## 10. Information (no-leak)

| Donnee | Self | Autres joueurs | Observer | Admin supervision | Support |
|---|---|---|---|---|---|
| Role self | oui | **non** | **non** | **non** (defaut) | **non** (defaut) |
| Co-saboteurs | seulement si config true | non | non | non | non |
| Vote self avant lock | oui | non | non | non | non |
| Depouillement agregé | apres RESOLUTION | oui | oui | oui | audit |
| Role d'un elimine | a REVELATION | oui | oui | oui | audit |
| Roles non elimines si fin | a REVELATION fin de manche | oui (config `revealAllAtEnd=true` defaut) | oui | oui | audit |

### Wire / logs / DOM

- Schema public : pas de champ `role`.
- Projections privees : canal/session filtre Colyseus ou message direct self-only.
- Logs : role id chiffre ou omis ; tests adversariaux obligatoires (AC).
- Support : procedure exception fairness-matrix §2 uniquement.

## 11. Anti-triche / fairness

- Un vote par joueur ; lock dur.
- Cible doit etre participant vivant non no-show.
- Double vote = upsert, pas deux voix.
- Observer malveillant : zero commande, zero role.
- Collusion vocale externe : risque social accepte ; pas de mitige total.

## 12. Accessibilite

- Role annonce textuellement (pas couleur seule).
- Vote : liste nominative + confirmation.
- Discussion : alternatives si chat difficile (reactions prefaites optionnelles config).

## 13. Assets

- Dos de carte role, icones camps reveles, UI vote.

## 14. Telemetrie

`role_deal` (compte roles **agregé**, pas mapping joueur), `vote_cast` (sans cible en clair si possible — hash), `vote_lock`, `camp_result`, `noleak_probe_fail`.  
Interdit : `userId→role` en clair dans analytics.

## 15. Scenarios

### S1 — Distribution (L1)

- **Given** N=6  
- **When** deal  
- **Then** 2 saboteurs, 4 villageois, chaque self voit son role seulement

### S2 — Victoire villageoise (L1)

- **Given** vote majoritaire sur un saboteur  
- **When** RESOLUTION  
- **Then** camp villageois gagne ; revelation cible

### S3 — Victoire saboteur par mauvaise cible (L1)

- **Given** vote sur villageois  
- **Then** saboteurs gagnent

### S4 — Egalite de votes (L1)

- **Given** 2–2  
- **Then** NO_ELIMINATION → saboteurs gagnent

### S5 — No-leak observer (L4)

- **When** scan wire observer pendant ROLE_PRIVATE/VOTE_OPEN  
- **Then** aucun role ni vote d'autrui

### S6 — Reconnect meme role (L3/L4)

- **Given** saboteur disconnect  
- **When** reconnect  
- **Then** role saboteur inchange, pas de re-deal

### S7 — Late vote (L1)

- **When** vote apres LOCK  
- **Then** `ERR_PHASE_INVALID`, depouillement inchange

### S8 — Publication (L5)

- **Then** scores de camp publies sans fuite prematuree avant REVELATION/publish policy

## 16. Mapping AC → preuves

| AC | Niveaux |
|---|---|
| Roles reels + victoire de camp | L1 |
| No-leak wire/DOM/log | L1 projection, L4 adversarial, L5 |
| Vote lock / egalite / abstention | L1, L4 |
| Reconnect meme role | L3, L4 |
| Support non omniscient | L4 policy tests |
| Parcours complet | L5 |
