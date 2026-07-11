# Edge cases officiels

## Principe general

Chaque edge case doit produire :

1. une detection automatique ;
2. une decision par defaut connue avant session ;
3. une intervention admin limitee ;
4. une trace complete dans la feuille de match.

Aucun incident ne doit obliger les admins a inventer une regle pendant la partie.

Statuts incident :

```text
DETECTED
AUTO_RESOLVED
NEEDS_REVIEW
UNDER_REVIEW
DECIDED
APPEALED
FINAL
```

Decisions possibles :

```text
CONTINUE
PAUSE
RESUME
IGNORE_INPUT
APPLY_TIMEOUT
TECHNICAL_FORFEIT
CORRECT_RESULT
REINSTATE_PLAYER
INDIVIDUAL_REPLAY
DUEL_REPLAY
ROUND_REPLAY
VOID_ROUND
END_SESSION
```

## Creation de session

| Edge case                       | Gestion                                                           |
| ------------------------------- | ----------------------------------------------------------------- |
| Minimum joueurs non atteint     | Lancement bloque, report ou reconfiguration officielle            |
| Maximum depasse                 | Refus ou attente, aucun ajout force apres lock                    |
| Nom duplique                    | Identifiants internes uniques, suffixe visuel possible            |
| Nom interdit                    | Filtre/moderation avant lancement                                 |
| Joueur rejoint apres lock       | Refus sauf exception avant premier round avec double confirmation |
| Regle modifiee apres lock       | Refus ou nouvelle version de session                              |
| Jeu exige plus de joueurs       | Jeu incompatible, remplacement propose                            |
| Nombre impair pour duel         | BYE selon regle predefinie                                        |
| Equipes incompatibles           | Repartition validee ou jeu remplace                               |
| `winnersCount` incoherent       | Configuration rejetee                                             |
| Double clic creation session    | `commandId` idempotent                                            |
| Feature indisponible, ex. audio | Validation compatibilite echoue                                   |

## Identite et connexion

| Edge case                          | Regle                                               |
| ---------------------------------- | --------------------------------------------------- |
| Refresh page                       | Meme `sessionPlayerId` avec jeton                   |
| Meme nom affiche                   | Identite technique differente                       |
| Reconnect token sur deux appareils | Premiere connexion valide, seconde bloquee/signalee |
| Plusieurs onglets                  | Un controle actif, autres spectateurs/deconnectes   |
| Changement telephone               | Reconnexion avec jeton valide + challenge           |
| Perte jeton                        | Pas de retour par simple nom                        |
| Retour apres elimination           | Spectateur                                          |
| Joueur expulse revient             | Jeton invalide                                      |
| Admin joue                         | Identites admin/joueur separees                     |
| Pseudo "admin"                     | Filtre visuel, aucun droit                          |

## Deconnexion

| Moment                | Decision par defaut                              |
| --------------------- | ------------------------------------------------ |
| Lobby                 | Place conservee pendant fenetre                  |
| Countdown             | Maintenu ou suspendu selon nombre affecte        |
| Observation           | Round continue, resync au retour                 |
| Avant action decisive | Reconnect window puis timeout                    |
| Apres choix secret    | Choix conserve et scelle                         |
| Tour par tour         | Tour gele si politique le permet                 |
| Simulation continue   | Gel, etat neutre ou forfait selon jeu            |
| Vote deja soumis      | Vote conserve                                    |
| Vote non soumis       | Abstention/vote nul/exclusion quorum selon fiche |
| Apres qualification   | Qualification conservee                          |
| Apres elimination     | Aucun impact sportif                             |
| Publication resultats | Aucun impact sportif                             |

Plusieurs deconnexions :

- un joueur : politique individuelle ;
- deux joueurs d'un duel : manche gelee ou rejouee ;
- equipe entiere : incident collectif ;
- plusieurs joueurs meme operateur : suspicion panne reseau ;
- plus de 20% de la session : pause automatique possible ;
- tous deconnectes : suspendre et reprendre depuis snapshot ;
- ordre actions indeterminable : revision ou rejeu.

## Temps, latence et synchronisation

| Edge case                       | Gestion                                         |
| ------------------------------- | ----------------------------------------------- |
| Action exactement a la deadline | Deadline serveur/DB en precision monotone       |
| Action legerement apres         | Rejet sauf marge reseau predefinie              |
| Ping brutalement eleve          | Compensation plafonnee                          |
| Ping instable                   | Mediane + jitter recent                         |
| Horloge telephone fausse        | Aucun impact                                    |
| Telephone veille                | Interruption journalisee, timeout normal        |
| Animation locale en retard      | Signal serveur prioritaire, ack rendu si requis |
| Signal non affiche a un joueur  | Incident individuel                             |
| Signal non affiche a plusieurs  | Incident collectif                              |
| Deux clics simultanes           | `tiePolicy`                                     |
| Clic avant signal               | Faux depart si serveur le prouve                |
| Message double                  | Dedup par `inputId`/nonce                       |
| Messages desordonnes            | Sequence, sinon rejet                           |
| Paquet ancien apres phase       | `STALE_INPUT`                                   |
| Timer visible different         | Timer serveur prioritaire                       |
| Pause pendant timer             | Horloge logique si gelable                      |
| Jeu non gelable                 | Pause interdite ou round annule                 |

Chaque fiche declare :

```text
latencyPolicy
fairnessWindowMs
lateInputPolicy
simultaneousActionPolicy
clockSyncRequired
renderAcknowledgementRequired
```

## Classement et qualification

| Edge case                            | Gestion                                          |
| ------------------------------------ | ------------------------------------------------ |
| Egalite au seuil                     | Tie-break fiche                                  |
| Tie-break insuffisant                | Sudden death ou multi-qualification si autorisee |
| Plus de qualifies que `winnersCount` | Tie-break supplementaire                         |
| Moins de qualifies                   | Resultat variable ou manche complementaire       |
| Aucun gagnant                        | Autorise seulement si `zeroWinnerPolicy`         |
| Tous reussissent                     | Classement secondaire ou allWinnerPolicy         |
| Score impossible                     | Quarantaine/revision                             |
| Division par zero                    | Erreur serveur, resultat non publiable           |
| DNF multiples                        | Classement progression secondaire                |
| Elimine et qualifie                  | Etat incoherent, publication bloquee             |
| Joueur absent classement             | Recalcul                                         |
| Recalcul different                   | Revision obligatoire                             |
| Score manuel                         | Double approbation et preuve                     |
| Correction au seuil                  | Recalcul joueurs affectes                        |
| Correction apres publication         | Nouvelle version officielle                      |

## Solo

- question insoluble : annuler element ;
- mot absent dictionnaire : exclure reponse du score ;
- plusieurs bonnes reponses : annuler question ;
- image/audio non charge : nouvelle instance equivalente ou incident collectif ;
- puzzle invalide : nouvelle seed avant start ;
- difficulte non equivalente : verification statistique ;
- seed repetee : nouvelle seed ;
- completion instantanee : audit anti-triche ;
- changement orientation : UI gelee sans changer temps officiel ;
- background app : evenement enregistre ;
- score partiel apres timeout : progression validee.

## Duel

- un seul pret : attente limitee puis forfait/remplacement ;
- deux non prets : duel reporte ;
- depart avant debut : remplacement ou BYE ;
- depart apres choix secret : choix conserve ;
- faux depart double : manche rejouee ;
- choix secret manquant : timeout individuel ;
- choix double : premier ou dernier selon fiche ;
- egalite : sudden death ;
- latence haute : compensation plafonnee ;
- cibles differentes : manche annulee ;
- ordre tour corrompu : rollback snapshot ;
- ressource commune double : premiere transaction validee ;
- resultat contredit score : publication bloquee.

## Alliance forcee

Non incidents si autorises : refuser de cooperer, mentir, trahir pacte, garder cle, prendre pot.

Incidents : chat absent, info privee non distribuee, double moitie de code, code impossible, fuite d'information, validation hors fenetre, ressource unique double, admin lit chat prive sans motif.

## Equipe libre

- joueur sans equipe : auto-affectation/BYE/remplacement ;
- equipe incomplete : handicap ou complement predefini ;
- equipe trop grande : derniers non valides retires ;
- leader deconnecte : successeur predefini ;
- repartition != 100% ou negative : refus ;
- vote sans quorum : regle fiche ;
- etape double : premiere action autorisee ;
- objet collectif double : verrou transactionnel ;
- score equipe egal : tie-break collectif ;
- sabotage sans role : mauvaise performance sauf preuve interdite.

## Survie collective

- trop peu de places : autorise seulement si prevu ;
- deux joueurs meme place : politique occupation ;
- arrivees dans fairnessWindow : egalite/priorite regle ;
- rendu client contradictoire : serveur prioritaire + incident rendu ;
- danger pendant reconnexion : politique protection/etat neutre ;
- tous elimines : nul/fin/rejeu selon regle ;
- survivants sous `winnersCount` : tous qualifie ou manche compensatoire ;
- elimination massive : pause et controle silencieux ;
- snapshot manquant : revision/rejeu ;
- tick insuffisant : cas proches en revision.

## Role cache

- aucun role distribue : round bloque ;
- role double : annulation avant revelation ;
- role mauvais joueur : fuite critique + rejeu ;
- role visible shared state : incident critique ;
- saboteur deconnecte avant debut : nouveau tirage si secret non revele ;
- vote visible avant cloture : vote compromis ;
- egalite vote : second tour/aucune elimination/tirage prevu ;
- mauvais joueur elimine par vote valide : resultat normal ;
- sabotage non detecte : resultat normal ;
- action sabotage non journalisee : revision ;
- mauvaise action normale prise pour sabotage : intention non prouvable ;
- spectateur recoit secret : revision critique.

## Vote, chat et communication

Votes :

- aucun vote : resultat par defaut ;
- vote apres fermeture : rejet ;
- modification vote : seulement si fiche l'autorise ;
- deconnecte apres vote : conserve ;
- deconnecte avant vote : abstention/quorum selon fiche ;
- compteur influence vote secret : compteur masque ;
- option inexistante : rejet ;
- vote anonyme : identite scellee.

Chat :

- message apres fermeture : rejet ;
- message transit : serverTimestamp tranche ;
- spam : rate limit ;
- insulte : moderation ;
- information interdite : incident disciplinaire ;
- admin donne strategie : violation admin ;
- mauvaise audience : incident communication ;
- service chat down : pause/remplacement si chat obligatoire.

## Hasard

- seed absente : hasard non certifiable ;
- seed revelee trop tot : round compromis ;
- meme seed pour groupes differents : rejeu groupes affectes ;
- draw hors plage : erreur serveur ;
- tirage double : premier tirage engage conserve ;
- admin demande reroll apres resultat : refus sauf annulation officielle ;
- probabilites != 100% : lancement bloque ;
- RNG tie-break non prevu : interdit.

Journal RNG :

```text
rngAlgorithm
seedCommitment
seedEncrypted
drawIndex
inputContext
result
revealAuthorization
```

## Anti-triche et integrite

- auto-click : inputs excedentaires ignores + incident ;
- frequence impossible : blocage flux ;
- teleportation : action rejetee ;
- reponse avant question : rejet + alerte ;
- client modifie : etat client non verifiable refuse ;
- replay ancien message : nonce/sequence invalide ;
- timestamp client falsifie : temps serveur prioritaire ;
- secret inspecte : secret jamais envoye avant necessite ;
- collusion externe : sanction seulement avec preuve prevue ;
- IP partagee : pas preuve seule ;
- appareil partage : regle explicite requise ;
- lag provoque : analyse, pas conclusion automatique ;
- bot/script : detection puis revue ;
- admin commande falsifiee : signature/permission serveur ;
- action DB directe : detection par journal integrite.

## Multi-admin

Commandes concurrentes :

- deux start round : seul lease accepte ;
- start et pause simultanes : ordre transactionnel serveur ;
- modification meme incident : version optimiste ;
- confirmation pendant contestation : reste en revision ;
- admin principal deconnecte : transfert apres bail ;
- deux admins absents : session autonome, transitions bloquees ;
- crise sans admin : pause automatique selon gravite.

Desaccords :

- A corrige, B refuse : resultat automatique maintenu ;
- B recommande rejeu, A refuse : motif obligatoire ;
- interpretation differente : version gelee du reglement ;
- regle absente : politique generale conservatrice ;
- pas deux approbations : correction non executee ;
- admin a consulte secret : ne peut pas etre seul approbateur.

## Journal evenementiel

- sequence duplicate : incoherence critique ;
- sequence gap : publication bloquee ;
- timestamps identiques : sequence tranche ;
- evenement tardif : rattache a sequence ;
- payload incomplet : incident technique ;
- event duplique : dedup `eventId` ;
- hash invalide : suspicion alteration ;
- snapshot incoherent : recalcul depuis precedent ;
- replay different : revision obligatoire ;
- donnees sensibles : vues masquees, donnee scellee conservee ;
- log indisponible : decisions critiques bloquees.

## Pause, reprise et panne

- pause lobby : admissions/timers geles selon commande ;
- pause discussion : timer gele ;
- pause choix secret : choix recus restent scelles ;
- pause animation non deterministe : retour snapshot ;
- pause course premier clic : souvent interdite apres signal ;
- reprise double : idempotence ;
- room crash : restauration snapshot/journal ;
- DB indisponible : actions critiques en attente ;
- audit down : decisions critiques bloquees ;
- surcharge CPU : pause si equite menacee ;
- deploiement pendant session : interdit sauf hotfix compatible/versionne.

## Arbitrage et publication

- incident sans impact : `NO_MATERIAL_IMPACT` ;
- incident joueur : correction/rejeu individuel ;
- incident duel : rejeu manche/duel ;
- incident equipe : rejeu instance equipe ;
- incident majorite : round replay ;
- gagnant indeterminable : rejeu, pas choix arbitraire ;
- rejeu avec avantage connaissance : nouvelle seed/contenu ;
- reclamation tardive : rejet sauf erreur systeme ;
- decision correcte mais percue injuste : regle maintenue ;
- joueur reintegre apres round suivant : reprise structurelle, pas simple reintegration.

Publication :

- resultat calcul en cours : rien publie ;
- incident ouvert : provisoire ;
- double approbation manquante : bloque ;
- correction : nouvelle version ;
- resultats differents client : version serveur unique ;
- role revele trop tot : publication scellee ;
- classement incorrect : bloque ;
- appel apres publication : `APPEALED` sans effacer publie ;
- notification echoue : resultat conserve, retry notification.

## Gravite

| Niveau   | Reponse                                 |
| -------- | --------------------------------------- |
| INFO     | Continuer et journaliser                |
| MINOR    | Continuer, alerte                       |
| MAJOR    | Resultat provisoire + revision          |
| CRITICAL | Pause automatique + blocage publication |

## Politique par defaut si cas non prevu

1. Preserver l'etat officiel serveur.
2. Ne pas reveler de secret supplementaire.
3. Ne pas inventer un gagnant.
4. Ne pas modifier un score sans preuve.
5. Conserver la decision automatique si aucune erreur materielle n'est demontree.
6. Preferer le rejeu si resultat indeterminable.
7. Utiliser nouvelle seed/contenu pour eviter avantage connaissance.
8. Suspendre publication si la decision peut changer les qualifies.
9. Exiger deux admins pour correction irreversible.
10. Conserver toutes les versions.
