# User stories completes - Dashboard administration, arbitrage et exploitation live

## Correction de cadrage

Le besoin n'est pas un "dashboard admin" classique. Le produit a besoin d'un cockpit d'exploitation de competition payante, capable de piloter 120 mini-jeux repartis en 6 familles, avec arbitrage, preuves, multi-admin, incidents, resultats provisoires/officiels et publication.

La couche UI ne doit pas simplifier la complexite metier. Elle doit la rendre operable.

Decision produit:

> Le serveur est l'arbitre automatique initial. Admin A est l'arbitre principal. Admin B est l'arbitre assistant/reviseur. Le dashboard est la feuille de match interactive permettant de piloter, surveiller, reviser, confirmer et publier.

## Sources verifiees

- docs/catalogue-mini-jeux.md: 120 jeux, 6 familles x 20, timers serveur, rooms Colyseus, winnersCount externe, RNG loguee.
- docs/plan/11-catalogue-mini-jeux-configurables.md: MiniGameDefinition, schema config, allowedActions, antiCheatPolicy, resolvers.
- docs/prd/features/11-catalogue-mini-jeux-configurables.md: chaque mini-jeu declare family, playerMode, configSchema, allowedActions, resolver, antiCheatPolicy.
- docs/prd/features/10-game-engine-resolution-rounds.md: resolver pur, ranking/statuts, session applique winnersCount.
- docs/prd/features/09-session-live-temps-reel.md: phases live, timers, pause/reprise, reconnection.
- docs/prd/features/12-resultats-gains-distribution.md: resultats officiels, corrections auditees, distribution idempotente.
- docs/prd/features/13-dashboard-admin-audit-support.md: dashboard admin, audit, support.
- docs/prd/features/15-securite-anti-triche-conformite.md: anti-cheat, moderation, audit, compliance.
- Context7 /colyseus/docs: rooms, state sync, onDrop, allowReconnection, onReconnect, onLeave.

## Non-negociables

- Pas 120 dashboards differents.
- Pas un seul dashboard generique aveugle aux familles.
- Pas de score modifiable directement par un admin.
- Pas de role cache visible par defaut aux admins pendant la partie.
- Pas de pause DB seulement: la room doit recevoir l'ordre.
- Pas de resultat final sans statut officiel, version et preuve.
- Pas d'action critique sans raison, commandId, adminId, sessionVersion et permission.
- Pas de mutation de phase par deux admins simultanement.
- Pas de publication si une revision peut changer les qualifies/gagnants.

## Personas

### Admin A - Arbitre principal

Responsable de la conduite sportive:

- verrouiller lobby;
- demarrer session;
- demarrer/fermer rounds;
- pause/reprise;
- decision finale;
- publication;
- transfert de controle.

### Admin B - Arbitre assistant

Responsable de la verification:

- surveiller incidents;
- examiner preuves;
- recommander correction/rejeu/maintien;
- gerer tickets joueurs;
- approuver actions critiques;
- surveiller connexions et anomalies.

### Support

Responsable de l'aide sans pouvoir sportif direct:

- voir statut joueur;
- envoyer message technique autorise;
- ouvrir incident;
- escalader a Admin B.

### Joueur

Responsable de sa presence et de ses actions:

- payer;
- valider "Je suis pret";
- rejoindre room;
- soumettre actions;
- recevoir resultat provisoire/officiel;
- deposer reclamation dans la fenetre autorisee.

### Systeme arbitre

Responsable de l'etat officiel:

- temps serveur;
- validation action;
- detection incident;
- resolution initiale;
- journal evenementiel;
- replay/recalcul;
- statut resultat.

## Architecture fonctionnelle du dashboard

Le dashboard doit etre compose de 10 espaces.

1. Vue sessions: portefeuille des sessions a operer.
2. Program Builder: composition des rounds, compatibilite mini-jeux, reglement verrouillable.
3. Lobby Control: readiness joueurs, check-in, verrouillage, no-show.
4. Live Control: phase, round, timer, pause, reprise, transitions.
5. Match Panel: panneau specialise selon famille/profil d'arbitrage.
6. Players Monitor: connexions, submissions, statut sportif, tickets.
7. Arbitration Center: incidents, dossiers de revision, decisions.
8. Event Replay: feuille de match, timeline, preuves, recalcul.
9. Results Office: provisoire, confirme, corrige, publie, final.
10. Admin Control: lease de controle, permissions, approbations, audit.

## Etats metier a exposer

### Session

```text
DRAFT
PUBLISHED
ACTIVE
LOCKED
WAITING_START
LIVE
PAUSED
UNDER_REVIEW
COMPLETED
PUBLISHED_RESULTS
FINAL
CANCELLED
```

### Lobby player

```text
CREATED
PAYMENT_PENDING
PAID
READY
CHECKED_IN
IN_ROOM
NO_SHOW
DISCONNECTED
SPECTATOR
```

### Round

```text
CONFIGURED
READY
BRIEFING
RUNNING
PAUSED
RESOLVING
PROVISIONAL
SILENT_CHECK
UNDER_REVIEW
CONFIRMED
REPLAY_ORDERED
VOID
PUBLISHED
```

### Resultat

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

### Incident

```text
DETECTED
AUTO_RESOLVED
NEEDS_REVIEW
UNDER_REVIEW
RECOMMENDED
DECIDED
APPEALED
FINAL
```

## Fiche reglementaire obligatoire par mini-jeu

Chaque mini-jeu doit etre injouable en session officielle si cette fiche est incomplete.

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
disconnectPolicy
reconnectWindow
latencyPolicy
fairnessWindowMs
orderingPolicy
rngPolicy
communicationPolicy
votePolicy
hiddenInformationPolicy
pausePolicy
resumePolicy
reviewableIncidents
automaticIncidentRules
adminAllowedActions
criticalAdminActions
requiredEvidence
replayPolicy
resultPublicationPolicy
appealWindow
evidenceRetentionPeriod
```

## Profils d'arbitrage

Les 120 jeux sont couverts par 9 profils. Le dashboard affiche les widgets d'arbitrage correspondant au profil du round courant.

| Profil                              | Dashboard doit afficher                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| P1 Score/precision/temps individuel | classement live, score brut, score secondaire, submissions, anomalies de vitesse, tie-break |
| P2 Premier input/occupation         | signal serveur, ordre officiel, fairnessWindow, latence, conflits de place, inputs rejetes  |
| P3 Simulation continue              | tick rate, positions officielles, collisions, snapshots, paquets manquants, surcharge       |
| P4 Tour par tour deterministe       | tour courant, joueur attendu, deadline, sequence, action stale, snapshot de rollback        |
| P5 Choix secrets simultanes         | choix recus/scelles, non-revelation, deadline, commit/reveal, timeout                       |
| P6 Hasard auditable                 | seed commitment, drawIndex, probabilites, reveal status, preuve RNG                         |
| P7 Cooperation/synchronisation      | statut par membre/equipe, ecart de synchronisation, contribution, quorum                    |
| P8 Negociation/repartition          | propositions, votes, quotas, chat autorise, validation contraintes                          |
| P9 Role cache/sabotage              | distribution oui/non, votes, actions secretes comptees, secrets scelles, acces critique     |

## Couverture par famille

### Solo

Le dashboard doit montrer score, progression, erreurs, temps officiel, action rate, assets charges, seed, anomalie d'affichage et possibilite de rejeu individuel seulement si le contenu n'a pas ete revele ou si une nouvelle instance equivalente est generee.

### Duel 1v1

Le dashboard doit montrer chaque duel comme un sous-match avec statut propre, joueurs prets, choix recus/scelles, score, latence, interruption, forfait technique, sudden death, revision et publication du duel.

### Alliance forcee

Le dashboard doit distinguer strategie autorisee et incident technique. La trahison normale n'est pas revisable. Les informations privees et chats de binome restent scelles sauf incident declare.

### Equipe libre

Le dashboard doit separer resultat collectif, contribution individuelle, vote, leader, quorum, repartition, contraintes de pot et incidents d'equipe.

### Survie collective

Le dashboard doit regrouper les eliminations par vague, detecter anomalies collectives, afficher survivants, collisions, zones, snapshots et resultats proches a reviser.

### Role cache

Le dashboard doit separer taskResult, voteResult et roleResult. Les admins voient les metadonnees techniques, pas les secrets, sauf procedure de revelation critique.

## User stories

### EPIC A - Reglement et catalogue arbitrable

#### US-A1 - Fiche reglementaire complete

En tant que Super Admin, je veux que chaque mini-jeu ait une fiche reglementaire complete afin qu'aucune session officielle ne depende d'une regle inventee en direct.

Criteres d'acceptation:

- Un mini-jeu sans `disconnectPolicy`, `tieBreakRules`, `qualificationMode`, `resultCardinality`, `requiredEvidence` est bloque pour session officielle.
- La fiche a `gameVersion` et `rulesVersion`.
- Toute modification cree une nouvelle version.
- Les sessions deja verrouillees conservent leur version.

#### US-A2 - Compatibilite winnersCount

En tant qu'Admin A, je veux savoir si le round peut produire le nombre de qualifies attendu afin d'eviter une incoherence sportive.

Criteres d'acceptation:

- Le systeme compare `winnersCount`, `qualificationMode` et `resultCardinality`.
- Si le jeu peut produire 0, tous, variable ou equipe entiere, le dashboard l'affiche avant verrouillage.
- Une incompatibilite bloque la publication du programme.
- Le dashboard propose les options valides: ajuster winnersCount, changer jeu, ajouter tie-break, ajouter phase supplementaire.

#### US-A3 - Profils d'arbitrage

En tant qu'Admin B, je veux que le dashboard classe chaque round selon un profil d'arbitrage afin de voir les bons indicateurs sans apprendre 120 procedures.

Criteres d'acceptation:

- Chaque round expose son `arbitrationProfile`.
- Le Match Panel change selon P1-P9.
- Les incidents automatiques sont filtres par profil.
- Les actions admin autorisees sont celles de la fiche du jeu.

#### US-A4 - Version verrouillee du reglement

En tant que joueur, je veux que les regles applicables soient figees au verrouillage du lobby afin que personne ne change les conditions apres mon paiement/presence.

Criteres d'acceptation:

- Le lock lobby cree un `sessionRulesSnapshot`.
- Toute tentative de modifier regle/round apres lock est refusee ou force l'annulation/recreation officielle.
- Le resultat publie reference `rulesVersion`.

### EPIC B - Program Builder exploitable

#### US-B1 - Construction du programme complet

En tant qu'Admin A, je veux construire une sequence de rounds avec familles, mini-jeux, profils, durees, qualifications et politiques afin de preparer une competition coherent.

Criteres d'acceptation:

- Chaque round affiche famille, mini-jeu, profil, duree, joueurs attendus, output attendu.
- Le funnel prevu calcule participants restants apres chaque round.
- Le dashboard signale nombre impair, equipe incompatible, jeu incompatible, hasard non valide, accessibilite requise.

#### US-B2 - Simulation des edge cases avant publication

En tant qu'Admin B, je veux simuler les cas limites probables afin de detecter les trous de reglement avant la session.

Criteres d'acceptation:

- Le systeme simule egalite au seuil, deconnexion, no-show, abandon, result variable, zero gagnant, all winners.
- Chaque alerte pointe vers la regle manquante.
- Une session avec edge case non resolu ne passe pas en mode officiel.

#### US-B3 - Gate de risque mini-jeu

En tant que Super Admin, je veux bloquer les jeux trop risques afin de ne pas lancer un round non auditable.

Criteres d'acceptation:

- Le dashboard affiche risque hasard, risque secret, risque latence, risque accessibilite, risque anti-triche.
- Un jeu hasard dominant non valide est bloque.
- Un jeu avec secret non scellable est bloque.

### EPIC C - Lobby, readiness et verrouillage

#### US-C1 - Readiness joueur

En tant que joueur, je veux confirmer "Je suis pret" afin que l'admin sache qui peut réellement entrer en live.

Criteres d'acceptation:

- Le joueur PAID peut passer READY/CHECKED_IN dans la fenetre prevue.
- Le dashboard affiche payes, prets, non prets, en room, deconnectes.
- Le start normal est bloque si `checkedInCount < minPlayers`.
- Le texte joueur n'utilise pas "forcer live".

#### US-C2 - Verrouillage du lobby

En tant qu'Admin A, je veux verrouiller le lobby afin de figer joueurs, regles et programme avant le live.

Criteres d'acceptation:

- Le lock cree un snapshot joueurs + regles + programme.
- Les arrivees tardives sont refusees sauf exception officielle avant premier round.
- Les joueurs non prets passent dans une politique no-show definie.

#### US-C3 - No-show et remplacement

En tant qu'Admin B, je veux gerer les absents selon une politique predefinie afin d'eviter des decisions arbitraires.

Criteres d'acceptation:

- Le dashboard classe absent lobby, absent room, disconnect temporaire, no-show final.
- Les actions possibles viennent de `disconnectPolicy` et `noShowPolicy`.
- Toute exception est journalisee.

### EPIC D - Multi-admin et controle

#### US-D1 - Lease de controle

En tant qu'Admin A, je veux detenir le controle de phase afin qu'une seule personne puisse lancer les transitions critiques.

Criteres d'acceptation:

- Une mutation de phase exige `sessionControlLease`.
- La commande inclut `sessionVersion`, `commandId`, `adminId`, `controlLeaseId`.
- Si Admin A disparait, le bail expire et Admin B peut demander transfert.
- Toute prise de controle est auditee.

#### US-D2 - Approbation critique a deux admins

En tant que plateforme, je veux exiger deux approbations pour les corrections irreversibles afin de proteger les resultats.

Criteres d'acceptation:

- Modifier score, eliminer manuellement, annuler round, ordonner rejeu, reveler roles, corriger resultat publie exige double approbation.
- Le resultat automatique reste reference en cas de desaccord.
- Un admin ayant consulte un secret ne peut pas etre seul decisionnaire.

#### US-D3 - Permissions par role

En tant que Super Admin, je veux separer Admin A, Admin B, Support et Finance afin que chacun fasse uniquement son travail.

Criteres d'acceptation:

- Support ne peut pas muter phase/resultat.
- Admin B peut recommander et approuver, mais ne lance pas un round sans controle.
- Admin A ne peut pas contourner les approbations critiques.
- Chaque requete verifie permissions serveur, pas seulement UI.

### EPIC E - Live Control

#### US-E1 - Vue phase et round courant

En tant qu'Admin A, je veux voir l'etat live officiel afin de savoir quoi faire ensuite.

Criteres d'acceptation:

- Le header affiche session, round x/n, phase, result status, version, serveur stable/instable.
- Le round affiche deadline, timer logique, jeu, famille, profil, participants, submissions, incidents.
- Les actions disponibles changent selon phase et fiche du jeu.

#### US-E2 - Pause reelle

En tant qu'Admin A ou B, je veux pauser une session en urgence afin que les joueurs voient l'arret et que les timers soient traites correctement.

Criteres d'acceptation:

- Pause API publie une commande a la room Colyseus.
- La room passe en PAUSED ou applique la politique du jeu.
- Le joueur voit overlay pause + message technique.
- Les timers gelables sont geles, les non gelables declenchent politique de round.
- Reprise exige raison et controle.

#### US-E3 - Demarrage du prochain round

En tant qu'Admin A, je veux demarrer le prochain round autorise afin de controler l'enchainement.

Criteres d'acceptation:

- Pas de `roundNum: 1` en dur.
- Le systeme calcule le prochain round selon resultats confirmes.
- Un round ne peut pas demarrer si le resultat precedent peut changer les participants.
- Le bouton explique le blocage: incident ouvert, resultat provisoire, joueurs incompatibles, role non attribue, etc.

#### US-E4 - Fermeture/resolution du round

En tant que Systeme arbitre, je veux produire un resultat provisoire et des preuves afin que les admins revisent sans improviser.

Criteres d'acceptation:

- La fin du round cree `RESULT.PROVISIONAL`.
- Le systeme lance silent check.
- Les anomalies creent incidents.
- Les joueurs voient "resultat provisoire" tant que non confirme.

### EPIC F - Match panels par famille

#### US-F1 - Solo Panel

En tant qu'Admin B, je veux suivre les performances individuelles afin de detecter latence, impossible score, asset absent ou action suspecte.

Criteres d'acceptation:

- Le panel montre score, temps, erreurs, progression, submitted, assetLoaded, actionRate.
- Il signale score impossible, completion instantanee, input avant affichage, contenu invalide.
- Les actions admin autorisees sont confirmer, incident sans impact, rejeu individuel avec nouvelle instance, annuler round si collectif.

#### US-F2 - Duel Panel

En tant qu'Admin B, je veux voir chaque duel comme un sous-match afin de trancher interruptions et egalites sans bloquer tout le round.

Criteres d'acceptation:

- Chaque duel a statut SCHEDULED/READY/RUNNING/INTERRUPTED/PROVISIONAL/UNDER_REVIEW/CONFIRMED.
- Choix secrets restent scelles.
- Deconnexion apres choix conserve le choix.
- Egalite applique tie-break/sudden death prevu.

#### US-F3 - Alliance Panel

En tant qu'Admin B, je veux distinguer trahison normale et incident technique afin de ne pas arbitrer la strategie.

Criteres d'acceptation:

- Le panel affiche canaux actifs, infos privees distribuees oui/non, ressource unique, submissions.
- Refus de cooperer, mensonge ou trahison autorisee ne creent pas incident sportif.
- Fuite d'information, canal indisponible ou ressource doublement attribuee creent incident.

#### US-F4 - Equipe Panel

En tant qu'Admin A, je veux voir resultat collectif et contribution individuelle afin de comprendre sans recompenser arbitrairement.

Criteres d'acceptation:

- Le panel separe `teamResult` et `individualContribution`.
- Votes affichent quorum, majorite, abstention, deadline.
- Repartition invalide est refusee.
- Contribution faible ne change pas le resultat sauf regle explicite.

#### US-F5 - Survie Panel

En tant qu'Admin B, je veux voir les eliminations regroupees par vague afin de reviser uniquement les cas suspects.

Criteres d'acceptation:

- Le panel affiche survivants, vagues, eliminations confirmees, eliminations a latence inhabituelle, snapshots manquants.
- Une elimination est annulable uniquement si preuve technique.
- Une elimination massive anormale ouvre incident collectif.

#### US-F6 - Role Cache Panel

En tant qu'Admin B, je veux surveiller un jeu a roles caches sans voir les secrets afin de proteger l'equite.

Criteres d'acceptation:

- Le panel montre roles distribues oui/non, votes ouverts/fermes, actions secretes recues nombre, anomalies.
- Il ne montre pas identite du saboteur par defaut.
- Revelation manuelle exige action critique, raison et approbation.
- Le resultat separe taskResult, voteResult, roleResult.

### EPIC G - Incidents et arbitrage

#### US-G1 - Detection automatique

En tant que Systeme arbitre, je veux detecter les incidents afin que les admins ne scrutent pas tout manuellement.

Criteres d'acceptation:

- Les incidents sont classes INFO/MINOR/MAJOR/CRITICAL.
- MAJOR met resultat en provisoire/revision.
- CRITICAL pause ou bloque publication selon politique.
- Les incidents similaires sont regroupes par incident racine.

#### US-G2 - Dossier de revision

En tant qu'Admin B, je veux ouvrir un dossier de revision afin de recommander une decision fondee sur des preuves.

Criteres d'acceptation:

- Le dossier affiche decision initiale, regle applicable, timeline, inputs, reseau, RNG, chat autorise, resultat recalcule.
- Admin B choisit recommendation: CONFIRM, CORRECT, REPLAY, VOID, NO_MATERIAL_IMPACT, TECHNICAL_FORFEIT.
- La recommendation n'applique pas seule une correction critique.

#### US-G3 - Decision finale

En tant qu'Admin A, je veux confirmer ou corriger une decision afin de produire un resultat officiel.

Criteres d'acceptation:

- Admin A voit recommandation et preuve.
- Une correction impactant score/qualification exige approbation Admin B.
- Une decision remplace l'ancienne par version, sans suppression.
- Le joueur voit une explication non confidentielle.

#### US-G4 - Appel joueur

En tant que joueur, je veux deposer une reclamation dans une fenetre definie afin de signaler une erreur sans bloquer abusivement la competition.

Criteres d'acceptation:

- La fenetre d'appel est visible.
- L'appel reference round/resultat/version.
- Un appel sans impact sur qualification peut etre traite sans bloquer le round suivant.
- Un appel pouvant changer les participants bloque l'enchainement.

### EPIC H - Feuille de match et replay evenementiel

#### US-H1 - Journal evenementiel officiel

En tant que plateforme, je veux une feuille de match append-only afin de reconstruire toute la partie sans video.

Criteres d'acceptation:

- Chaque evenement a eventId, sequenceNumber, serverTimestamp, eventType, actor, payload, ruleReference, hashes, traceId, sourceService.
- Les corrections ajoutent DECISION.REPLACED ou RESULT.CORRECTED, jamais une suppression.
- Un gap de sequence bloque publication.

#### US-H2 - Replay d'un incident

En tant qu'Admin B, je veux rejouer l'etat avant/apres afin de comprendre l'impact reel d'un evenement.

Criteres d'acceptation:

- Le replay filtre par joueur, round, incident, eventType.
- Il affiche etat avant/apres, timer officiel, input, latence, snapshot.
- Le resultat recalcule est compare au resultat enregistre.

#### US-H3 - Preuve RNG

En tant que joueur ou admin, je veux verifier le hasard utilise afin de faire confiance aux jeux aleatoires autorises.

Criteres d'acceptation:

- Le systeme enregistre rngAlgorithm, seedCommitment, drawIndex, inputContext, result.
- La seed est revelee seulement selon politique.
- Un tirage sans preuve est non certifiable.

### EPIC I - Resultats, publication et credits

#### US-I1 - Resultat provisoire puis officiel

En tant que joueur, je veux distinguer resultat provisoire et officiel afin de ne pas croire a une qualification avant arbitrage.

Criteres d'acceptation:

- L'UI joueur affiche "provisoire", "en revision", "officiel", "corrige" ou "final".
- Le dashboard admin ne publie pas si incident bloquant ouvert.
- Le resultat officiel reference rulesVersion, gameVersion, decisionReferences.

#### US-I2 - Publication versionnee

En tant qu'Admin A, je veux publier une version officielle afin que tous les joueurs voient le meme resultat.

Criteres d'acceptation:

- Publication cree resultId/resultVersion/integrityHash.
- Une correction apres publication cree une nouvelle version.
- Les credits ne partent que selon policy de finalisation.

#### US-I3 - Blocage distribution si litige critique

En tant que Finance/Admin, je veux bloquer les credits si le resultat peut changer afin d'eviter une distribution injuste.

Criteres d'acceptation:

- Un incident qui change winners/qualifies bloque distribution.
- Les jobs de credit sont idempotents.
- Une correction post-distribution suit workflow audite specifique.

### EPIC J - Communication et support

#### US-J1 - Messages techniques cibles

En tant qu'Admin B ou Support, je veux envoyer des messages techniques sans influencer la strategie.

Criteres d'acceptation:

- Templates autorises: reconnecte-toi, reste sur la page, incident en cours, pause technique, resultat provisoire.
- Message libre global est action sensible avec raison.
- Message a mauvaise audience cree incident admin.

#### US-J2 - Notifications d'etat

En tant que joueur, je veux recevoir les changements importants afin de comprendre ce qui se passe.

Criteres d'acceptation:

- Notifications in-app pour ready, start, pause, resume, provisional, review, confirmed, published.
- WhatsApp reste optionnel/non bloquant.
- Les secrets ne sont jamais envoyes dans une notification externe.

#### US-J3 - Chat et informations privees

En tant qu'Admin B, je veux auditer les communications seulement selon droit afin de proteger l'equite et la confidentialite.

Criteres d'acceptation:

- Chats publics consultables selon role.
- Chats prives scelles sauf incident/regle.
- Toute consultation d'un secret est journalisee et peut retirer certains droits de decision.

### EPIC K - Observabilite, panne et recovery

#### US-K1 - Sante serveur live

En tant qu'Admin A, je veux voir la sante technique live afin de decider pause/reprise.

Criteres d'acceptation:

- Dashboard affiche room status, tick rate, DB latency, Redis pubsub, queue health, connected clients, event log lag.
- Si audit/event store indisponible, les decisions critiques sont bloquees.

#### US-K2 - Reconnexion Colyseus

En tant que joueur, je veux revenir dans la room apres coupure afin de ne pas perdre automatiquement ma place.

Criteres d'acceptation:

- onDrop ouvre une fenetre de reconnexion.
- onReconnect restaure connected=true.
- onLeave definitive applique disconnectPolicy du jeu.
- Le dashboard affiche reconnectUntil et impact sportif.

#### US-K3 - Reprise apres crash room

En tant que Systeme arbitre, je veux restaurer une room depuis snapshot/journal afin de ne pas perdre une session.

Criteres d'acceptation:

- Snapshots periodiques existent pour les simulations continues.
- Le replay des evenements reconstruit l'etat officiel.
- Si l'etat ne peut pas etre certifie, round passe en revision/void/replay selon regle.

## Donnees API attendues

### AdminCompetitionState

```text
session
rulesSnapshot
program
controlLease
adminsOnline
readiness
liveState
currentRound
matchPanel
players
teams
duels
incidents
reviewQueue
eventTimeline
resultState
notifications
systemHealth
permissions
availableActions
blockingReasons
```

### PlayerOpsRow

```text
playerId
displayName
registrationStatus
paymentStatus
readyStatus
roomStatus
connectionStatus
lastSeenAt
reconnectUntil
currentRoundStatus
submittedAction
submissionAt
latencyMedianMs
jitterMs
antiCheatFlags
teamId
duelId
qualificationStatus
appealStatus
supportTicketStatus
```

### RoundOpsState

```text
roundId
roundNum
gameId
gameVersion
rulesVersion
family
arbitrationProfile
phase
deadline
logicalClock
participantsExpected
participantsActive
submissionsExpected
submissionsReceived
resultStatus
incidentCount
blockingReasons
allowedAdminActions
evidenceSummary
```

## Tests d'acceptation globaux

1. Admin peut lancer une session complete sans jamais se connecter comme joueur.
2. Admin voit pourquoi une session ne peut pas demarrer.
3. Un joueur pret est visible comme pret, puis in-room, puis connected.
4. Une pause se reflete dans DB, Colyseus room, UI admin et UI joueur.
5. Un round suivant ne demarre pas si le resultat precedent est en revision bloquante.
6. Un duel conserve un choix secret soumis avant deconnexion.
7. Un role cache ne revele pas l'identite du saboteur a l'admin par defaut.
8. Un incident de latence genere un dossier avec timeline et preuve.
9. Une correction de score exige double approbation.
10. Un resultat publie a une version unique et un integrityHash.
11. Un appel joueur qui change la qualification bloque le round suivant.
12. Un gap dans le journal evenementiel bloque la publication.
13. Un mini-jeu sans fiche reglementaire complete est bloque.
14. Une incompatibilite winnersCount/resultCardinality bloque le programme.
15. Les notifications externes ne contiennent jamais de secret.

## Ordre de livraison recommande

### Sprint 1 - Reglement et modeles

- MiniGameRegulatorySheet.
- ArbitrationProfile.
- qualificationMode/resultCardinality.
- result statuses.
- incident statuses.
- permission matrix.

### Sprint 2 - Ops state API

- AdminCompetitionState.
- PlayerOpsRow.
- RoundOpsState.
- blockingReasons.
- permissions/availableActions.

### Sprint 3 - Cockpit v1

- Vue lobby/readiness.
- Live header.
- Players monitor.
- Round timeline.
- Actions avec raison.
- Polling ou stream admin.

### Sprint 4 - Pause/reprise reelles

- Commands pause/resume publiees a Colyseus.
- Room PAUSED.
- Timer policies.
- UI joueur pause.

### Sprint 5 - Incidents/revisions

- Event timeline.
- Incident detection.
- Review dossier.
- Admin B recommendation.
- Admin A decision.

### Sprint 6 - Familles et profils

- Solo Panel.
- Duel Panel.
- Alliance Panel.
- Equipe Panel.
- Survie Panel.
- Role Cache Panel.

### Sprint 7 - Resultats officiels

- Provisional/confirmed/published/final.
- Publication versionnee.
- Appeal window.
- Credit/distribution gate.

### Sprint 8 - Replay et preuves

- Event store append-only.
- Snapshots.
- Recalculate.
- RNG evidence.
- Integrity chain.

## Definition of Done du vrai dashboard

Le dashboard est acceptable seulement si:

- il couvre les 6 familles et les 9 profils;
- il interdit les mini-jeux sans fiche reglementaire complete;
- il expose readiness, live, round, incidents, preuves, resultats;
- il separe Admin A/Admin B/Support;
- il bloque les commandes concurrentes;
- il rend pause/reprise visibles aux joueurs;
- il gere resultat provisoire/officiel;
- il permet de reconstruire une decision sans video;
- il documente chaque edge case majeur par politique predefinie;
- il teste chaque parcours critique API, room, UI et event log.
