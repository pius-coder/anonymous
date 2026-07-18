# Rulebook — `team-relay` (Relais de mini-defis)

| Champ | Valeur |
|---|---|
| Cle | `team-relay` |
| Famille | Equipe |
| Titre affiche | Relais de mini-defis |
| Statut | `APPROVED` |
| Version | 1.0.0 |
| Proprietaire produit | `product-owner` |
| Decision de ratification | `DEC-P-SEQ-01-RATIFY` |
| Date | 2026-07-17 |

## 1. Objectif

Des equipes de 3 a 4 joueurs, **formees par choix mutuel**, enchainent des etapes de relais. Seul le
membre dont c'est le tour peut soumettre l'etape courante. Le serveur valide l'ordre, l'autorite du
membre et le succes de chaque etape.

## 2. Taille et formation

| Parametre | Valeur |
|---|---|
| Taille equipe | 3 ou 4 (`minTeamSize=3`, `maxTeamSize=4`) |
| Formation | **Choix mutuel** pendant `TEAM_FORM` : invitation + acceptation bilaterale jusqu'a taille valide |
| Figage | `TEAM_LOCK` : equipes incompletes → `INCOMPLETE_TEAM` (ne jouent pas / score 0) |
| Capitaine | Premier createur du groupe ; peut `set_order` avant lock si tous acceptent |
| Joueurs sans equipe au lock | `UNTEAMED` → score 0 `NO_TEAM` (pas d'auto-remplissage force v1) |

### Formation mutuelle — regles

1. `invite_to_team(targetId)` : cree ou etend une proposition.
2. `accept_invite(teamProposalId)` : le cible accepte.
3. Un joueur n'appartient qu'a **une** proposition acceptee a la fois.
4. `leave_team` libre avant `TEAM_LOCK`.
5. Apres lock : plus de mutation ; ordre des relays = `memberOrder[]` serveur.

## 3. Phases

| Phase | Description | Timer |
|---|---|---|
| `BRIEFING` | Regles | 5000 |
| `TEAM_FORM` | Invitations mutuelles | `formMs` defaut 60000 |
| `TEAM_LOCK` | Figage + validation tailles | 3000 |
| `RELAY_STEP` | Etape k pour membre `order[k % size]` | `stepMs` defaut 20000 par etape |
| `STEP_FEEDBACK` | Feedback | 1500 |
| `RESOLVE` | Score equipe | 2000 |
| `COMPLETE` | Fin | — |

Nombre d'etapes `stepCount` defaut 6 (config).

## 4. Commandes

| Commande | Phase | Acteur | Effet | Erreurs |
|---|---|---|---|---|
| `invite_to_team` | `TEAM_FORM` | joueur | propose | `ERR_INVALID_PAYLOAD`, `ERR_ALREADY_SUBMITTED` (deja en equipe) |
| `accept_invite` | `TEAM_FORM` | cible | joint | `ERR_PHASE_INVALID`, invite invalide → `ERR_INVALID_PAYLOAD` |
| `decline_invite` | `TEAM_FORM` | cible | refuse | |
| `leave_team` | `TEAM_FORM` | membre | quitte | |
| `set_member_order` | `TEAM_FORM` | capitaine | ordre si tous `ack_order` | `ERR_FORBIDDEN_AUDIENCE` si non capitaine |
| `ack_order` | `TEAM_FORM` | membre | valide ordre | |
| `submit_step` | `RELAY_STEP` | **membre actif uniquement** | valide defi etape | `ERR_NOT_YOUR_TURN`, `ERR_DEADLINE_EXPIRED`, `ERR_ALREADY_SUBMITTED` |
| `forfeit_round` | gameplay | membre | equipe `FORFEIT` (defaut all-forfeit) | |

Defi etape v1 : mini-tache serveur (`tap_pattern`, `pick_correct_id`) tiree du seed ; pas un sous-runtime libre.

## 5. Limites

| Cle | Defaut |
|---|---|
| `formMs` | 60000 |
| `stepMs` | 20000 |
| `stepCount` | 6 |
| `minTeamSize` | 3 |
| `maxTeamSize` | 4 |
| `reconnectWindowSec` | 45 |

## 6. Timer

Chaque `RELAY_STEP` a sa deadline ; expiration = etape `FAIL`, passage suivante (pas de blocage infini).

## 7. Victoire / score / egalite

| Metrique | Regle |
|---|---|
| Score equipe | `100 * stepsSuccess / stepCount` |
| Classement | score desc ; tie-break temps cumulé succes le plus bas ; puis `teamId` |
| Victoire | equipe(s) au meilleur score apres publication |
| Membre | recoit le score equipe (pas de score individuel separe v1) |

## 8. No-show / abandon

| Cas | Effet |
|---|---|
| Membre manquant au TEAM_LOCK | equipe incomplete → 0 |
| Membre actif disconnect expire pendant son etape | etape FAIL ; relais continue |
| Abandon d'un membre | equipe FORFEIT 0 (config `memberForfeitSinksTeam=true`) |

## 9. Reconnect / checkpoint

- Checkpoint : equipes, ordre, step index, reussites, defi courant hash, deadlines.
- Reconnect membre actif : restitue defi courant **self** ; pas les defis futurs.
- Membre non actif : voit progression equipe publique.

## 10. Information

| Donnee | Self | Equipe | Observer | Admin | Support |
|---|---|---|---|---|---|
| Composition equipe, tour courant, score etapes public (reussi/echoue) | oui | oui | oui | oui | oui |
| Payload du defi courant | membre actif | non (sauf si `shareStepWithTeam=false` defaut) | non | non | non |
| Invitations pending | concernes | non global | non | meta | non |

## 11. Anti-triche / fairness

- Seul le membre actif : `ERR_NOT_YOUR_TURN` sinon.
- Defi et validation serveur.
- Pas de soumission anticipée d'etapes futures.

## 12. Accessibilite

- Indication forte du "c'est ton tour" (visuel + son + texte).
- Defis jouables clavier/tactile.
- Liste d'equipe lisible lecteur d'ecran.

## 13. Assets

- HUD relais, temoins d'etapes, avatars equipe.

## 14. Telemetrie

`team_form`, `team_lock`, `relay_step_result`, `not_your_turn_reject`, forfeit.

## 15. Scenarios

### S1 — Formation mutuelle (L1)

- **Given** A invite B et C, tous acceptent  
- **When** TEAM_LOCK  
- **Then** equipe 3 valide

### S2 — Equipe incomplete (L1)

- **Given** A+B seulement  
- **When** lock  
- **Then** INCOMPLETE_TEAM score 0

### S3 — Pas ton tour (L1/L4)

- **Given** tour de A  
- **When** B `submit_step`  
- **Then** `ERR_NOT_YOUR_TURN`

### S4 — Expiration etape (L1)

- **When** deadline step  
- **Then** FAIL step, index++

### S5 — Reconnect actif (L4)

- **Then** meme defi, pas de skip avantageux

### S6 — Publication (L5)

- **Then** score equipe publie = evidence

## 16. Mapping AC → preuves

| AC | Niveaux |
|---|---|
| Choix mutuel + lock | L1, L4 |
| Autorite membre actif | L1, L4 |
| Incomplete / no-team | L1 |
| Checkpoint relais | L3, L4 |
| E2E formation→publication | L5 |
