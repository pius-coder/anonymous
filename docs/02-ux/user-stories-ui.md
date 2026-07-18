# User stories UI issues du produit reel

## Statut de ce document

Ce document remplace les descriptions UI generiques par des comportements observables par un humain.
Il est construit a partir de la branche `v0.1`, des routes et cas d'usage actuels, des contrats
Protobuf, ainsi que des parcours utiles verifies dans le legacy.

Une story ne donne jamais un role utilisateur a une API, un worker, Prisma ou ConnectRPC. Ces elements
sont des collaborateurs techniques mentionnes dans les criteres d'acceptation.

## Regles communes a toutes les audiences

- Le shell applicatif occupe `100dvh` et ne provoque pas de scroll de page.
- Les listes, tables, sheets et panneaux possedent leur propre scroll lorsque necessaire.
- La navigation et les donnees sont filtrees cote serveur; masquer un bouton ne remplace pas RBAC.
- Chaque lecture distante couvre loading, empty, error, stale et success.
- Chaque action couvre idle, pending, success, refused et retry lorsque le retry est sur.
- Une audience ne recoit pas les champs qui lui sont interdits.
- ConnectRPC porte les commands et queries HTTP; Colyseus porte le live de la room.
- Une notification ou une deadline ne demarre jamais une manche et ne publie jamais un score.

## Invite et utilisateur non authentifie

| ID | Contexte | L'utilisateur doit voir | L'utilisateur peut faire | Interdit ou absent | Service |
|---|---|---|---|---|---|
| PUB-01 | Arrivee sur le produit | Identite du jeu, parties accessibles, prochaine partie, CTA prioritaire | Ouvrir le catalogue, se connecter, creer un compte | Navigation admin et etats prives | SessionService |
| PUB-02 | Catalogue | Parties publiques, horaire, acces, capacite publique, statut d'inscription | Rechercher, filtrer, ouvrir une partie | Participants prives, gates, audit | SessionService |
| PUB-03 | Detail public | Nom, description, programme public, prix, capacite et conditions | Se connecter ou commencer l'inscription | Configuration admin et score provisoire | SessionService |
| PUB-04 | Code inconnu ou partie retiree | Etat introuvable sans fuite sur l'existence interne | Revenir au catalogue | IDs internes et raison compliance | SessionService |
| AUTH-01 | Inscription | Email, nom, mot de passe, exigences et erreurs par champ | Creer son compte | Roles et permissions | IdentityService |
| AUTH-02 | Connexion | Identifiants, etat de tentative et aide de recuperation | Se connecter | Distinction email existant/inexistant | IdentityService |
| AUTH-03 | Session expiree | Explication claire et retour preserve | Se reconnecter | Reutilisation silencieuse d'un token expire | IdentityService |

## Joueur authentifie - compte et acquisition

| ID | Contexte | Le joueur doit voir | Le joueur peut faire | Interdit ou absent | Service |
|---|---|---|---|---|---|
| PLY-01 | Header global | Avatar, notifications, statut reseau, menu de compte | Ouvrir profil, notifications, se deconnecter | Outils admin | IdentityService |
| PLY-02 | Profil | Nom, email masque si necessaire, avatar, roles personnels | Modifier les donnees autorisees | Affectation de role | IdentityService |
| PLY-03 | Mes parties | Parties a venir, live, terminees et annulees | Reprendre le bon flow selon le statut | Parties d'autres joueurs | ParticipationService |
| PLY-04 | Inscription ouverte | Capacite, prix, conditions et confirmation | S'inscrire une seule fois | Creation de doublon | ParticipationService |
| PLY-05 | Deja inscrit | Statut terminal coherent et prochaine etape | Voir son inscription | Formulaire de paiement contradictoire | ParticipationService |
| PLY-06 | Partie pleine | Motif public et absence de debit | Revenir ou choisir une autre partie | Contournement de capacite | ParticipationService |
| PLY-07 | Annulation autorisee | Consequence et eventuel impact paiement | Confirmer l'annulation | Annulation apres verrouillage non autorisee | ParticipationService |

## Joueur - paiement et wallet

| ID | Contexte | Le joueur doit voir | Le joueur peut faire | Interdit ou absent | Service |
|---|---|---|---|---|---|
| PAY-01 | Participation payante | Montant, devise, moyens disponibles, statut courant | Payer par provider ou wallet | Payload provider et ledger complet | PaymentService |
| PAY-02 | Paiement externe en attente | Processing, date de derniere verification, prochaine action | Verifier le paiement ou reprendre si autorise | Faux succes anticipe | PaymentService |
| PAY-03 | Paiement confirme | Confirmation, participation debloquee, acces au lobby | Continuer vers la preparation | Bouton de second debit | PaymentService |
| PAY-04 | Paiement echoue/expire | Raison publique et absence de double debit | Reessayer de maniere idempotente | Stack trace et reference secrete | PaymentService |
| PAY-05 | Wallet | Solde, devise et mouvements personnels autorises | Selectionner le wallet comme moyen | Wallet d'un tiers | PaymentService |
| PAY-06 | Solde insuffisant | Solde actuel, montant manquant, aucun debit | Choisir un autre moyen | Solde negatif cree par l'UI | PaymentService |
| PAY-07 | Historique personnel | Transactions personnelles avec statut lisible | Ouvrir le detail public d'une transaction | Idempotency keys internes | PaymentService |

## Joueur - preparation, room et social

| ID | Contexte | Le joueur doit voir | Le joueur peut faire | Interdit ou absent | Service/transport |
|---|---|---|---|---|---|
| LOB-01 | Preparation fermee | Horaire et conditions restantes | Attendre ou revenir | Acces live premature | PreparationService |
| LOB-02 | Preparation ouverte | Annonce, presence, readiness, paiement/admission et prochaine action | Marquer present puis pret | Pret confondu avec connexion live | PreparationService |
| LOB-03 | Etat bloque | Cause exacte: paiement, admission ou phase | Resoudre la cause lorsqu'une action existe | Bouton live inutilisable sans explication | PreparationService |
| ROOM-01 | Entree room | Progression de connexion et place reservee | Reessayer si l'acces est encore valide | Token live affiche | RealtimeAccessService |
| ROOM-02 | Room connectee | Scene 2D, avatar local, joueurs autorises, zones et phase | Se deplacer, ping, emote et interactions autorisees | Etat prive concurrent | Colyseus |
| ROOM-03 | Groupe social ouvert | Groupes, membres, capacite et demandes | Creer, rejoindre, inviter, accepter ou quitter selon droits | Action chef pour un simple membre | Colyseus |
| ROOM-04 | Chat | Canaux autorises, messages recents et erreurs publiques | Envoyer global, groupe ou prive selon phase | Messages d'une audience interdite | Colyseus |
| ROOM-05 | Perte reseau | Reconnexion, place conservee, dernier etat confirme | Reconnecter | Replay automatique d'un input | Colyseus |

## Joueur - manche et resultats

| ID | Contexte | Le joueur doit voir | Le joueur peut faire | Interdit ou absent | Service/transport |
|---|---|---|---|---|---|
| RND-01 | Briefing | Nom, objectif, regles, commandes, timer de briefing et attente admin | Lire et preparer l'interface | Input competitif | Colyseus |
| RND-02 | Manche active | Canvas Pixi, HUD, deadline serveur, feedback de commande | Executer uniquement les commandes du manifest | Calcul local autoritaire du score | Colyseus |
| RND-03 | Commande acceptee | Confirmation locale non ambiguë | Continuer si le jeu l'autorise | Double envoi du nonce | Colyseus |
| RND-04 | Commande refusee | Motif public: phase, retard, doublon ou payload | Corriger ou attendre selon le motif | Detail anti-cheat prive | Colyseus |
| RND-05 | Pause admin | Jeu gele, timer serveur et raison publique si disponible | Attendre la reprise | Input cache pendant la pause | Colyseus |
| RND-06 | Joueur termine | Accuse de reception et attente de verification | Quitter le canvas vers l'attente | Score ou rang provisoire | RoundService |
| RND-07 | Joueur elimine | Etat elimine et scene observer filtree | Observer la suite | Reponses cachees | Colyseus |
| RND-08 | Verification | Progression de verification et annonce | Actualiser ou attendre | Evidence et scores provisoires | ScoringService |
| RND-09 | Resultats publies | Score officiel, rang, qualification et statut de gain | Voir manche suivante ou fin | Ancienne version non marquee | ScoringService |
| RND-10 | Partie terminee | Recapitulatif final et statut des gains | Revenir a ses parties | Retour vers une manche active | ScoringService |

## Observateur autorise

| ID | Contexte | L'observateur doit voir | L'observateur peut faire | Interdit ou absent | Service/transport |
|---|---|---|---|---|---|
| OBS-01 | Acces accorde | Marque readonly, phase, compteurs et scene filtree | Se connecter au flux et changer de vue publique | Commande joueur/admin | RealtimeAccessService |
| OBS-02 | Manche active | Etat public, avatars autorises, progression globale | Zoomer, cadrer, consulter un joueur autorise | Reponse cachee et input | Colyseus |
| OBS-03 | Snapshot stale | Derniere synchronisation et reconnexion | Rafraichir ou reconnecter | Presentation de donnees stale comme live | Colyseus |
| OBS-04 | Resultats | Resultats seulement apres publication | Consulter le classement public | Score provisoire | ScoringService |

## Administrateur et super-administrateur

| ID | Contexte | L'admin doit voir | L'admin peut faire | Interdit ou absent | Service |
|---|---|---|---|---|---|
| ADM-01 | Dashboard | Parties par phase, alertes, prochaine action et incidents | Ouvrir un command center | Donnees financieres non necessaires | AdminService |
| ADM-02 | Creation | Configuration, programme de manches, capacite, prix et preview | Enregistrer un brouillon | Demarrage live | SessionService |
| ADM-03 | Validation | Erreurs par champ, gates et impact public | Corriger puis revalider | Publication si gate bloquant | SessionService |
| ADM-04 | Publication/planification | Consequences, horaire et preview publique | Confirmer publication ou planification | Demarrage automatique | SessionService |
| ADM-05 | Participants | Presence, readiness, paiement bloque, connexion et admission | Filtrer et ouvrir un detail readonly | Jouer a la place du joueur | AdminService |
| ADM-06 | Preparation | Compteurs, absents, annonce et etat stale | Ouvrir, annoncer, confirmer le start | Start implicite par annonce | PreparationService |
| ADM-07 | Confirmation avec absents | Liste des absents et consequence | Saisir une raison et confirmer | Confirmation sans audit | PreparationService |
| ADM-08 | Command center | Phase, lease, connexions, anomalies, round et timeline | Configurer, briefing, start, pause, reprise, fermeture | Action sensible sur snapshot stale | RoundService |
| ADM-09 | Multi-admin | Detenteur du lease et commande concurrente | Reprendre le controle selon politique | Deux decisions simultanees invisibles | AdminService |
| ADM-10 | Scores provisoires | Scores, evidence redigee, anomalies et version | Corriger avec raison | Publication automatique | ScoringService |
| ADM-11 | Publication resultats | Diff final, gates, gains bloques et audience | Publier explicitement | Modification ledger | ScoringService |
| ADM-12 | Mini-jeux | Manifests, versions, familles, activation et assets | Configurer le programme et verifier les dependances | Modifier un runtime live en cours | MiniGameService |
| ADM-13 | Incidents et anti-cheat | Signaux rediges, correlation, statut et owner | Ouvrir, assigner, escalader | Reponse secrete brute | SupportService |
| ADM-14 | Audit | Acteur, action, entite, raison, resultat et correlation | Filtrer et exporter si autorise | Secret ou token | AuditService |
| ADM-15 | Compliance | Gate, evidence, impact et historique | Valider ou waiver avec raison | Gate sans chemin de resolution | ComplianceService |

## Support

| ID | Contexte | Le support doit voir | Le support peut faire | Interdit ou absent | Service |
|---|---|---|---|---|---|
| SUP-01 | Recherche | Partie, joueur, transaction ou incident par reference | Ouvrir le dossier autorise | Exploration globale sans permission | SupportService |
| SUP-02 | Dossier joueur | Participation, erreurs publiques, connexions et timeline redigee | Ajouter une note ou ouvrir un incident | Commande de competition | SupportService |
| SUP-03 | Snapshot live | Projection joueur readonly autorisee | Diagnostiquer connexion et phase | Input joueur et private state | AdminService |
| SUP-04 | Incident | Severite, owner, timeline et liens | Assigner, escalader, resoudre selon permission | Correction score par defaut | SupportService |
| SUP-05 | Livraison notification | Canal, statut, tentatives et erreur redigee | Relancer si l'action est idempotente | Credential provider | NotificationService |

## Finance

| ID | Contexte | La finance doit voir | La finance peut faire | Interdit ou absent | Service |
|---|---|---|---|---|---|
| FIN-01 | Recherche | Transaction, joueur, participation et reference provider redigee | Rechercher et filtrer | Commandes de round | PaymentService |
| FIN-02 | Transaction | Montant, devise, statut, chronologie et rapprochement | Ouvrir la reconciliation | Payload provider brut | PaymentService |
| FIN-03 | Ledger | Entrees, direction, balance et idempotence | Filtrer et exporter si autorise | Modification directe d'une ligne | PaymentService |
| FIN-04 | Reconciliation | Etat local/provider et consequence | Confirmer un retry idempotent | Double mouvement | PaymentService |
| FIN-05 | Gains | Publication liee, beneficiaires, statuts et anomalies | Relancer un job autorise | Gain avant resultats publies | PaymentService |
| FIN-06 | Remboursement/litige | Paiement source, decision et piste d'audit | Initier le flow autorise | Suppression de transaction | PaymentService |

## Definition of done d'une story UI

- La route et l'audience sont identifiees.
- La command ou query ConnectRPC est nommee; un evenement live nomme Colyseus explicitement.
- Le composant ne declare pas ses propres DTO metier si un type genere existe.
- Les donnees visibles et interdites sont testees.
- Les variantes desktop, tablette et mobile existent.
- Le shell ne provoque aucun scroll de page.
- Les etats loading, empty, error, stale, pending et success pertinents existent.
- Les actions sensibles utilisent AlertDialog ou Dialog avec raison.
- La scene Pixi detruit ses ressources au demontage.
- Les tests de role, no-leak, clavier et reconnexion sont verts.
