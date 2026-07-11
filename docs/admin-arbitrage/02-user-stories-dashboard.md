# User stories - Dashboard administration et arbitrage

## EPIC A - Reglement et catalogue arbitrable

### US-A1 - Fiche reglementaire complete

En tant que Super Admin, je veux que chaque mini-jeu ait une fiche reglementaire complete afin qu'aucune session officielle ne depende d'une regle inventee en direct.

Criteres :

- Un mini-jeu sans `disconnectPolicy`, `tieBreakRules`, `qualificationMode`, `resultCardinality`, `requiredEvidence` est bloque en officiel.
- La fiche a `gameVersion` et `rulesVersion`.
- Toute modification cree une nouvelle version.
- Les sessions verrouillees gardent leur version.

### US-A2 - Compatibilite `winnersCount`

En tant qu'Admin A, je veux savoir si un round peut produire le nombre de qualifies attendu afin d'eviter une incoherence sportive.

Criteres :

- Le systeme compare `winnersCount`, `qualificationMode`, `resultCardinality`.
- Une incompatibilite bloque la publication du programme.
- Le dashboard propose : ajuster `winnersCount`, changer jeu, ajouter tie-break, ajouter phase supplementaire.

### US-A3 - Profils d'arbitrage

En tant qu'Admin B, je veux que chaque round soit classe selon P1-P9 afin de voir les bons indicateurs sans apprendre 120 procedures.

Criteres :

- Chaque round expose `arbitrationProfile`.
- Le Match Panel change selon P1-P9.
- Les incidents automatiques sont filtres par profil.
- Les actions admin viennent de la fiche du jeu.

### US-A4 - Version verrouillee

En tant que joueur, je veux que les regles soient figees au verrouillage afin que personne ne change les conditions apres paiement/presence.

Criteres :

- Le lock lobby cree un `sessionRulesSnapshot`.
- Modifier une regle apres lock est refuse ou force recreation officielle.
- Le resultat publie reference `rulesVersion`.

## EPIC B - Program Builder exploitable

### US-B1 - Programme complet

En tant qu'Admin A, je veux construire une sequence de rounds avec familles, profils, durees, qualifications et politiques afin de preparer une competition coherent.

Criteres :

- Chaque round affiche famille, mini-jeu, profil, duree, output attendu.
- Le funnel prevu calcule participants restants.
- Le systeme signale nombre impair, equipe incompatible, hasard non valide, accessibilite requise.

### US-B2 - Simulation des edge cases

En tant qu'Admin B, je veux simuler les cas limites avant publication afin de trouver les trous de reglement.

Criteres :

- Simulation : egalite au seuil, deconnexion, no-show, abandon, resultat variable, zero gagnant, tous gagnants.
- Chaque alerte pointe la regle manquante.
- Une session avec edge case bloquant ne passe pas en officiel.

### US-B3 - Gate de risque

En tant que Super Admin, je veux bloquer les jeux trop risques afin de ne pas lancer un round non auditable.

Criteres :

- Le dashboard affiche risque hasard, secret, latence, accessibilite, anti-triche.
- Un jeu hasard dominant non valide est bloque.
- Un jeu avec secret non scellable est bloque.

## EPIC C - Lobby, readiness et verrouillage

### US-C1 - Ready joueur

En tant que joueur, je veux confirmer "Je suis pret" afin que l'admin sache qui peut réellement entrer en live.

Criteres :

- PAID peut passer READY/CHECKED_IN dans la fenetre.
- Dashboard affiche payes, prets, non prets, in-room, deconnectes.
- Start normal bloque si `checkedInCount < minPlayers`.
- Le texte joueur n'utilise pas "forcer live".

### US-C2 - Verrouillage lobby

En tant qu'Admin A, je veux verrouiller le lobby afin de figer joueurs, regles et programme.

Criteres :

- Lock cree snapshot joueurs + regles + programme.
- Arrivees tardives refusees sauf exception officielle avant premier round.
- Non-prets passent dans politique no-show definie.

### US-C3 - No-show et remplacement

En tant qu'Admin B, je veux gerer les absents selon une politique predefinie.

Criteres :

- Dashboard classe absent lobby, absent room, disconnect temporaire, no-show final.
- Actions possibles viennent de `disconnectPolicy` et `noShowPolicy`.
- Toute exception est journalisee.

## EPIC D - Multi-admin et controle

### US-D1 - Lease de controle

En tant qu'Admin A, je veux detenir le controle de phase afin qu'une seule personne lance les transitions critiques.

Criteres :

- Mutation de phase exige `sessionControlLease`.
- Commande inclut `sessionVersion`, `commandId`, `adminId`, `controlLeaseId`.
- Si Admin A disparait, le bail expire et Admin B peut demander transfert.
- Toute prise de controle est auditee.

### US-D2 - Approbation critique

En tant que plateforme, je veux deux approbations pour les corrections irreversibles.

Criteres :

- Modifier score, eliminer manuellement, annuler round, ordonner rejeu, reveler roles, corriger resultat publie exige double approbation.
- Le resultat automatique reste reference en cas de desaccord.
- Un admin ayant consulte un secret ne peut pas etre seul decisionnaire.

### US-D3 - Permissions par role

En tant que Super Admin, je veux separer Admin A, Admin B, Support et Finance.

Criteres :

- Support ne mute pas phase/resultat.
- Admin B recommande/approuve, mais ne lance pas un round sans controle.
- Admin A ne contourne pas les approbations.
- Chaque requete verifie permissions serveur.

## EPIC E - Live Control

### US-E1 - Vue phase et round

En tant qu'Admin A, je veux voir l'etat live officiel afin de savoir quoi faire ensuite.

Criteres :

- Header : session, round x/n, phase, result status, version, sante serveur.
- Round : deadline, timer logique, jeu, famille, profil, participants, submissions, incidents.
- Actions disponibles selon phase et fiche du jeu.

### US-E2 - Pause reelle

En tant qu'Admin A ou B, je veux pauser une session en urgence afin que les joueurs voient l'arret et que les timers soient traites correctement.

Criteres :

- Pause API publie une commande a la room Colyseus.
- Room passe PAUSED ou applique politique du jeu.
- Joueur voit overlay pause + message technique.
- Timers gelables sont geles ; jeux non gelables appliquent politique de round.
- Reprise exige raison et controle.

### US-E3 - Demarrer prochain round

En tant qu'Admin A, je veux demarrer le prochain round autorise afin de controler l'enchainement.

Criteres :

- Pas de `roundNum: 1` en dur.
- Systeme calcule prochain round selon resultats confirmes.
- Round ne demarre pas si resultat precedent peut changer les participants.
- Blocage explique : incident ouvert, resultat provisoire, joueurs incompatibles, role non attribue.

### US-E4 - Fermeture/resolution round

En tant que systeme arbitre, je veux produire un resultat provisoire et des preuves afin que les admins revisent sans improviser.

Criteres :

- Fin round cree `RESULT.PROVISIONAL`.
- Silent check automatique.
- Anomalies creent incidents.
- Joueurs voient "resultat provisoire" tant que non confirme.

## EPIC F - Panels par famille

### US-F1 - Solo Panel

Criteres :

- Score, temps, erreurs, progression, submitted, assetLoaded, actionRate.
- Signale score impossible, completion instantanee, input avant affichage, contenu invalide.
- Actions : confirmer, incident sans impact, rejeu individuel avec nouvelle instance, annuler round collectif.

### US-F2 - Duel Panel

Criteres :

- Chaque duel a statut propre.
- Choix secrets restent scelles.
- Deconnexion apres choix conserve le choix.
- Egalite applique tie-break/sudden death prevu.

### US-F3 - Alliance Panel

Criteres :

- Affiche canaux actifs, infos privees distribuees, ressource unique, submissions.
- Trahison autorisee ne cree pas incident.
- Fuite d'info, canal indisponible ou ressource double attribuee cree incident.

### US-F4 - Equipe Panel

Criteres :

- Separe `teamResult` et `individualContribution`.
- Votes affichent quorum, majorite, abstention, deadline.
- Repartition invalide refusee.
- Contribution faible ne change pas resultat sauf regle explicite.

### US-F5 - Survie Panel

Criteres :

- Affiche survivants, vagues, eliminations confirmees, eliminations a latence inhabituelle, snapshots manquants.
- Elimination annulable uniquement si preuve technique.
- Elimination massive anormale ouvre incident collectif.

### US-F6 - Role Cache Panel

Criteres :

- Montre roles distribues oui/non, votes ouverts/fermes, actions secretes recues nombre, anomalies.
- Ne montre pas identite du saboteur par defaut.
- Revelation manuelle exige action critique, raison, approbation.
- Resultat separe taskResult, voteResult, roleResult.

## EPIC G - Incidents et arbitrage

### US-G1 - Detection automatique

Criteres :

- Incidents classes INFO/MINOR/MAJOR/CRITICAL.
- MAJOR met resultat en provisoire/revision.
- CRITICAL pause ou bloque publication selon politique.
- Incidents similaires groupes par incident racine.

### US-G2 - Dossier de revision

Criteres :

- Dossier affiche decision initiale, regle, timeline, inputs, reseau, RNG, chat autorise, resultat recalcule.
- Admin B recommande CONFIRM, CORRECT, REPLAY, VOID, NO_MATERIAL_IMPACT, TECHNICAL_FORFEIT.
- Recommendation n'applique pas seule une correction critique.

### US-G3 - Decision finale

Criteres :

- Admin A voit recommandation et preuve.
- Correction impactant score/qualification exige approbation Admin B.
- Decision remplace l'ancienne par version, sans suppression.
- Joueur voit une explication non confidentielle.

### US-G4 - Appel joueur

Criteres :

- Fenetre d'appel visible.
- Appel reference round/resultat/version.
- Appel sans impact qualification peut etre traite sans bloquer le round suivant.
- Appel pouvant changer participants bloque l'enchainement.

## EPIC H - Feuille de match et replay

### US-H1 - Journal officiel

Criteres :

- Chaque evenement a eventId, sequenceNumber, serverTimestamp, eventType, actor, payload, ruleReference, hashes, traceId, sourceService.
- Corrections ajoutent DECISION.REPLACED ou RESULT.CORRECTED.
- Gap de sequence bloque publication.

### US-H2 - Replay incident

Criteres :

- Replay filtre par joueur, round, incident, eventType.
- Affiche etat avant/apres, timer officiel, input, latence, snapshot.
- Resultat recalcule compare au resultat enregistre.

### US-H3 - Preuve RNG

Criteres :

- Enregistre rngAlgorithm, seedCommitment, drawIndex, inputContext, result.
- Seed revelee seulement selon politique.
- Tirage sans preuve non certifiable.

## EPIC I - Resultats et credits

### US-I1 - Provisoire puis officiel

Criteres :

- UI joueur affiche provisoire, en revision, officiel, corrige, final.
- Admin ne publie pas si incident bloquant ouvert.
- Resultat officiel reference rulesVersion, gameVersion, decisionReferences.

### US-I2 - Publication versionnee

Criteres :

- Publication cree resultId, resultVersion, integrityHash.
- Correction apres publication cree nouvelle version.
- Credits partent selon politique de finalisation.

### US-I3 - Blocage distribution

Criteres :

- Incident changeant winners/qualifies bloque distribution.
- Jobs de credit idempotents.
- Correction post-distribution suit workflow audite.

## EPIC J - Communication et support

### US-J1 - Messages techniques

Criteres :

- Templates autorises : reconnecte-toi, reste sur la page, incident en cours, pause technique, resultat provisoire.
- Message libre global est sensible avec raison.
- Message mauvaise audience cree incident admin.

### US-J2 - Notifications d'etat

Criteres :

- In-app pour ready, start, pause, resume, provisional, review, confirmed, published.
- WhatsApp optionnel/non bloquant.
- Secrets jamais envoyes en externe.

### US-J3 - Chat et informations privees

Criteres :

- Chats publics consultables selon role.
- Chats prives scelles sauf incident/regle.
- Consultation secret journalisee et peut retirer droits de decision.

## EPIC K - Observabilite et recovery

### US-K1 - Sante serveur live

Criteres :

- Dashboard affiche room status, tick rate, DB latency, Redis pubsub, queue health, connected clients, event log lag.
- Si event store indisponible, decisions critiques bloquees.

### US-K2 - Reconnexion Colyseus

Criteres :

- `onDrop` ouvre fenetre reconnexion.
- `onReconnect` restaure connected=true.
- `onLeave` definitif applique `disconnectPolicy`.
- Dashboard affiche `reconnectUntil` et impact sportif.

### US-K3 - Reprise apres crash room

Criteres :

- Snapshots periodiques pour simulations continues.
- Replay evenementiel reconstruit l'etat officiel.
- Si etat non certifiable, round passe revision/void/replay selon regle.
