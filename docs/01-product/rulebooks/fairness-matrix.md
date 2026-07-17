# Matrice commune de fairness et d'audience

**Statut :** `APPROVED`  
**Version :** 1.0.0  
**Proprietaire produit :** `product-owner`  
**Decision :** `DEC-P-SEQ-01-RATIFY`  
**S'applique a :** les six cles ratifiees dans [README.md](./README.md)

## 1. Principes non negociables

1. **Serveur autoritaire.** Timestamp, position, score, rang, role, victoire, elimination et fin de manche sont calcules cote serveur uniquement.
2. **Client = intention.** Le client envoie des commandes d'intention (`press`, `submit_symbol`, `vote`, `move_intent`). Il n'envoie jamais une verite competitive.
3. **Horloge serveur monotone.** Tous les deadlines, signaux et ticks utilisent l'horloge room/serveur (pas `Date.now()` client, pas `clickedAtMs` client).
4. **Determinisme rejouable.** A seed + config + suite de commandes valides egales → meme etat et meme resultat (hors bruit de latence qui n'influence que l'ordre d'arrivee serveur).
5. **No-leak par defaut.** Toute donnee est privee sauf classification explicite publique ou audience restreinte.
6. **Reconnect sans avantage.** Une reconnexion restitue la vue autorisee et le checkpoint; elle ne regenere ni sequence, ni role, ni signal, ni position avantageuse.
7. **Crash room / reprise.** L'etat durable de manche (checkpoint) permet une reprise `RECOVERY_REQUIRED` → reprise sans rejouer les inputs deja acceptes.

## 2. Matrice d'audience (information)

Legende : `P` = public (tous participants + observer autorise + admin supervision) · `S` = self (joueur concerné) · `T` = partenaire / equipe · `A` = admin supervision · `U` = support (avec audit) · `∅` = interdit hors procedure d'exception signee.

| Classe d'information | Joueur | Partenaire / equipe | Admin | Observateur | Support |
|---|---|---|---|---|---|
| Phase de manche, timer public, capacite, statut connexion (online/offline) | P | P | P | P | P |
| Score provisoire de la manche en cours | ∅ jusqu'a publication (sauf feedback local autorise par rulebook) | ∅ | A | ∅ | U (audit) |
| Score publie | P (selon regles de publication) | P | A | P | U |
| Seed / sequence / secret solo | S (selon phase) | ∅ | ∅ | ∅ | ∅ |
| Role cache | S | ∅ | ∅ | ∅ | ∅ (voir procedure) |
| Vote non verrouille | S | ∅ | ∅ | ∅ | ∅ |
| Vote verrouille / agregat public apres lock | selon rulebook | selon rulebook | A | selon rulebook | U |
| Latence / RTT individuelle | S (optionnel, floute) | ∅ | A (agregat + anomalies) | ∅ | U |
| Evidence anti-triche brute | ∅ | ∅ | A | ∅ | U |
| Checkpoint binaire | systeme | systeme | A (meta) | ∅ | U (meta) |

### Procedure support exceptionnelle (roles / votes)

- Acces chiffrement au repos uniquement avec ticket, double autorisation admin+support, raison, duree, journal d'audit immuable.
- Jamais d'exposition dans l'UI support par defaut.
- Purge / rotation selon politique retention (P-C-LEGAL).

## 3. Politique latence et equite

| Cas | Decision commune |
|---|---|
| Ordre des commandes | Ordre d'**arrivee serveur** (monotone receive time). |
| Compensation RTT | **Interdite** pour le premier lancement sauf ADR futur. Le duel ne corrige pas le ping. |
| Input apres deadline | Refuse `ERR_DEADLINE_EXPIRED`; pas de grace client. |
| Grace serveur technique | Fenetre optionnelle ≤ 50 ms pour jitter reseau **uniquement si** documentee dans config versionnee du jeu; defaut **0**. |
| Onglet arriere-plan / blur | Le timer serveur continue. Un faux depart ou un miss n'est pas excuse par le focus. |
| Rafale / spam | Rate limit serveur par commande; surplus → `ERR_RATE_LIMIT`. |

## 4. Reconnexion (Colyseus)

Contraintes Context7 (`allowReconnection`, `onDrop` / `onLeave`, `onReconnect`) :

| Evenement | Comportement |
|---|---|
| Drop non consenti | Marquer participant `DISCONNECTED`; `allowReconnection(client, reconnectWindowSec)`. |
| Leave consenti / abandon | Pas de reserve de reconnexion; transition abandon selon rulebook. |
| Reconnect dans la fenetre | Restaurer sessionId/participation; renvoyer **snapshot audience** + phase; **pas** de rejeu d'inputs. |
| Timeout reconnexion | `reconnect expired` → politique no-show / abandon du rulebook. |
| Fenetre par defaut | `30s` (override par jeu : 20–60s). |
| Pendant signal / tick survie | L'horloge et la simulation **continuent**; le joueur revient dans l'etat courant, pas dans le passe. |

## 5. Crash room et checkpoint

| Element | Decision |
|---|---|
| Contenu checkpoint | phase, seed/config version, scores/progress serveur, roles hashes/chiffres, inputs acceptes (ids), timers restants absolus (deadline epoch serveur). |
| Frequence | a chaque transition de phase et apres chaque commande competitive acceptee (ou tick survie N Hz). |
| Reprise | room recree / restaure → `RECOVERY_REQUIRED` puis reprise sur checkpoint; clients se reconnectent. |
| Interdit | regenerer seed, redistribuer roles, rejouer commandes, accepter un checkpoint client. |

## 6. No-show, abandon, void

| Situation | Decision commune (detail par jeu) |
|---|---|
| No-show avant premiere commande active | forfait / score 0 / adversaire gagne selon famille; gain eventuel non verse si regle finance l'exige. |
| Abandon volontaire mid-round | `FORFEIT`; adversaire/equipe adverse gagne ou joueur elimine; audit. |
| Tous no-show | manche `VOID` possible apres verification admin. |
| Desync massif / bug serveur | admin peut `VOID` avec motif audite; jamais un client. |

## 7. Scoring et publication (lien)

- Score provisoire calcule par runtime serveur → evidence.
- Verification admin obligatoire avant publication (voir [scoring-and-publication.md](../scoring-and-publication.md)).
- Observer et joueurs ne voient le definitif qu'apres `publish_results`.

## 8. Anti-triche transversale

- Rejet de toute commande hors phase, hors acteur, hors nonce/deadline.
- Detection anomalies (latence impossible, cadence surhumaine, prediction de signal) → flag evidence, **pas** de ban automatique dans v1 rulebook.
- Logs sans secrets (pas de role en clair, pas de sequence complete, pas de vote non public).

## 9. Accessibilite transversale

- Aucun signal purement monomodal obligatoire (visuel **et** non-visuel pour le duel; symboles + labels pour le solo).
- Contraste, clavier, tactile, `prefers-reduced-motion` respectes pour animations non competitivement critiques.
- Textes d'erreur et de phase localisables (cles i18n, contenu FR v1).

## 10. Telemetrie commune (sans PII inutile)

Evenements minimaux : `phase_enter`, `command_accept`, `command_reject`, `disconnect`, `reconnect`, `forfeit`, `round_resolve`, `anomaly_flag`.  
Dimensions : `minigameKey`, `partyId`, `roundId`, `phase`, `errorCode`, latences agregees.  
Interdit : payload de role, sequence, vote, position fine en clair dans analytics publics.

## 11. Niveaux de preuve

| Niveau | Usage pour les six jeux |
|---|---|
| L1 | Determinisme seed, transitions, scoring, fuzz commandes, no-leak unitaire des projections |
| L3 | Checkpoint, evidence, contraintes persistence, reprise |
| L4 | Colyseus multi-clients, reconnect, latence injectee, observer wire scan |
| L5 | Parcours admin+joueurs+observer+publication navigateur reel |

Chaque rulebook mappe ses AC a ces niveaux.

## 12. Codes d'erreur communs

| Code | Sens |
|---|---|
| `ERR_NOT_PARTICIPANT` | acteur hors manche |
| `ERR_PHASE_INVALID` | commande hors phase |
| `ERR_DEADLINE_EXPIRED` | apres deadline serveur |
| `ERR_RATE_LIMIT` | trop de commandes |
| `ERR_INVALID_PAYLOAD` | schema / bornes |
| `ERR_ALREADY_SUBMITTED` | double soumission interdite |
| `ERR_NOT_YOUR_TURN` | hors tour / hors relais |
| `ERR_RECONNECT_EXPIRED` | fenetre de reconnexion depassee |
| `ERR_FORBIDDEN_AUDIENCE` | acteur non autorise (observer commande, etc.) |
| `ERR_ROUND_CLOSED` | manche deja resolue |
