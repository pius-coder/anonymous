# Couverture Narrative Des Cas D'Utilisation

Ce document sert a verifier si le plan couvre vraiment les cas d'utilisation du produit. Il ne remplace
pas les fiches sprint. Il explique les parcours comme un jeu: qui agit, ou il agit, ce qu'il clique,
ce que le systeme doit faire, ce qui peut mal se passer, et quelle preuve est attendue.

Le plan est considere complet seulement quand chaque parcours ci-dessous est decompose dans une fiche
sprint avec des scenarios d'acceptation atomiques, des UML liees, des contrats, des etats UI et des tests.

## 1. Decouvrir Une Partie Publique

Le joueur arrive sur la surface publique pour trouver une partie. Il doit pouvoir cliquer sur une action
du type `Voir les parties`, parcourir les parties publiees, puis cliquer `Voir details` sur une partie.
Le detail doit expliquer l'etat de la partie, son horaire, ses conditions d'acces, son prix si applicable
et l'action possible suivante.

Le plan couvre le parcours principal dans le sprint 05. Il doit encore etre detaille pour les variantes:
aucune partie publiee, partie retiree pendant la consultation, code invalide, partie pleine, partie non
encore ouverte a l'inscription, utilisateur deja inscrit, utilisateur non connecte, erreur reseau et
chargement lent.

Les UML a relire sont la machine d'etat de partie, les permissions et le data flow. Les tests doivent
prouver que le joueur ne voit pas de champs admin et que les CTA affiches correspondent vraiment a l'etat
metier.

## 2. Creer, Configurer Et Publier Une Partie

L'admin ouvre son espace d'administration, clique `Creer une partie`, renseigne les champs de configuration,
clique `Enregistrer le brouillon`, puis `Valider la configuration`. Si la configuration est correcte, il
peut cliquer `Publier`; sinon, chaque erreur doit pointer vers le champ ou la regle bloquante.

Le plan couvre ce flux dans les sprints 03 et 05. Il doit encore detailler les cas ou l'admin modifie une
partie deja publiee, annule un brouillon, retire une partie publique, republie apres correction, perd sa
session pendant l'edition, travaille avec un etat stale, ou rencontre un gate compliance bloquant.

Les tests doivent prouver que publier une partie ne lance jamais le live, que l'audit est cree, que le
support ne peut pas publier, et que le joueur ne voit la partie qu'apres publication.

## 3. S'Inscrire Et Gérer Sa Participation

Le joueur clique `S'inscrire` depuis le detail d'une partie. Le systeme cree une participation explicite
et lui affiche un statut clair. Depuis `Mes parties`, le joueur doit pouvoir cliquer `Voir mon statut` et,
si les regles l'autorisent, `Annuler ma participation`.

Le plan couvre ce flux dans le sprint 06. Les variantes a ajouter sont importantes: double clic sur
`S'inscrire`, inscription alors que la capacite vient de se remplir, annulation apres paiement, annulation
apres ouverture de preparation, expiration automatique, changement d'utilisateur, participation deja
existante et partie annulee par admin.

La machine d'etat de participation est la source de verite. Les tests doivent verifier que paiement,
presence, readiness, connexion realtime et admission round restent des concepts separes.

## 4. Payer Une Participation

Quand une partie exige un paiement, le joueur arrive sur l'ecran paiement. Il peut cliquer `Payer maintenant`
pour un provider externe ou `Payer avec wallet` si ce mode est disponible. Il doit ensuite pouvoir cliquer
`Verifier le paiement` et comprendre si son acces est confirme, en attente, echoue ou a reprendre.

Le plan couvre provider, wallet, ledger et reconciliation dans le sprint 07. Les cas manquants a detailler
sont le paiement abandonne, provider indisponible, webhook en retard, webhook rejoue, montant divergent,
wallet insuffisant, wallet gele, remboursement, paiement annule apres inscription et litige support.

Les tests doivent prouver qu'aucun debit wallet n'est double, qu'un paiement wallet cree aussi une
transaction, que l'admin ne modifie pas le ledger, et que la finance n'obtient pas de commandes de jeu.

## 5. Entrer En Preparation Et Se Declarer Pret

L'admin clique `Ouvrir la preparation`. Le joueur voit le lobby, clique `Je suis present`, puis `Je suis
pret`. L'admin voit les compteurs de readiness se mettre a jour et peut envoyer une annonce avec
`Envoyer l'annonce`.

Le sprint 08 couvre le parcours principal. Il faut encore detailler: joueur non paye, joueur en retard,
joueur absent, joueur qui retire son pret, changement de readiness pendant que l'admin regarde une liste
stale, annonce vide, annonce trop longue, notification echouee, et confirmation avec absents.

La sequence preparation et la machine d'etat partie doivent etre synchronisees. Les tests doivent prouver
qu'un rappel ou une annonce ne demarre jamais une manche active.

## 6. Lancer Une Manche

L'admin ne lance pas une manche depuis un timer. Il clique d'abord `Lancer le briefing`, puis, quand la
situation est correcte, `Demarrer la manche`. Si des joueurs sont absents ou non prets, une confirmation
avec raison doit etre exigee.

Les sprints 08 et 10 couvrent le lancement. Les variantes a prevoir sont: admin sans permission, support
qui tente de lancer, double clic sur lancement, deux admins qui agissent en meme temps, etat stale,
participant admis puis deconnecte, manche deja active et round mal configure.

Les tests doivent prouver que `SCHEDULED -> ACTIVE_ROUND` est impossible, que l'action admin est auditee,
et que les joueurs recoivent le bon etat de briefing puis de round actif.

## 7. Jouer Un Mini-Jeu

Le joueur entre dans la manche active et clique une action de jeu, par exemple `Envoyer mon action`,
`Valider ma reponse`, `Terminer`, ou un bouton propre au mini-jeu. Le serveur valide la phase, la
participation, le nonce, le payload et les regles du runtime. Le joueur recoit un feedback accepte ou
refuse.

Le plan couvre le framework dans le sprint 14 et le lot pilote dans le sprint 15. Il manque encore les
fiches de chaque mini-jeu avec les boutons exacts, les informations visibles, les informations cachees,
les commandes permises, le scoring, les deadlines, la reconnexion et l'anti-triche.

Les tests doivent prouver le runtime deterministe, les inputs tardifs refuses, les doublons idempotents,
la non-fuite de private state et le score provisoire produit avec evidence.

## 8. Finir Une Manche Et Attendre La Verification

Quand le joueur termine ou depasse le temps, il doit passer sur un etat d'attente clair. S'il clique
`Voir mes resultats` avant publication, le systeme doit expliquer que la verification admin est en cours.
Il ne doit jamais voir le score provisoire.

Les sprints 10, 11 et 13 couvrent ce parcours. Il faut encore detailler les cas de joueur timeout,
joueur deconnecte, joueur elimine, joueur qui tente de resoumettre apres fin, joueur qui recharge la page
en attente review, et admin qui corrige pendant que le joueur attend.

L'UML scoring/publication est la reference. Les tests doivent verifier qu'aucun score provisoire, rang ou
evidence privee n'apparait dans la projection joueur ou observateur.

## 9. Verifier, Corriger Et Publier Les Scores

L'admin ouvre la table des scores provisoires avec `Voir scores provisoires`. Il consulte anomalies et
evidence, clique `Corriger le score` si necessaire, saisit une raison, puis clique `Publier les resultats`.
Apres publication, le joueur peut voir ses resultats.

Le sprint 13 couvre le noyau. Les variantes restantes sont: correction sans raison, correction concurrente,
publication double, publication apres etat stale, rollback de publication, versionnement de resultats,
dispute joueur, support read-only, et gains financiers apres publication.

Les tests doivent prouver que la publication est une commande admin autorisee, que la correction est auditee,
que la publication est idempotente ou explicitement versionnee, et que les gains ne partent pas avant
publication.

## 10. Superviser Comme Admin

L'admin utilise un command center. Il clique `Participants`, `Connexions`, `Timeline`, `Scores provisoires`,
`Incidents`, puis execute les commandes permises selon la phase. Chaque commande sensible demande une
confirmation ou une raison quand le risque produit l'exige.

Le sprint 12 couvre la surface admin. Les cas a completer concernent le multi-admin, le lease de controle,
la perte de connexion admin, la lecture stale, le support connecte sur le meme dossier, les actions refusees,
les commandes en double et la separation finance/admin.

Les tests doivent prouver que l'admin ne controle jamais directement le client joueur, que le support ne
voit pas les boutons de commande competition, et que chaque action sensible cree une trace.

## 11. Observer En Lecture Seule

L'observateur clique `Observer la partie` et recoit un snapshot filtre. Il peut suivre la progression mais
ne doit jamais envoyer d'input, voir les reponses cachees, voir les scores provisoires ou acceder aux
donnees paiement.

Les sprints 09 et 16 couvrent l'observation. Les variantes restantes sont: observer non autorise, snapshot
stale, reconnexion observer, joueur elimine qui passe en spectateur, support qui ouvre un snapshot individuel,
et carte/social si un usage produit est valide.

Les tests doivent simuler un client malveillant qui force une commande observer. Le serveur doit refuser.

## 12. Recevoir Notifications Et Rappels

L'admin envoie une annonce. Le joueur voit une notification claire et peut cliquer pour revenir au lobby.
Le support ou l'admin peut voir si le message est en attente, envoye ou echoue.

Le sprint 17 couvre le sujet. Les cas a detailler sont: preference de canal, consentement, provider down,
retry, message duplique, utilisateur sans contact valide, notification lue/non lue, et redaction des
erreurs provider.

Les tests doivent prouver qu'une notification ne demarre aucune partie, ne publie aucun score et ne logue
aucun secret.

## 13. Traiter Support, Compliance, Audit Et Anti-Cheat

Le support clique `Voir dossier`, `Ouvrir incident` ou `Voir audit`. L'admin clique `Examiner le gate`,
`Valider le gate`, `Waiver le gate` ou `Voir signaux anti-cheat`. Chaque decision sensible doit demander
une raison et produire une trace.

Le sprint 18 couvre ce domaine. Les cas restants sont: escalade support vers admin, incident resolu,
incident lie a un paiement, gate qui bloque une publication, anti-cheat lie a un input tardif ou duplicate
nonce, donnees a rediger dans l'audit, et retention.

Les tests doivent prouver que le support lit sans commander la competition, que les signaux anti-cheat ne
stockent pas les reponses cachees, et que les gates compliance ne sont plus des blocages sans issue.

## 14. Fermer La Partie Et Preparer La Manche Suivante

Apres publication, l'admin clique `Preparer la manche suivante` ou `Terminer la partie`. Les joueurs
voient soit l'attente de prochaine manche, soit les resultats finaux. Les workers post-publication peuvent
declencher les jobs autorises.

Le plan couvre ce point dans les sprints 13 et 19, mais il doit etre davantage detaille: derniere manche,
manche suivante annulee, joueur absent entre deux manches, publication finale, gains, notifications de fin,
archive des resultats et acces observer apres fin.

Les tests doivent prouver que l'on ne revient pas vers une manche sans resultats publies, et que `Completed`
est terminal.

## Conclusion De Couverture

La roadmap couvre les grands domaines du produit. Elle ne couvre pas encore exhaustivement tous les cas
d'utilisation atomiques. Les zones les moins detaillees sont les mini-jeux un par un, les conflits multi-admin,
les remboursements/litiges finance, les preferences de notification, les cycles support complets et les
variantes post-publication.

Avant de coder un sprint, l'agent doit donc prendre le parcours concerne dans ce document, completer les
variantes manquantes dans la fiche sprint, verifier l'UML, puis seulement ensuite definir contrats, couches
et tests.
