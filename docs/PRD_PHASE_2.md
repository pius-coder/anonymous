# PRD - Phase 2 : Feature Branch Mapping

Version : 0.1
Date : 2026-07-07
Statut : Phase 2 uniquement

Documents de reference :
- `PRD_PHASE_1.md`
- `BRAINSTORMING.md`
- `catalogue-mini-jeux.md`

Recherche en ligne utilisee :
- Fapshi API officielle : https://docs.fapshi.com/en
- Fapshi API index : https://docs.fapshi.com/llms.txt
- Recherche sur les risques de qualification jeux d'adresse / jeux d'argent / competitions payantes

Objectif de cette phase :

Identifier les grandes branches fonctionnelles du produit. Cette phase ne redige pas encore les specifications detaillees de chaque feature. Les sections PRD detaillees seront produites en Phase 4, une branche a la fois.

---

## 1. Synthese des branches fonctionnelles

Le produit peut etre decoupe en 15 branches fonctionnelles majeures :

1. Acquisition, landing et catalogue public des sessions
2. Authentification et gestion de compte
3. Profil joueur et historique
4. Creation et configuration des sessions admin
5. Inscription joueur a une session
6. Paiement Fapshi et validation transactionnelle
7. Wallet interne, ledger et credits
8. Lobby, check-in et preparation de session
9. GameSession live et orchestration temps reel
10. Game engine et resolution des rounds
11. Catalogue de mini-jeux configurables
12. Resultats, gains et distribution
13. Dashboard admin live, audit et support operations
14. Notifications et diffusion communautaire WhatsApp
15. Securite, anti-triche, conformite et moderation

Ces branches couvrent le parcours complet :

decouverte -> compte -> session -> paiement -> lobby -> jeu live -> resultats -> wallet -> retention.

---

## 2. Branches fonctionnelles detaillees

## 2.1 Acquisition, landing et catalogue public des sessions

Feature name : Acquisition, landing et catalogue public des sessions

Purpose :
Permettre aux visiteurs de comprendre le concept, consulter les sessions disponibles et acceder rapidement a une session publique ou partagee.

Target users :
- visiteurs non connectes ;
- joueurs existants ;
- communautes venant d'un lien WhatsApp ;
- admins qui veulent partager une session.

Business value :
Elevee. Cette branche controle l'entree du funnel : decouverte, conversion vers inscription, partage et remplissage des sessions.

Technical complexity :
Moyenne. Les pages publiques sont classiques, mais la visibilite `PUBLIC`, `UNLISTED`, `PRIVATE`, les statuts de session et les compteurs en temps quasi reel ajoutent de la complexite.

Dependencies :
- `GameSession`
- visibilite des sessions
- statut des sessions
- auth optionnelle
- liens partageables
- SEO / metadata

Risk level :
Moyen. Risque principal : mauvaise comprehension du produit ou promesse marketing juridiquement dangereuse si le wording evoque trop le pari.

Required research depth :
Moyenne. Recherche UX et wording necessaire, plus validation legale du vocabulaire public.

---

## 2.2 Authentification et gestion de compte

Feature name : Authentification et gestion de compte

Purpose :
Permettre aux joueurs et admins de creer un compte, se connecter, gerer leur session serveur et proteger l'acces aux fonctions sensibles.

Target users :
- joueurs ;
- admins ;
- support / operateurs.

Business value :
Elevee. L'auth est obligatoire pour payer, jouer, tracer les actions, gerer le wallet et prevenir les abus.

Technical complexity :
Moyenne a elevee. Le choix retenu est une couche auth propre avec Hono, Prisma, sessions serveur, cookies securises, RBAC et audit.

Dependencies :
- `User`
- `PlayerProfile`
- session serveur
- cookies securises
- RBAC
- audit log
- hash mot de passe

Risk level :
Eleve. Risques de securite, usurpation de compte, acces admin non autorise, multi-compte.

Required research depth :
Moyenne. Les principes sont connus, mais il faudra clarifier OTP, 2FA admin, reset password, verification email/telephone et politique anti-multi-compte.

---

## 2.3 Profil joueur et historique

Feature name : Profil joueur et historique

Purpose :
Donner au joueur une identite de jeu, un historique, des statistiques et une vue sur ses sessions passees/futures.

Target users :
- joueurs ;
- admins support ;
- potentiellement autres joueurs si profils publics.

Business value :
Moyenne. Ameliore retention, confiance et progression. Non critique pour le paiement initial mais utile pour la boucle long terme.

Technical complexity :
Faible a moyenne. Profil, avatar, statistiques et historique sont classiques, mais les stats doivent etre derivees proprement des resultats officiels.

Dependencies :
- `User`
- `PlayerProfile`
- `GameResult`
- `RoundResult`
- `Wallet`
- sessions jouees

Risk level :
Moyen. Risques de confidentialite, exposition publique excessive, stats incoherentes si les resultats sont recalcules incorrectement.

Required research depth :
Faible. Peu de recherche externe necessaire, sauf choix UX et politique de donnees publiques.

---

## 2.4 Creation et configuration des sessions admin

Feature name : Creation et configuration des sessions admin

Purpose :
Permettre a l'admin de creer une session payante autonome, configurer prix, places, visibilite, gains, commission, rounds et statut de publication.

Target users :
- admins ;
- organisateurs internes ;
- futurs organisateurs externes si marketplace plus tard.

Business value :
Tres elevee. C'est le coeur de la monetisation : chaque session doit etre configurable, publiable et rentable seule.

Technical complexity :
Elevee. La configuration touche au modele economique, aux regles de jeu, aux statuts, aux contraintes de paiement, au planning et a l'audit.

Dependencies :
- `GameSession`
- `PrizeConfig`
- `SessionConfig`
- `RoundConfig`
- `MiniGameDefinition`
- admin RBAC
- audit log
- simulation rentabilite

Risk level :
Eleve. Une mauvaise configuration peut creer une session non rentable, injuste, juridiquement risquee ou impossible a executer.

Required research depth :
Elevee. Recherche necessaire sur regles de distribution, seuils de rentabilite, contraintes legales, UX admin et valeurs par defaut.

---

## 2.5 Inscription joueur a une session

Feature name : Inscription joueur a une session

Purpose :
Permettre a un joueur connecte de reserver une place dans une session, declencher le paiement et suivre son statut d'inscription.

Target users :
- joueurs ;
- admins support.

Business value :
Tres elevee. C'est le point de conversion principal entre intention et revenu.

Technical complexity :
Moyenne a elevee. Il faut gerer capacite max, minimum joueurs, expiration de paiement, statut d'inscription, prevention double inscription et concurrence.

Dependencies :
- auth
- `GameSession`
- `SessionRegistration`
- `Payment`
- wallet
- Fapshi
- BullMQ pour expiration

Risk level :
Eleve. Risques de double paiement, place bloquee, session pleine, paiement confirme trop tard, inscription incoherente.

Required research depth :
Moyenne. Recherche surtout operationnelle : duree de reservation, expiration paiement, politique si session annulee.

---

## 2.6 Paiement Fapshi et validation transactionnelle

Feature name : Paiement Fapshi et validation transactionnelle

Purpose :
Collecter les frais d'inscription via Fapshi, recevoir les webhooks, verifier les statuts et transformer une inscription `PAYMENT_PENDING` en `PAID`.

Target users :
- joueurs ;
- admins support ;
- equipe finance/operations.

Business value :
Critique. Sans paiement fiable, pas de revenu, pas de confiance, pas de session valide.

Technical complexity :
Elevee. Webhooks, reconciliation, idempotence, secrets, environnements sandbox/live, limites de polling et transactions DB critiques.

Dependencies :
- Fapshi API
- `Payment`
- `SessionRegistration`
- `LedgerEntry`
- `Wallet`
- Hono API
- PostgreSQL/Prisma transactions
- BullMQ reconciliation
- audit log

Risk level :
Tres eleve. Risques financiers directs : faux positif paiement, double confirmation, webhook replay, paiement non associe, paiement expire.

Required research depth :
Elevee. Recherche Fapshi detaillee obligatoire en Phase 3/4 : endpoints, webhooks, idempotence, statuts, erreurs, sandbox, security.

Research notes :
La documentation Fapshi officielle indique que les webhooks doivent etre privilegies par rapport au polling, que le webhook peut etre securise avec `x-wh-secret`, et que les environnements sandbox/live utilisent des credentials separes.

---

## 2.7 Wallet interne, ledger et credits

Feature name : Wallet interne, ledger et credits

Purpose :
Gerer le solde interne joueur, tracer tous les mouvements financiers et permettre de payer une prochaine session avec un credit interne.

Target users :
- joueurs ;
- admins support ;
- finance/operations.

Business value :
Tres elevee. Le wallet soutient la retention et permet de reutiliser les gains dans la plateforme.

Technical complexity :
Tres elevee. Toute mutation de solde doit etre transactionnelle, auditable et coherente avec le ledger.

Dependencies :
- `Wallet`
- `LedgerEntry`
- paiements
- resultats
- distribution des gains
- remboursements
- admin adjustments
- audit log

Risk level :
Tres eleve. Risques financiers, juridiques, fraude, erreurs de solde, litiges.

Required research depth :
Elevee. Recherche juridique et comptable necessaire. Il faut definir si le wallet est credit interne, monnaie electronique, bon d'achat, cagnotte ou autre qualification locale.

---

## 2.8 Lobby, check-in et preparation de session

Feature name : Lobby, check-in et preparation de session

Purpose :
Rassembler les joueurs payes avant le debut, verifier leur presence, afficher les regles et preparer l'entree dans la room live.

Target users :
- joueurs inscrits/payes ;
- admins live.

Business value :
Elevee. Reduit les sessions ratees, les absences et les litiges au demarrage.

Technical complexity :
Moyenne. Presence, check-in, compte a rebours, statuts et transition vers Colyseus.

Dependencies :
- paiement confirme
- `SessionRegistration`
- `GameSessionStatus`
- presence Redis
- Colyseus room join
- BullMQ timer

Risk level :
Moyen a eleve. Absents, retards, deconnexions, joueurs payes mais non presents, minimum joueurs non atteint.

Required research depth :
Moyenne. Regles metier a clarifier : delai de check-in, absence, remboursement, remplacement, report.

---

## 2.9 GameSession live et orchestration temps reel

Feature name : GameSession live et orchestration temps reel

Purpose :
Orchestrer la session live : presence, transitions entre rounds, pauses, reprise, joueurs actifs, elimines, spectateurs et etat synchronise.

Target users :
- joueurs actifs ;
- joueurs elimines ;
- admins live ;
- systeme game-server.

Business value :
Critique. C'est l'experience centrale du produit.

Technical complexity :
Tres elevee. Colyseus, state sync, transitions, timers serveur, reconnexion, crash recovery et coherence DB/live.

Dependencies :
- Colyseus
- game-engine
- Redis
- PostgreSQL deadlines
- BullMQ
- `Round`
- `RoundResult`
- `Elimination`
- presence

Risk level :
Tres eleve. Risques de session bloquee, resolution incorrecte, latence, desync, crash, deconnexion joueur.

Required research depth :
Elevee. Recherche technique Colyseus et architecture live necessaire avant specs detaillees.

---

## 2.10 Game engine et resolution des rounds

Feature name : Game engine et resolution des rounds

Purpose :
Centraliser les regles de jeu hors Colyseus : eligibilite, qualification, elimination, classement, application de `winnersCount`, transitions et resultats.

Target users :
- developpeurs ;
- game-server ;
- admins indirectement via configuration.

Business value :
Tres elevee. Rend le systeme maintenable et permet d'ajouter des mini-jeux sans casser le live.

Technical complexity :
Tres elevee. Il faut modeliser des regles generiques capables de couvrir plusieurs familles de mini-jeux.

Dependencies :
- `MiniGameDefinition`
- `RoundConfig`
- `RoundResult`
- `Elimination`
- `GameResult`
- Colyseus
- PostgreSQL transactions
- tests engine

Risk level :
Tres eleve. Une erreur de resolution impacte directement les eliminations, resultats, gains et litiges.

Required research depth :
Elevee. Recherche et conception approfondies necessaires : state machines, deterministic resolution, auditability, test strategy.

---

## 2.11 Catalogue de mini-jeux configurables

Feature name : Catalogue de mini-jeux configurables

Purpose :
Transformer le catalogue de 120 idees en familles techniques parametrables, exploitables par le game-engine et Colyseus.

Target users :
- joueurs ;
- admins configurant les rounds ;
- developpeurs gameplay.

Business value :
Elevee. Le catalogue est le contenu qui rend les sessions rejouables et differenciees.

Technical complexity :
Tres elevee si les 120 jeux sont vises directement. Moyenne a elevee pour un MVP limite a quelques familles.

Dependencies :
- game-engine
- Colyseus rooms
- config schemas
- anti-cheat policies
- assets UI/audio
- scoring
- latency handling

Risk level :
Eleve. Risques de sur-scope, triche, bugs de resolution, jeux injustes, hasard trop dominant, mauvaise comprehension joueur.

Required research depth :
Elevee. Recherche gameplay et juridique necessaire pour prioriser les mini-jeux MVP, reduire le hasard et definir les familles techniques.

---

## 2.12 Resultats, gains et distribution

Feature name : Resultats, gains et distribution

Purpose :
Enregistrer les resultats officiels d'une session, determiner les gagnants, calculer les gains, crediter le wallet et afficher le recap.

Target users :
- joueurs ;
- gagnants ;
- admins ;
- support/finance.

Business value :
Critique. C'est le moment de confiance : les joueurs doivent comprendre pourquoi ils ont gagne, perdu ou ete elimines.

Technical complexity :
Tres elevee. Calcul financier, regles de distribution, ledger, audit, idempotence et litiges.

Dependencies :
- `GameResult`
- `RoundResult`
- `PrizeDistribution`
- `Wallet`
- `LedgerEntry`
- `AuditLog`
- `GameSession`
- worker BullMQ

Risk level :
Tres eleve. Risques financiers, juridiques, litiges, mauvais calcul, double credit, distribution prematuree.

Required research depth :
Elevee. Recherche legale, business et technique necessaire avant specification.

---

## 2.13 Dashboard admin live, audit et support operations

Feature name : Dashboard admin live, audit et support operations

Purpose :
Permettre aux admins de surveiller les sessions, paiements, joueurs, resultats, incidents et actions sensibles.

Target users :
- admins ;
- support ;
- operations ;
- finance.

Business value :
Tres elevee. Indispensable pour exploiter un produit avec paiements, litiges et sessions live.

Technical complexity :
Elevee. Beaucoup d'etats, vues, filtres, actions sensibles et audit.

Dependencies :
- auth admin
- RBAC
- `AuditLog`
- paiements
- sessions
- registrations
- wallet/ledger
- logs game-server
- support tooling

Risk level :
Eleve. Mauvaises actions admin, absence de trace, abus de privileges, erreurs support.

Required research depth :
Moyenne a elevee. Recherche operationnelle necessaire : quels incidents doivent etre geres en V1, quelles actions sont autorisees, quelles actions sont interdites.

---

## 2.14 Notifications et diffusion communautaire WhatsApp

Feature name : Notifications et diffusion communautaire WhatsApp

Purpose :
Informer les joueurs et communautes : session ouverte, inscription confirmee, rappel avant demarrage, paiement confirme, resultats, moments forts.

Target users :
- joueurs ;
- communautes WhatsApp ;
- admins marketing ;
- support.

Business value :
Moyenne a elevee. Tres utile pour acquisition et retention, mais non critique au gameplay V1.

Technical complexity :
Moyenne. Peut rester simple au depart avec liens partageables et notifications internes/email/SMS, puis WhatsApp gateway plus tard.

Dependencies :
- `GameSession`
- registration/payment status
- jobs BullMQ
- notification templates
- WhatsApp gateway optionnel
- consentement communication

Risk level :
Moyen. Risques de spam, dependance a WhatsApp, messages envoyes au mauvais moment, confidentialite.

Required research depth :
Moyenne. Recherche necessaire sur API WhatsApp, couts, politique d'envoi, consentement et alternatives.

---

## 2.15 Securite, anti-triche, conformite et moderation

Feature name : Securite, anti-triche, conformite et moderation

Purpose :
Proteger la plateforme contre fraude, triche, abus, multi-compte, manipulation client, litiges, erreurs financieres et risques reglementaires.

Target users :
- tous les joueurs ;
- admins ;
- support ;
- finance ;
- equipe legal/compliance.

Business value :
Critique. La confiance est indispensable pour une competition payante.

Technical complexity :
Tres elevee. Cette branche traverse tous les services : auth, paiement, wallet, game-server, logs, moderation et data privacy.

Dependencies :
- auth/RBAC
- audit log
- anti-cheat policies
- server-side timers
- RNG loguee
- rate limiting
- device/IP signals
- moderation
- legal review
- privacy policy
- terms of service

Risk level :
Tres eleve. C'est le principal risque transversal du produit.

Required research depth :
Tres elevee. Recherche juridique, securite, anti-fraude, anti-triche, moderation et protection des donnees obligatoire.

Research notes :
La recherche externe sur les jeux d'adresse confirme que la distinction entre competition d'adresse et jeu d'argent depend du pays et de l'influence du hasard. La Phase 3 devra donc isoler les decisions legales et gameplay qui dependent de cette qualification.

---

## 3. Matrice synthetique

| # | Branche | Complexite technique | Risque | Recherche |
|---|---|---:|---:|---:|
| 1 | Acquisition, landing, catalogue public | Moyenne | Moyen | Moyenne |
| 2 | Authentification et compte | Moyenne-elevee | Eleve | Moyenne |
| 3 | Profil joueur et historique | Faible-moyenne | Moyen | Faible |
| 4 | Configuration sessions admin | Elevee | Eleve | Elevee |
| 5 | Inscription session | Moyenne-elevee | Eleve | Moyenne |
| 6 | Paiement Fapshi | Elevee | Tres eleve | Elevee |
| 7 | Wallet et ledger | Tres elevee | Tres eleve | Elevee |
| 8 | Lobby et check-in | Moyenne | Moyen-eleve | Moyenne |
| 9 | Session live temps reel | Tres elevee | Tres eleve | Elevee |
| 10 | Game engine | Tres elevee | Tres eleve | Elevee |
| 11 | Mini-jeux configurables | Tres elevee | Eleve | Elevee |
| 12 | Resultats et distribution | Tres elevee | Tres eleve | Elevee |
| 13 | Admin live, audit, support | Elevee | Eleve | Moyenne-elevee |
| 14 | Notifications / WhatsApp | Moyenne | Moyen | Moyenne |
| 15 | Securite, anti-triche, conformite | Tres elevee | Tres eleve | Tres elevee |

---

## 4. Branches candidates MVP

Pour une V1 realiste, les branches indispensables sont :

- Authentification et gestion de compte
- Creation/configuration minimale des sessions admin
- Inscription joueur a une session
- Paiement Fapshi et validation transactionnelle
- Wallet interne et ledger minimal
- Lobby et check-in
- GameSession live
- Game engine minimal
- Mini-jeux configurables MVP
- Resultats, gains et distribution wallet
- Dashboard admin minimal, audit et support
- Securite, anti-triche et conformite minimale

Branches importantes mais potentiellement reduites en V1 :

- Acquisition avancee / landing complete
- Profil joueur avance et statistiques
- WhatsApp gateway automatise
- Spectateur
- 2D immersive
- Retraits argent reel
- Marketplace organisateurs externes

---

## 5. Points d'attention pour la Phase 3

La Phase 3 devra classer les branches par profondeur de recherche :

- Low research required
- Medium research required
- High research required

Les branches deja identifiees comme high research sont :

- Paiement Fapshi et validation transactionnelle
- Wallet interne, ledger et credits
- Creation/configuration des sessions admin
- GameSession live et orchestration temps reel
- Game engine et resolution des rounds
- Catalogue de mini-jeux configurables
- Resultats, gains et distribution
- Securite, anti-triche, conformite et moderation

La Phase 3 devra produire un plan de recherche dedie pour chacune de ces branches high research avant toute redaction de specifications detaillees.

---

## 6. Statut Phase 2

Phase 2 terminee.

La cartographie fonctionnelle est suffisante pour passer a la Phase 3 : Research Planning.

La Phase 3 ne devra pas encore rediger les sections PRD detaillees. Elle devra uniquement identifier la profondeur de recherche par branche et creer un plan de recherche pour chaque branche high research.
