# Reglement d'arbitrage et exploitation des 120 mini-jeux

## 1. Constat catalogue

Le catalogue contient 120 mini-jeux repartis en 6 familles :

- Solo
- Duel 1v1
- Alliance forcee
- Equipe libre
- Survie collective
- Role cache

Les conventions deja posees sont bonnes :

- timers serveur ;
- rooms dediees ;
- etat gere cote serveur ;
- RNG loguee ;
- `winnersCount` externe applique par la couche session.

La lacune principale est operationnelle : le catalogue decrit comment jouer, mais pas encore comment exploiter officiellement une competition avec deconnexions, arbitrage, preuves, appels, conflits admin, resultat provisoire/officiel et publication.

## 2. Reglement en cinq niveaux

### Niveau 1 - Charte globale

Applicable a tous les jeux :

- le serveur est la source officielle du temps, de l'etat et des resultats ;
- le client affiche et envoie des intentions, il ne decide jamais ;
- aucune regle ne change apres verrouillage du lobby ;
- les resultats automatiques sont provisoires jusqu'a confirmation ;
- toute intervention humaine est enregistree ;
- une decision passee n'est jamais supprimee : elle est confirmee, remplacee ou corrigee par une nouvelle decision ;
- les informations secretes restent scellees jusqu'au moment prevu ;
- les administrateurs ne doivent pas aider strategiquement un joueur ;
- les incidents techniques sont separes des erreurs de jeu ;
- les captures video peuvent completer un dossier, mais ne remplacent pas les evenements serveur.

### Niveau 2 - Regles de famille

Chaque famille fixe les invariants communs :

- participants attendus ;
- type de resultat ;
- politique d'egalite ;
- politique de deconnexion ;
- politique de pause/reprise ;
- incidents revisables ;
- preuves minimales ;
- actions admin autorisees.

### Niveau 3 - Fiche reglementaire mini-jeu

Chaque mini-jeu a une fiche immuable. Sans fiche complete, il est bloque pour session officielle.

```text
gameId
gameVersion
rulesVersion
family
arbitrationProfile

minimumPlayers
maximumPlayers
teamSize
phaseGraph
scoringFormula

qualificationMode
resultCardinality
winnersCountCompatibility
tieBreakRules
zeroWinnerPolicy
allWinnerPolicy

disconnectPolicy
reconnectWindow
latencyPolicy
fairnessWindowMs
orderingPolicy
lateInputPolicy
simultaneousActionPolicy

rngPolicy
seedPolicy
communicationPolicy
votePolicy
quorumPolicy
hiddenInformationPolicy

pausePolicy
resumePolicy
reviewableIncidents
automaticIncidentRules
adminAllowedActions
criticalAdminActions
dualApprovalActions
requiredEvidence

replayPolicy
individualReplayAllowed
newContentRequiredOnReplay
resultPublicationPolicy
appealWindow
evidenceRetentionPeriod
```

### Niveau 4 - Configuration de session

La session choisit :

- nombre de joueurs ;
- liste et ordre des rounds ;
- nombre de qualifies/gagnants attendus ;
- durees ;
- difficultes ;
- seuils de latence ;
- fenetres de reconnexion ;
- regle d'appel ;
- regles de remplacement ;
- eventuelles contraintes de rotation de roles.

Au verrouillage du lobby, cette configuration devient un snapshot immuable.

### Niveau 5 - Decisions d'arbitrage

Une decision humaine ne modifie pas le reglement. Elle applique une regle a un incident precis.

Issues possibles :

```text
CONFIRM
CORRECT
INDIVIDUAL_REPLAY
DUEL_REPLAY
FULL_REPLAY
TECHNICAL_FORFEIT
VOID_ROUND
NO_MATERIAL_IMPACT
DISCIPLINARY_ACTION
```

## 3. Neuf profils d'arbitrage

| Profil | Mecanisme                            | Exemples                                      | Dashboard requis                                        |
| ------ | ------------------------------------ | --------------------------------------------- | ------------------------------------------------------- |
| P1     | Score, precision ou temps individuel | Calcul rapide, memoire, puzzle, estimation    | score, temps, erreurs, tie-break, action rate           |
| P2     | Premier input ou premiere occupation | Course au signal, pot commun, zones, chaises  | signal serveur, ordre officiel, fairnessWindow, latence |
| P3     | Simulation continue                  | Bras de fer, suivi curseur, rayon, equilibre  | tick rate, positions, collisions, snapshots             |
| P4     | Deterministe tour par tour           | Duel memoire, dernier chiffre, chaine humaine | tour courant, joueur attendu, deadline, rollback        |
| P5     | Choix secrets simultanes             | Chifoumi, encheres, pactes, votes             | choix recus/scelles, commit/reveal, timeout             |
| P6     | Hasard auditable                     | Roulette, roue, valeurs aleatoires            | seedCommitment, drawIndex, probabilites, reveal         |
| P7     | Cooperation/synchronisation          | Radeau, compte a trois, corde, pont           | membres, ecart synchro, contribution, quorum            |
| P8     | Negociation/repartition              | Partage, troc, sacrifice, leader              | propositions, votes, contraintes, chat autorise         |
| P9     | Role cache/sabotage                  | Saboteur, faux temoin, validateur corrompu    | secrets scelles, votes, actions secretes comptees       |

## 4. Qualification et cardinalite

`winnersCount` ne suffit pas. Chaque jeu doit declarer :

```text
qualificationMode:
- TOP_N
- THRESHOLD
- BINARY_DUEL
- TEAM_RESULT
- SURVIVORS
- VOTE_RESULT
- ALL_OR_NOTHING
- CUSTOM

resultCardinality:
- EXACT
- MINIMUM
- MAXIMUM
- VARIABLE
```

Le Program Builder bloque les programmes incoherents :

- `winnersCount` superieur aux participants ;
- `TOP_N` sans tie-break ;
- duel avec nombre impair sans BYE ;
- equipe incompatible avec participants restants ;
- jeu qui peut produire zero gagnant sans `zeroWinnerPolicy` ;
- jeu qui peut produire tous gagnants sans `allWinnerPolicy` ;
- resultat variable qui peut casser le round suivant.

## 5. Temps, latence et ordre officiel

Le timestamp client n'est jamais preuve principale.

Preuve d'une action :

1. signal emis par serveur ;
2. action recue par serveur ;
3. deadline officielle serveur/DB ;
4. estimation plafonnee de latence ;
5. historique reseau recent ;
6. timestamp client seulement comme indice secondaire.

Politiques possibles :

```text
orderingPolicy:
- SERVER_ARRIVAL
- LATENCY_NORMALIZED
- FAIRNESS_WINDOW
- SIMULTANEOUS_TIE
```

Une `FAIRNESS_WINDOW` est fixee avant session et ne se negocie pas pendant un incident.

## 6. Gestion par famille

### Solo

Le serveur calcule score, precision, temps, penalites, classement et tie-break.

Admin surveille :

- chargement du jeu ;
- reception des actions ;
- latence forte ;
- rythme d'input impossible ;
- defaut d'affichage ;
- deconnexion ;
- incoherence resultat/evenements.

Interventions autorisees :

- confirmer ;
- incident sans impact ;
- rejeu individuel avec contenu equivalent nouveau ;
- annulation du round si incident collectif.

Interdit : modifier directement un score.

### Duel 1v1

Chaque duel a un statut propre :

```text
SCHEDULED
READY
RUNNING
INTERRUPTED
PROVISIONAL
UNDER_REVIEW
CONFIRMED
REPLAY_ORDERED
TECHNICAL_FORFEIT
```

Choix secret deja soumis : conserve et scelle. Deconnexion apres reconnexion expiree : politique de forfait technique si prevue.

### Alliance forcee

La trahison autorisee n'est pas un incident.

Revisable uniquement :

- information privee non distribuee ;
- canal indisponible ;
- action recue apres coupure ;
- validation avant ouverture officielle ;
- code/objectif incorrect ;
- ressource unique doublement attribuee.

### Equipe libre

Toujours separer :

```text
teamResult
individualContribution
```

Le resultat collectif qualifie. La contribution explique, departage si prevu, signale anomalies, mais ne sert pas a recompenser arbitrairement.

### Survie collective

L'admin ne revise pas chaque elimination a la main. Le serveur groupe :

```text
Vague 4
- eliminations confirmees
- eliminations avec latence inhabituelle
- etats incoherents
```

Une elimination n'est annulee que si preuve technique : contradiction serveur, action valide rejetee, etat incorrect recu, panne collective.

### Role cache

Separer :

```text
taskResult
voteResult
roleResult
```

Admins voient pendant la partie :

- roles distribues oui/non ;
- messages prives distribues oui/non ;
- actions secretes recues nombre ;
- vote ouvert/ferme ;
- anomalies techniques.

Admins ne voient pas normalement :

- identite du saboteur ;
- objectif secret ;
- actions privees detaillees ;
- canal prive des traitres.

Toute revelation manuelle de secret est critique et peut retirer le droit de trancher seul.

## 7. Multi-admin

### Roles

Admin A - arbitre principal :

- verrouille lobby ;
- demarre round ;
- pause/reprise ;
- decision finale ;
- confirme resultat ;
- publie ;
- transfere controle.

Admin B - assistant/reviseur :

- surveille incidents ;
- verifie preuves ;
- classe signalements ;
- recommande ;
- surveille connexions ;
- traite assistance ;
- approuve/refuse decision critique.

Support :

- aide technique ;
- creation incident ;
- messages techniques autorises ;
- aucune mutation sportive.

### SessionControlLease

Une seule identite detient le controle de phase.

Chaque commande critique contient :

```text
sessionVersion
commandId
adminId
controlLeaseId
reason
```

Le serveur refuse si version ou lease ne correspond pas.

### Double approbation

Obligatoire pour :

- eliminer manuellement ;
- modifier score ;
- annuler round ;
- ordonner rejeu ;
- reveler role ;
- corriger resultat publie ;
- distribuer/corriger credits apres publication.

En cas de desaccord :

- le resultat automatique reste reference ;
- aucune modification irreversible n'est appliquee sans preuve suffisante ;
- si la preuve manque a cause d'une panne majeure, la regle predefinie tranche ;
- statut reste `UNDER_REVIEW`.

## 8. Registre evenementiel

Le registre est la feuille de match numerique.

Categories :

```text
SESSION.*
PLAYER.*
ROUND.*
PHASE.*
INPUT.*
STATE.*
SCORE.*
QUALIFICATION.*
NETWORK.*
RNG.*
VOTE.*
CHAT.*
ROLE.*
INTEGRITY.*
INCIDENT.*
ADMIN.*
DECISION.*
RESULT.*
```

Structure :

```text
eventId
sessionId
roundId
roomId
sequenceNumber
serverTimestamp
eventType
actorType
actorId
affectedPlayers
payload
ruleReference
previousStateHash
newStateHash
previousEventHash
traceId
sourceService
```

Append-only. Une correction ajoute `DECISION.REPLACED` ou `RESULT.CORRECTED`.

## 9. Resultats officiels

Statuts :

```text
CALCULATING
PROVISIONAL
SILENT_CHECK
UNDER_REVIEW
CONFIRMED
CORRECTED
REPLAY_ORDERED
VOID
PUBLISHED
FINAL
```

Publication :

```text
resultId
resultVersion
sessionId
roundId
rulesVersion
gameVersion
status
qualifiedPlayers
eliminatedPlayers
decisionReferences
publishedAt
publishedBy
integrityHash
```

Les credits/gains internes ne partent que lorsque la politique de publication/finalisation l'autorise.
