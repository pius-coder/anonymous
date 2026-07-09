# Consolidated Documentation

This file contains the consolidated content of all files located in `/home/afreeserv/anonymous/docs` (excluding this file).

---

## FILE: `docs/BRAINSTORMING.md`

Document récapitulatif complet — Plateforme de sessions de jeu multijoueur temps réel

Version : 0.2
Objectif : consolider toutes les décisions prises dans la discussion avant de passer aux analyses métier, financières, techniques et gameplay détaillées.

---

1. Nature réelle du projet

Le projet n’est pas une simple application web, ni un simple jeu WhatsApp.

La vision retenue est :

Plateforme web de sessions de jeu multijoueur temps réel
+ moteur de jeu social/stratégique
+ système d’inscription payante
+ wallet interne
+ administration
+ diffusion communautaire

L’objectif est de recréer une ambiance de tension, d’alliance, de trahison, de choix, de pression sociale et d’élimination progressive, dans une interface web dédiée.

Le jeu peut s’inspirer de mécaniques de type Squid Game, Among Us, épreuves solo, duels, alliances, votes, rôles cachés et survie collective, mais il ne doit pas être modélisé comme un pari.

Principe à conserver :

Compétition payante structurée
≠ pari
≠ mise aléatoire
≠ jeu d’argent non encadré

Toute logique d’argent réel, retrait, gain, redistribution ou compétition payante devra être validée juridiquement avant exploitation publique.

---

2. Correction majeure : tournoi, session, manche

Le vocabulaire doit être clarifié, car plusieurs sens ont été utilisés pendant la discussion.

2.1 Ancienne direction corrigée

L’idée précédente était :

Tournoi global
→ plusieurs événements
→ finale
→ redistribution finale

Cette direction est abandonnée, car elle coupe les gains de l’entreprise, bloque trop longtemps la monétisation, et impose une structure lourde.

2.2 Modèle corrigé

Le modèle retenu est :

Session payante autonome
→ inscription à cette session
→ paiement
→ jeu
→ un ou plusieurs gagnants
→ distribution des gains
→ commission organisation
→ fin de session

Chaque session est rentable indépendamment.

Côté public, on pourra appeler ça “tournoi” si c’est plus vendeur.

Côté technique, le bon nom est plutôt :

GameSession

Une session peut être créée n’importe quel jour, selon la disponibilité des joueurs et la stratégie commerciale.

---

3. Structure métier retenue

La plateforme repose sur ces objets principaux :

User
PlayerProfile
GameSession
SessionRegistration
Payment
Wallet
LedgerEntry
Round
MiniGame
RoundResult
Elimination
PrizeDistribution
GameResult
AuditLog

3.1 User

Compte global de l’utilisateur sur la plateforme.

Un utilisateur peut créer un compte gratuitement, consulter les sessions disponibles, puis décider ou non de payer pour participer.

3.2 PlayerProfile

Profil joueur rattaché au compte.

Il contient les informations utiles côté jeu :

pseudo
avatar éventuel
historique joueur
statistiques
wallet
sessions jouées
sessions gagnées

3.3 GameSession

Une session payante autonome.

Elle contient :

titre
description
date/heure
prix d’inscription
nombre minimum de joueurs
nombre maximum de joueurs
configuration des gains
commission organisation
visibilité
statut
configuration de rounds
room live liée

3.4 SessionRegistration

Inscription d’un joueur à une session précise.

Un joueur ne s’inscrit pas à un grand tournoi global. Il s’inscrit à une session payante précise.

3.5 Round

Une manche interne dans une session.

Une session contient plusieurs rounds. Les rounds utilisent des mini-jeux du catalogue.

3.6 MiniGame

Définition d’un mini-jeu configurable.

Les mini-jeux ne doivent pas être codés en dur dans Colyseus. Ils doivent être modélisés comme des définitions exploitables par le moteur de jeu.

3.7 Wallet

Solde interne du joueur.

Le joueur peut utiliser ses gains pour s’inscrire à une prochaine session. Ce n’est pas une remise en jeu automatique ; c’est un moyen de paiement interne.

3.8 LedgerEntry

Historique financier détaillé.

Chaque mouvement d’argent doit être tracé. Il ne faut jamais gérer uniquement un simple champ "balance".

---

4. Flux joueur retenu

Flux général :

1. Le joueur arrive sur le site
2. Il crée un compte gratuitement
3. Il choisit son propre mot de passe
4. Il consulte les sessions publiées
5. Il ouvre une session précise
6. Il s’inscrit à cette session
7. Il paie via Fapshi ou wallet interne
8. Le paiement est validé
9. Il accède au lobby pré-partie
10. Il fait son check-in
11. La session démarre
12. Il entre dans la room live
13. Il joue les rounds
14. Il est éliminé ou avance
15. La session se termine
16. Les résultats sont enregistrés
17. Les gains éventuels sont crédités dans le wallet
18. Le joueur peut utiliser son solde pour une prochaine session

---

5. Flux admin retenu

L’admin crée et gère les sessions.

Il doit pouvoir :

créer une session
définir le prix d’inscription
définir min/max joueurs
définir la visibilité
définir la configuration des gains
définir le nombre de gagnants
définir les rounds ou familles de rounds
publier la session
partager un lien spécifique
voir les inscrits
voir les paiements
voir les joueurs payés
voir les joueurs en attente
lancer la session
mettre pause si nécessaire
annuler une session
voir les résultats
voir la rentabilité
consulter les logs d’audit

L’admin ne doit pas modifier des résultats, gains, éliminations ou paiements sans trace d’audit.

---

6. Visibilité des sessions

Trois niveaux de visibilité sont retenus :

PUBLIC
UNLISTED
PRIVATE

PUBLIC

La session apparaît publiquement sur le site.

UNLISTED

La session n’apparaît pas dans la liste publique, mais toute personne ayant le lien peut s’inscrire.

C’est utile pour les groupes WhatsApp.

PRIVATE

La session est réservée à des joueurs invités ou approuvés.

---

7. Authentification

Décision : le joueur choisit lui-même son mot de passe.

On abandonne l’idée d’envoyer un mot de passe généré automatiquement.

Modèle retenu :

email ou téléphone
mot de passe choisi par l’utilisateur
hash sécurisé
session serveur
cookie sécurisé
RBAC
audit

Hono ne doit pas être considéré comme un framework d’auth complet. Hono sert au routing HTTP, aux middlewares et à l’API.

L’auth sera implémentée dans notre propre couche, en suivant des principes de sécurité reconnus.

Décision retenue :

Hono = transport HTTP
Prisma = stockage users/sessions/tokens
packages/auth = logique auth commune
sessions serveur = approche principale

Pour les admins :

email + mot de passe
2FA possible plus tard
permissions strictes
audit renforcé

Pour les joueurs :

email/téléphone + mot de passe
OTP possible plus tard
WhatsApp non obligatoire pour l’auth V1

---

8. WhatsApp

WhatsApp n’est pas le lieu où se déroule le jeu.

Décision retenue :

WhatsApp = acquisition, communication, notifications, diffusion communautaire
Web app = espace réel de jeu

WhatsApp peut devenir un service séparé :

apps/whatsapp-gateway/

Rôle potentiel :

partage automatique des sessions ouvertes
rappel avant démarrage
message après inscription
message après paiement
diffusion de moments forts
classements publics
résumé live
marketing communautaire

Mais aucune règle critique ne doit dépendre de WhatsApp.

Si WhatsApp tombe, la plateforme doit continuer à fonctionner.

---

9. Modèle économique

Chaque session doit être rentable seule.

Formule de base :

Collecte brute = nombre de joueurs payants × prix d’inscription

Frais paiement = collecte brute × taux provider

Collecte nette = collecte brute - frais paiement

Prize pool = collecte nette × pourcentage réservé aux gagnants

Commission organisation = collecte nette - prize pool

Exemple validé dans la discussion :

20 joueurs
1 000 FCFA par joueur
1 seul gagnant
frais paiement estimés à 3 %

Collecte brute :
20 × 1 000 = 20 000 FCFA

Frais paiement :
20 000 × 3 % = 600 FCFA

Collecte nette :
20 000 - 600 = 19 400 FCFA

Répartition :
60 % gagnant = 11 640 FCFA
40 % organisation = 7 760 FCFA

L’admin devra pouvoir configurer :

prix d’inscription
nombre minimum de joueurs
nombre maximum de joueurs
nombre de gagnants
pourcentage gagnants
pourcentage organisation
règle de distribution

L’interface admin doit afficher automatiquement :

collecte brute estimée
frais paiement estimés
collecte nette estimée
gain du ou des gagnants
commission organisation
seuil de rentabilité
revenu minimum si seulement le minimum de joueurs est atteint
revenu maximum si la session est pleine

---

10. Wallet et ledger

Le wallet est nécessaire parce qu’un joueur peut utiliser ses gains pour rejoindre une prochaine session.

Principe :

Le joueur gagne
→ gain crédité dans wallet
→ le joueur peut payer une autre session avec ce solde

Ce n’est pas un pari. C’est une utilisation du solde interne.

Le ledger doit tracer tous les mouvements :

ENTRY_FEE_PAID
ENTRY_FEE_FROM_WALLET
PAYMENT_CONFIRMED
PRIZE_CREDITED
PLATFORM_COMMISSION
REFUND
WITHDRAWAL_REQUESTED
WITHDRAWAL_PAID
WITHDRAWAL_CANCELLED
ADMIN_ADJUSTMENT

Règle stricte :

Aucun mouvement financier sans LedgerEntry.
Aucune modification de solde sans transaction.
Aucune distribution de gain sans audit.

Les retraits en argent réel sont un point ouvert. Pour la première version, il est plus prudent de considérer le wallet comme crédit interne, sauf validation juridique et opérationnelle.

---

11. Paiement

Provider retenu :

Fapshi

Flux paiement :

1. Le joueur s’inscrit à une session
2. L’inscription passe à PAYMENT_PENDING
3. L’API Hono crée une transaction Fapshi
4. Le joueur paie
5. Fapshi appelle le webhook
6. L’API vérifie le paiement
7. La transaction est enregistrée
8. L’inscription passe à PAID
9. Le joueur peut accéder au lobby/check-in

Règle critique :

Colyseus ne décide jamais qu’un joueur a payé.

Le paiement est validé uniquement par l’API et PostgreSQL.

---

12. Stack technique validée

Stack validée :

Next.js
Hono
Colyseus
PostgreSQL
Prisma
Redis
BullMQ
Fapshi
Docker

Répartition :

Next.js
→ interface joueur
→ interface admin
→ pages publiques
→ lobby
→ écran de session
→ résultats

Hono
→ API plateforme
→ auth
→ joueurs
→ sessions
→ inscriptions
→ paiements
→ wallet
→ admin
→ audit

Colyseus
→ serveur de jeu temps réel
→ rooms
→ rounds live
→ timers
→ état joueur
→ interactions
→ éliminations
→ résultats live

PostgreSQL
→ source de vérité durable

Prisma
→ ORM
→ transactions critiques
→ migrations
→ accès DB partagé

Redis
→ BullMQ
→ présence
→ coordination
→ cache court
→ scaling futur

BullMQ
→ jobs
→ timers persistants
→ clôture automatique
→ paiement/reconciliation
→ notifications

Fapshi
→ paiement externe

---

13. Architecture retenue

On ne part pas sur un monolithe unique.

On ne part pas non plus sur 15 microservices.

Architecture retenue :

Architecture orientée services
avec séparation forte par responsabilité technique

Structure :

apps/
├── web/
├── api/
├── game-server/
├── worker/
└── whatsapp-gateway/      # optionnel plus tard

packages/
├── db/
├── auth/
├── game-engine/
├── contracts/
├── config/
├── logger/
├── errors/
└── ui/

---

14. Rôle des services

apps/web

Frontend Next.js.

Contient :

pages publiques
inscription
connexion
liste des sessions
page session
paiement
lobby pré-partie
interface joueur
dashboard admin
résultats

apps/api

API Hono.

Contient :

auth
users
players
sessions
registrations
payments
wallet
ledger
admin
audit
notifications

apps/game-server

Serveur Colyseus.

Contient :

rooms live
état temps réel
rounds
mini-jeux live
timers
présence joueurs
communications contrôlées
duels
alliances
votes
éliminations
résultats live

apps/worker

Worker BullMQ.

Contient :

clôture automatique de round
expiration inscription/paiement
réconciliation Fapshi
distribution des gains
crédit wallet
notifications différées
nettoyage
jobs techniques

apps/whatsapp-gateway

Service optionnel.

Contient :

messages WhatsApp
annonces
rappels
résumés live
marketing communautaire

Non obligatoire en V1.

---

15. Prisma et base de données

Décision retenue :

Prisma est choisi à la place de Drizzle et TypeORM.

Raisons :

meilleure ergonomie transactions
plus rassurant pour V1 directe
bon typage TypeScript
plus simple à partager entre Hono, Colyseus et Worker
moins risqué que Drizzle dans ton contexte
plus cohérent que TypeORM avec Hono + Colyseus

Organisation :

packages/db/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── src/
│   ├── client.ts
│   ├── repositories/
│   ├── transactions/
│   └── raw/

Transactions critiques :

confirm-payment.tx.ts
register-player.tx.ts
pay-registration-from-wallet.tx.ts
check-in-player.tx.ts
start-session.tx.ts
close-round.tx.ts
eliminate-player.tx.ts
finish-session.tx.ts
credit-prizes.tx.ts
request-withdrawal.tx.ts
refund-registration.tx.ts

Règle :

Les mutations critiques ne doivent pas être dispersées dans Hono ou Colyseus.
Elles doivent passer par packages/db/src/transactions.

---

16. États métier principaux

GameSessionStatus

DRAFT
PUBLISHED
REGISTRATION_OPEN
REGISTRATION_CLOSED
WAITING_START
LIVE
PAUSED
FINISHED
CANCELLED

SessionRegistrationStatus

CREATED
PAYMENT_PENDING
PAID
CHECKED_IN
IN_ROOM
ACTIVE
ELIMINATED
WINNER
DISQUALIFIED
REFUNDED
CANCELLED

PaymentStatus

CREATED
PENDING
SUCCESS
FAILED
EXPIRED
CANCELLED
REFUNDED

WalletTransactionType

DEPOSIT
ENTRY_FEE
PRIZE
COMMISSION
REFUND
WITHDRAWAL
ADMIN_ADJUSTMENT

RoundStatus

PENDING
BRIEFING
ACTIVE
LOCKED
RESOLVING
FINISHED
CANCELLED

---

17. Moteur de jeu

Décision majeure :

La logique du jeu doit être isolée dans packages/game-engine.

Colyseus ne doit pas contenir toute la logique métier.

Colyseus orchestre le live.

Le game-engine décide :

qui peut jouer
qui est qualifié
qui est éliminé
comment résoudre un round
comment appliquer winnersCount
comment calculer les résultats
comment passer au round suivant

Structure recommandée :

packages/game-engine/
├── core/
├── phases/
├── rules/
├── commands/
├── transitions/
├── resolvers/
└── tests/

---

18. Catalogue de mini-jeux

Le fichier fourni contient un catalogue de 120 mini-jeux répartis en 6 familles :

Solo
Duel 1v1
Alliance forcée
Équipe libre
Survie collective
Rôle caché

Décision :

Le catalogue sert de base gameplay.
On ne recopie pas les 120 jeux comme 120 systèmes isolés.
On modélise des familles de mini-jeux configurables.

Chaque mini-jeu devra devenir une définition technique du type :

MiniGameDefinition
- id
- family
- name
- playerMode
- configSchema
- initialStateFactory
- allowedActions
- resolver
- antiCheatPolicy

Le mini-jeu produit :

classement
score
qualifiés
éliminés
statut joueur
événements de résolution

La session applique ensuite :

winnersCount
nombre d’éliminés
passage au round suivant
distribution des résultats

---

19. Temps réel

Colyseus est retenu pour le temps réel.

Rôle :

rooms
state sync
présence
actions live
timers
résolution live
diffusion ciblée

Principe :

Le client affiche.
Le serveur décide.

Le client ne doit jamais être source de vérité pour :

timer
score
réponse correcte
paiement
élimination
gain
classement

---

20. Timers

Tous les timers doivent être côté serveur.

Modèle retenu :

Colyseus = timer live ressenti par les joueurs
PostgreSQL = deadline officielle
BullMQ = filet de sécurité

Exemple :

Round démarre
→ deadline enregistrée en DB
→ Colyseus diffuse le chrono live
→ BullMQ programme la clôture
→ si le game-server crash, le worker peut reprendre/clôturer

---

21. Réactivité type Convex

Convex a été envisagé, puis abandonné à cause du verrouillage architectural.

Décision :

Pas de Convex.
Pas de réactivité DB automatique façon Convex.

À la place :

Action métier
→ validation serveur
→ transaction DB
→ event métier
→ diffusion temps réel si nécessaire
→ invalidation client si nécessaire

La réactivité live vient de Colyseus, pas de PostgreSQL.

---

22. Outbox / event-driven

Point recommandé mais pas encore totalement verrouillé :

event-driven + outbox

Pourquoi :

paiements
éliminations
résultats
gains
litiges
audit

Une table "outbox_events" ou "game_events" permettrait de garder une trace fiable des événements critiques.

Décision actuelle :

À recommander fortement pour la V1.
À détailler dans l’analyse technique.

---

23. 2D / vue du haut

Point corrigé :

La 2D n’est pas verrouillée.

Il ne faut pas affirmer que le projet part sur Phaser, Pokémon-like, map libre ou déplacement 2D tant que la vision exacte n’est pas expliquée.

État actuel :

2D = idée ouverte
à analyser séparément
ne doit pas polluer le modèle économique
ne doit pas être imposée comme direction technique

Questions à analyser plus tard :

La 2D sert-elle à l’immersion seulement ?
Les joueurs se déplacent-ils vraiment ?
Les zones déclenchent-elles des actions ?
La carte influence-t-elle les règles ?
Les alliances passent-elles par proximité ?
Les duels se déclenchent-ils dans des zones ?
La 2D est-elle obligatoire dès V1 ?

---

24. Anti-triche

Principes retenus :

timers serveur
résolution serveur
RNG serveur
scores serveur
validation serveur
audit
latence mesurée si nécessaire
aucune réponse sensible envoyée trop tôt
aucune vérité critique côté client

Les mini-jeux doivent être conçus pour limiter :

inspection DOM
manipulation du temps local
auto-click
double soumission
latence abusive
multi-compte
partage d’information interdit

---

25. Admin et audit

Toute action sensible doit produire un audit.

Actions sensibles :

création session
modification prix
annulation session
validation paiement manuelle
remboursement
exclusion joueur
disqualification
modification résultat
distribution gain
ajustement wallet

AuditLog doit stocker :

actorId
action
targetType
targetId
before
after
reason
ip
userAgent
createdAt

---

26. Infra et déploiement

Direction retenue :

Docker
Docker Compose au départ
services séparés
PostgreSQL
Redis
reverse proxy

Structure infra :

infra/
├── docker/
├── nginx/
├── postgres/
└── redis/

Services Docker probables :

web
api
game-server
worker
postgres
redis
reverse-proxy

WhatsApp gateway pourra être ajouté plus tard.

---

27. Organisation monorepo

Décision :

Monorepo

Structure globale :

squid-platform/
├── apps/
│   ├── web/
│   ├── api/
│   ├── game-server/
│   ├── worker/
│   └── whatsapp-gateway/
│
├── packages/
│   ├── db/
│   ├── auth/
│   ├── game-engine/
│   ├── contracts/
│   ├── config/
│   ├── logger/
│   ├── errors/
│   └── ui/
│
├── infra/
├── docs/
├── scripts/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── .env.example

---

28. Décisions abandonnées ou corrigées

Convex

Abandonné pour éviter le verrouillage architectural.

Wasp

Intéressant pour aller vite, mais non retenu car le projet ressemble plus à une plateforme + moteur de jeu multijoueur qu’à une app full-stack classique.

NestJS

Non retenu comme backend principal pour l’instant.

Raison : Hono suffit pour l’API plateforme, car Colyseus porte la complexité temps réel.

TypeORM

Non retenu.

Raison : TypeORM aurait plus de sens avec NestJS. Dans la stack Hono + Colyseus, Prisma est plus cohérent.

Drizzle

Techniquement intéressant, mais non retenu car tu as déjà rencontré des frictions avec les transactions.

Tournoi avec finale

Abandonné.

Raison : réduit la rentabilité et ajoute une structure trop lourde.

Mot de passe généré par la plateforme

Abandonné.

Le joueur choisit son mot de passe.

2D verrouillée

Non verrouillée.

La 2D reste un sujet ouvert.

---

29. Décisions actuellement verrouillées

Stack :
Next.js + Hono + Colyseus + PostgreSQL + Prisma + Redis + BullMQ + Fapshi

Architecture :
monorepo orienté services

Modèle produit :
sessions payantes autonomes

Inscription :
compte gratuit + inscription payante par session

Auth :
mot de passe choisi par le joueur

Paiement :
Fapshi

Wallet :
nécessaire pour réutiliser les gains

Ledger :
obligatoire pour tracer les mouvements financiers

Game server :
Colyseus

Game engine :
package séparé

Mini-jeux :
catalogue existant utilisé comme base, sans recopier la liste

WhatsApp :
service séparé optionnel

2D :
non verrouillée

Tournoi avec finale :
abandonné

Microservices extrêmes :
abandonnés

---

30. Points ouverts pour analyse métier

nom final du produit
vocabulaire public : tournoi, session, partie, manche
prix conseillé par session
commission standard
nombre de gagnants par défaut
règle 1 gagnant vs 3 gagnants
règle si minimum joueurs non atteint
règle de remboursement
règle de retrait wallet
règle d’abandon joueur
règle joueur absent
règle déconnexion pendant round
règle anti-multi-compte
règle de litige
cadre légal
conditions générales
modération
support client

---

31. Points ouverts pour analyse technique

schema.prisma complet
modèle ledger exact
modèle PrizeConfig
modèle SessionConfig
modèle RoundConfig
modèle MiniGameDefinition
modèle GameEngine
design des rooms Colyseus
gestion reconnexion
stratégie outbox
stratégie worker
stratégie Redis
stratégie logs
stratégie Docker
stratégie backups PostgreSQL
stratégie monitoring
stratégie sécurité

---

32. Points ouverts pour analyse gameplay

composition d’une session
nombre de rounds par session
comment choisir les mini-jeux
ordre des familles de rounds
rythme d’élimination
règles de communication
alliances
duels
votes
rôles cachés
spectateurs
pression sociale
interface admin live
présentation des résultats
expérience des éliminés

---

33. Résolution finale actuelle

La résolution actuelle du projet est :

Construire une plateforme web de sessions de jeu multijoueur temps réel.

Les joueurs créent un compte gratuitement.

Ils s’inscrivent et paient uniquement pour les sessions auxquelles ils veulent participer.

Chaque session est indépendante et doit être rentable.

Les gains peuvent être crédités dans un wallet interne.

Le joueur peut utiliser son wallet pour payer une prochaine session.

La plateforme utilise Fapshi pour les paiements.

Le jeu se joue dans une interface web dédiée, pas dans WhatsApp.

WhatsApp reste un canal d’acquisition, d’annonce et de diffusion.

La stack retenue est :
Next.js + Hono + Colyseus + PostgreSQL + Prisma + Redis + BullMQ + Fapshi.

Le moteur de jeu est isolé dans packages/game-engine.

Colyseus gère uniquement le live temps réel.

PostgreSQL/Prisma gère la vérité durable.

Redis/BullMQ gère les jobs, timers persistants et coordination.

La 2D reste ouverte et ne doit pas être imposée tant que la vision n’est pas clarifiée.

Le catalogue de mini-jeux fourni sert de base gameplay, mais ne sera pas recopié tel quel dans l’architecture.


---

## FILE: `docs/cahier_des_charges_technique_plateforme_sessions_jeu.md`

# Cahier des charges technique — Plateforme de sessions de jeu multijoueur temps réel

Version : 1.0 — Date : 7 juillet 2026

Périmètre de sécurité produit : V1 limitée à une compétition de compétence/stratégie avec crédits internes non retirables. Tout retrait argent réel, redistribution cash, hasard dominant ou mécanique assimilable à un pari reste bloqué tant qu’une validation juridique écrite n’est pas obtenue.

## Résumé exécutif

Le produit est une plateforme web de sessions payantes autonomes : découverte, compte, inscription, paiement, lobby, room live, rounds, résolution serveur, résultats, crédits internes et administration. WhatsApp sert à l’acquisition et aux rappels, pas au gameplay. Le serveur reste source de vérité pour timers, scores, actions, paiements, éliminations et crédits.

## Principes non négociables

- Session autonome : chaque GameSession est indépendante.

- Client non fiable : le client affiche, le serveur décide.

- Aucun solde sans LedgerEntry.

- Webhook/paiement idempotent.

- Résultats persistés et rejouables.

- Audit obligatoire pour action sensible.

- V1 sans retrait argent réel et sans jeu de hasard déterminant.



## Architecture cible

- apps/web : Next.js pour landing, catalogue, lobby, dashboard et interfaces joueur/admin.

- apps/api : Hono pour API REST, webhooks, middlewares sécurité, RBAC et validation.

- apps/game-server : Colyseus pour rooms temps réel, présence live et état synchronisé.

- apps/worker : BullMQ pour deadlines, rappels, reconciliation, finalisation et retries.

- packages/auth : sessions serveur, cookies, mots de passe, rôles.

- packages/game-engine : resolvers purs et testables.

- packages/payments : Fapshi adapter et idempotence.

- packages/wallet-ledger : mutations financières atomiques.

- PostgreSQL + Prisma : données durables, transactions et audit.

- Redis : jobs, présence courte et coordination.



## Features

### Feature 01 — Acquisition, landing et catalogue public des sessions

Objectif : Présenter le produit, afficher les sessions accessibles et convertir vers inscription sans vocabulaire de pari.

Acteurs : Visiteurs, joueurs existants, communautés venant de liens partagés, admins marketing.

Règles métier :

- Les sessions `PUBLIC` doivent etre listables.

- Les sessions `UNLISTED` ne doivent pas apparaitre dans le catalogue mais doivent etre accessibles par lien.

- Les sessions `PRIVATE` doivent exiger invitation, approbation ou controle d'acces.

- La page detail doit afficher prix, date, places restantes, statut, regles essentielles et avertissements.

- La promesse marketing doit parler de competition structuree, adresse, strategie et experience sociale, pas de pari.

- Les CTA doivent router vers connexion/creation de compte ou inscription si l'utilisateur est deja connecte.



Données principales :

- GameSession.visibility

- GameSession.status

- SessionCapacitySnapshot

- ShareLink

- PublicSessionCard



API / contrats :

- GET /public/sessions

- GET /public/sessions/:slug

- GET /share/:token

- POST /sessions/:id/intent



Événements / jobs :

- session.published

- session.unlisted-link-created

- catalogue.capacity-updated



Critères d’acceptation :

- PUBLIC listable, UNLISTED accessible par lien, PRIVATE inaccessible sans autorisation.

- CTA redirige selon état auth.

- Aucun texte ne promet un gain garanti ou une mise.



### Feature 02 — Authentification et gestion de compte

Objectif : Créer et protéger les comptes, sessions serveur, rôles et accès aux opérations sensibles.

Acteurs : Joueurs, admins, support, finance.

Règles métier :

- Le joueur choisit son mot de passe.

- L'identifiant peut etre email ou telephone selon decision produit finale.

- Les admins utilisent email + mot de passe, avec 2FA possible plus tard.

- Les sessions doivent etre serveur-side avec cookies securises.

- Les roles doivent distinguer joueur, admin, support, finance et super admin.

- Tout changement critique de compte doit produire un audit.



Données principales :

- User

- PlayerProfile

- AuthSession

- PasswordResetToken

- RoleAssignment

- AuditLog



API / contrats :

- POST /auth/register

- POST /auth/login

- POST /auth/logout

- POST /auth/password/request-reset

- POST /auth/password/reset

- GET /me



Événements / jobs :

- auth.user-created

- auth.login-succeeded

- auth.login-failed

- auth.session-revoked

- account.critical-change



Critères d’acceptation :

- Cookie HttpOnly/Secure/SameSite.

- Regeneration de session après login et changement de privilège.

- Accès admin impossible sans rôle exact.



### Feature 03 — Profil joueur et historique

Objectif : Donner au joueur une identité, un historique de sessions, ses statistiques et une vue de ses inscriptions.

Acteurs : Joueurs, admins support, éventuellement autres joueurs si profil public activé.

Règles métier :

- Un profil joueur est rattaché à un User unique.

- Les statistiques sont dérivées des résultats officiels, jamais saisies manuellement.

- Le profil public ne doit pas exposer données financières, téléphone, email ou détails sensibles.

- L’historique distingue sessions futures, en cours, terminées, annulées et no-show.

- Les badges/achievements ne doivent pas être utilisés comme preuve financière.



Données principales :

- PlayerProfile

- AvatarAsset

- PlayerStatsSnapshot

- SessionRegistration

- GameResult

- RoundResult



API / contrats :

- GET /players/me

- PATCH /players/me

- GET /players/me/history

- GET /players/:publicId



Événements / jobs :

- profile.updated

- stats.recomputed

- avatar.changed



Critères d’acceptation :

- Stats recalculées depuis résultats persistés.

- Profil public masque infos privées.

- Un joueur ne voit pas les wallets/résultats privés d’un autre.



### Feature 04 — Création et configuration des sessions admin

Objectif : Créer une GameSession autonome, rentable, contrôlée et publiable.

Acteurs : Admins, organisateurs internes.

Règles métier :

- Une session commence en `DRAFT`, puis peut etre publiee et ouverte aux inscriptions.

- L'admin configure prix, capacite min/max, visibilite, nombre de gagnants et repartition.

- Le systeme calcule collecte brute, frais estimes, collecte nette, prize pool et commission.

- Toute modification sensible doit etre auditee.

- Une session publiee ne doit pas pouvoir etre modifiee librement si des joueurs ont deja paye.



Données principales :

- GameSession

- SessionConfig

- PrizeConfig

- RoundConfig

- MiniGameDefinition

- AuditLog



API / contrats :

- POST /admin/sessions

- PATCH /admin/sessions/:id

- POST /admin/sessions/:id/publish

- POST /admin/sessions/:id/cancel

- GET /admin/sessions/:id/simulation



Événements / jobs :

- session.draft-created

- session.config-updated

- session.published

- session.cancelled



Critères d’acceptation :

- Publication refusée si prix/capacité/règles incohérents.

- Modification sensible bloquée si inscriptions payées.

- Simulation financière affichée avant publication.



### Feature 05 — Inscription joueur à une session

Objectif : Réserver une place dans une session, choisir le moyen de paiement et suivre le statut d’inscription.

Acteurs : Joueurs connectés, support.

Règles métier :

- Un joueur s’inscrit à une session précise, pas à un tournoi global.

- Une inscription ne devient active qu’après paiement confirmé ou paiement wallet validé.

- La capacité maximale doit être protégée contre les doubles réservations concurrentes.

- Une session fermée, annulée, complète ou non publiée ne peut plus recevoir d’inscription.

- Un joueur ne peut pas détenir deux inscriptions actives dans la même session.

- La politique no-show/remboursement doit être visible avant paiement.



Données principales :

- SessionRegistration

- RegistrationStatus

- PaymentIntent

- CapacityReservation

- AuditLog



API / contrats :

- POST /sessions/:id/register

- GET /sessions/:id/registration

- POST /registrations/:id/cancel

- POST /registrations/:id/pay-with-wallet



Événements / jobs :

- registration.created

- registration.awaiting-payment

- registration.paid

- registration.cancelled

- registration.expired



Critères d’acceptation :

- Deux requêtes simultanées ne dépassent pas maxPlayers.

- Inscription impossible sur session non ouverte.

- Réinscription même session impossible tant qu’une inscription active existe.



### Feature 06 — Paiement Fapshi et validation transactionnelle

Objectif : Transformer l’intention d’inscription en paiement confirmé, vérifié et auditable.

Acteurs : Joueurs, support, finance.

Règles métier :

- L'API cree une transaction Fapshi, pas Colyseus.

- Fapshi retourne `link` et `transId` pour paiement hosted checkout.

- Le webhook Fapshi est la source principale de changement de statut.

- Le webhook doit etre verifie avec `x-wh-secret`.

- Le traitement webhook doit etre idempotent.

- Une reconciliation worker existe pour les webhooks manques, en respectant le rate limit de polling.



Données principales :

- PaymentTransaction

- FapshiTransaction

- WebhookEvent

- SessionRegistration

- AuditLog



API / contrats :

- POST /payments/fapshi/initiate

- POST /webhooks/fapshi

- GET /payments/:id/status

- POST /admin/payments/:id/reconcile



Événements / jobs :

- payment.initiated

- payment.webhook-received

- payment.successful

- payment.failed

- payment.expired

- payment.reconciled



Critères d’acceptation :

- Webhook sans x-wh-secret valide rejeté.

- Webhook répété ne double pas le paiement.

- Polling respecte les limites provider.

- Paiement confirmé marque inscription PAID dans la même transaction logique.



### Feature 07 — Wallet interne, ledger et crédits

Objectif : Gérer crédits internes non retirables en V1, historique financier et paiements wallet.

Acteurs : Joueurs, support, finance.

Règles métier :

- Aucun solde ne change sans `LedgerEntry`.

- Le champ balance ne suffit jamais comme source d'historique.

- Les mouvements financiers doivent etre transactionnels.

- Le wallet V1 est un credit interne utilisable pour payer d'autres sessions.

- Les retraits argent reel sont exclus ou bloques tant qu'ils ne sont pas legalement valides.

- Les ajustements admin doivent avoir reason, before, after et audit.



Données principales :

- Wallet

- LedgerEntry

- WalletHold

- WalletTransaction

- AdminAdjustment

- AuditLog



API / contrats :

- GET /wallet/me

- GET /wallet/me/ledger

- POST /registrations/:id/pay-with-wallet

- POST /admin/wallets/:userId/adjust



Événements / jobs :

- wallet.credited

- wallet.debited

- wallet.hold-created

- wallet.hold-released

- wallet.adjusted



Critères d’acceptation :

- Aucune mutation balance sans LedgerEntry.

- Solde jamais négatif.

- Débit wallet et inscription payée atomiques.

- Retrait argent réel désactivé en V1.



### Feature 08 — Lobby, check-in et préparation de session

Objectif : Préparer le démarrage, vérifier la présence et basculer vers la room live.

Acteurs : Joueurs payés, admins live.

Règles métier :

- Seuls les joueurs `PAID` peuvent acceder au lobby.

- Le check-in transforme l'inscription en `CHECKED_IN`.

- Le lancement exige un minimum de joueurs check-in ou payes selon regle finale.

- Les joueurs absents doivent etre exclus, remplaces, rembourses ou marques no-show selon politique.

- Le lobby doit afficher les regles critiques avant l'entree live.



Données principales :

- LobbyPresence

- CheckIn

- SessionRegistration

- GameSession

- StartPolicy



API / contrats :

- GET /sessions/:id/lobby

- POST /sessions/:id/check-in

- POST /admin/sessions/:id/start

- GET /sessions/:id/join-token



Événements / jobs :

- lobby.joined

- player.checked-in

- checkin.deadline-reached

- session.start-authorized



Critères d’acceptation :

- Seuls PAID accèdent au lobby.

- CHECKED_IN requis selon politique.

- No-show traité selon règle configurée.

- Join token live court et non réutilisable.



### Feature 09 — GameSession live et orchestration temps réel

Objectif : Piloter la session live : phases, timers, rooms, reconnexion, pause et reprise.

Acteurs : Joueurs actifs, éliminés, admins live.

Règles métier :

- Colyseus gere le live mais ne decide pas des paiements.

- Le client affiche, le serveur decide.

- La deadline officielle d'un round doit exister en DB.

- Colyseus diffuse le timer ressenti; BullMQ sert de filet de securite.

- La reconnexion doit restaurer l'etat joueur si possible.

- La pause admin doit etre auditee.



Données principales :

- LiveRoomState

- RoundInstance

- RoundDeadline

- PlayerConnection

- AdminPauseEvent



API / contrats :

- WS /game/:sessionId

- POST /admin/live/:sessionId/pause

- POST /admin/live/:sessionId/resume

- GET /live/:sessionId/state



Événements / jobs :

- live.room-created

- round.started

- round.deadline-set

- player.disconnected

- player.reconnected

- session.paused



Critères d’acceptation :

- Timer officiel stocké côté serveur/DB.

- Reconnexion restaure état sans rejouer action déjà soumise.

- Pause admin auditée.

- Crash game-server récupérable via jobs/DB.



### Feature 10 — Game engine et résolution des rounds

Objectif : Isoler les règles de jeu dans un moteur déterministe, testable et auditable.

Acteurs : Développeurs, game-server, admins indirectement.

Règles métier :

- Colyseus orchestre le live; le game-engine resout les regles.

- Un mini-jeu produit score/classement/statuts, la session applique qualification/elimination.

- Les resolvers doivent etre deterministes et auditables.

- Les resultats doivent etre persistables et rejouables pour litige.

- Les tests du game-engine sont prioritaires car ils impactent gains et eliminations.



Données principales :

- GameEngineResolver

- RoundResult

- Elimination

- Qualification

- ResolutionLog



API / contrats :

- internal: resolveRound(input)

- internal: computeRanking(result)

- internal: applyWinnersCount(ranking, config)

- internal: finalizeRound(roundId)



Événements / jobs :

- round.resolution-requested

- round.resolved

- player.eliminated

- player.qualified



Critères d’acceptation :

- Resolvers pure functions testés par fixtures.

- Même input = même output.

- Résultat persisté et rejouable pour litige.

- Colyseus ne contient pas la logique financière.



### Feature 11 — Catalogue de mini-jeux configurables

Objectif : Transformer le catalogue en définitions paramétrables par familles, sans coder 120 systèmes isolés.

Acteurs : Joueurs, admins, développeurs gameplay.

Règles métier :

- Chaque mini-jeu doit declarer family, playerMode, configSchema, allowedActions, resolver et antiCheatPolicy.

- Tous les timers sont serveur-side.

- Les reponses sensibles ne doivent pas etre envoyees au client avant resolution.

- La RNG doit etre serveur-side et loguee si elle influence le resultat.

- Le MVP doit prioriser quelques jeux a faible hasard, facile a expliquer et a verifier.



Données principales :

- MiniGameDefinition

- MiniGameFamily

- ConfigSchema

- AllowedAction

- AntiCheatPolicy

- RngSeedLog



API / contrats :

- GET /admin/minigames

- POST /admin/minigames/:id/enable

- GET /minigames/:id/schema

- internal: validateMiniGameAction(action)



Événements / jobs :

- minigame.enabled

- minigame.config-validated

- minigame.action-accepted

- minigame.action-rejected



Critères d’acceptation :

- Chaque jeu expose schema/config/actions/resolver.

- Réponses sensibles jamais envoyées avant résolution.

- RNG serveur loguée si elle influence résultat.

- MVP limite les jeux à faible hasard.



### Feature 12 — Résultats, crédits et distribution interne

Objectif : Clôturer une session et créditer les récompenses internes de manière idempotente.

Acteurs : Joueurs, gagnants, admins, support/finance.

Règles métier :

- Les resultats sont calcules par le game-engine puis persistes.

- Les gains ne sont credites qu'apres finalisation officielle.

- Le credit wallet et le ledger sont atomiques.

- La commission organisation doit etre tracee.

- La distribution doit etre idempotente.

- Toute correction post-session doit passer par audit/support.



Données principales :

- GameResult

- PrizeDistribution

- LedgerEntry

- Wallet

- CommissionRecord

- DisputeWindow



API / contrats :

- POST /admin/sessions/:id/finalize

- GET /sessions/:id/results

- GET /admin/sessions/:id/results

- POST /admin/sessions/:id/correction-request



Événements / jobs :

- session.finished

- results.computed

- credits.distribution-started

- credits.distributed

- results.published



Critères d’acceptation :

- Distribution répétée ne double pas les crédits.

- Résultats officiels figés après finalisation.

- Correction nécessite rôle + raison + audit.

- Aucun cash-out V1.



### Feature 13 — Dashboard admin live, audit et support opérations

Objectif : Exploiter la plateforme sans casser l’intégrité financière ni gameplay.

Acteurs : Admins, support, opérations, finance.

Règles métier :

- Les actions sensibles exigent role, raison et audit.

- Les admins peuvent voir sessions, inscrits, paiements, statuts, resultats et rentabilite.

- Les operations manuelles doivent etre limitees et tracees.

- Les resultats/gains ne doivent pas etre modifies sans workflow de correction.

- Les vues support doivent exposer assez d'information pour aider sans fuite de secrets.



Données principales :

- AdminView

- AuditLog

- SupportCase

- PaymentTransaction

- WalletLedgerView

- IncidentLog



API / contrats :

- GET /admin/dashboard

- GET /admin/audit-logs

- GET /admin/support/users/:id

- POST /admin/incidents

- POST /admin/actions/:id/approve



Événements / jobs :

- admin.action-requested

- admin.action-approved

- support.case-created

- audit.log-written



Critères d’acceptation :

- Toute action sensible a actor/action/target/before/after/reason.

- Support ne voit pas secrets provider.

- Finance voit paiements/ledger mais pas contrôle gameplay.



### Feature 14 — Notifications et diffusion communautaire WhatsApp

Objectif : Informer, rappeler et diffuser sans rendre WhatsApp critique pour le jeu.

Acteurs : Joueurs, communautés, admins marketing, support.

Règles métier :

- La V1 peut commencer par liens partageables manuels.

- Les notifications critiques doivent aussi exister dans la web app.

- WhatsApp gateway est optionnel et separable.

- Les messages sortants doivent respecter opt-in, templates et limites.

- Les rappels peuvent etre programmes via worker.



Données principales :

- NotificationPreference

- MessageTemplate

- NotificationJob

- DeliveryLog

- ConsentRecord



API / contrats :

- POST /admin/notifications/session/:id/share

- POST /webhooks/whatsapp

- GET /me/notification-preferences

- PATCH /me/notification-preferences



Événements / jobs :

- notification.queued

- notification.sent

- notification.failed

- whatsapp.webhook-received



Critères d’acceptation :

- Rappels critiques aussi visibles dans web app.

- Opt-in requis pour messages sortants hors transactionnel.

- Échec WhatsApp ne bloque pas paiement/lobby/live.



### Feature 15 — Sécurité, anti-triche, conformité et modération

Objectif : Protéger équité, argent, données, règles et confiance.

Acteurs : Tous les utilisateurs, admins, support, finance, juridique.

Règles métier :

- Le client ne doit jamais etre source de verite critique.

- Timers, RNG, scores, paiements, eliminations et gains sont serveur-side.

- Les actions sensibles doivent etre auditees.

- Les cookies/session doivent suivre les recommandations OWASP.

- Les endpoints doivent etre limites, valides et proteges.

- Les mini-jeux doivent detecter double soumission, auto-click, latence abusive, multi-compte et collusion.

- La qualification legale competition payante/gains/wallet doit etre validee avant lancement public.



Données principales :

- RiskSignal

- AntiCheatEvent

- ModerationAction

- RateLimitBucket

- ComplianceGate

- AuditLog



API / contrats :

- GET /security/session/:id/risk

- POST /admin/moderation/actions

- POST /internal/anticheat/signal

- GET /admin/compliance/gates



Événements / jobs :

- security.risk-detected

- anticheat.signal-raised

- moderation.action-applied

- compliance.gate-blocked



Critères d’acceptation :

- Double soumission détectée.

- Auto-click/rate anomalies signalés.

- BOLA testé sur tous endpoints ID.

- Conformité bloque retraits et hasard dominant tant que non validé.



## Modèle de données minimal

- User: Compte global, identifiants, rôle principal, état, timestamps.

- PlayerProfile: Pseudo, avatar, statistiques dérivées, préférences publiques.

- GameSession: Session autonome : prix, capacité, visibilité, statut, planning, config.

- SessionRegistration: Lien joueur-session, statut inscription/paiement/check-in/no-show.

- PaymentTransaction: Transaction provider, externalId, transId, statut, montant, source.

- Wallet: Solde matérialisé uniquement comme cache contrôlé par ledger.

- LedgerEntry: Mouvement financier : type, amount, before/after, reason, reference.

- RoundInstance: Round exécuté, mini-jeu, deadline, configuration, statut.

- RoundResult: Score/classement/statut par joueur et preuves de résolution.

- GameResult: Résultat final session et gagnants officiels.

- PrizeDistribution: Crédits internes distribués et idempotency key.

- AuditLog: Acteur, action, cible, before/after, raison, IP, user-agent, requestId.

## Sources documentaires

- Next.js App Router / Authentication / Metadata: Pages publiques, App Router, authentification, metadata et partage social.

- Hono middleware: secure headers, CSRF, body limit, cookies: API HTTP, webhooks et protection bas niveau.

- Colyseus rooms, state synchronization, reconnection: Live multiplayer, rooms, état synchronisé, reconnexion.

- Fapshi API: initiate-pay, payment-status, webhook: Paiement par lien, transId, statut, expiration, webhook x-wh-secret.

- Prisma transactions: Transactions applicatives et mutations atomiques.

- PostgreSQL transaction isolation: Isolation transactionnelle sur capacité, wallet, finalisation.

- BullMQ jobs/retries: Jobs retardés, retries, reconciliation, deadlines.

- Redis docs: Présence courte, coordination, cache et pub/sub avec prudence.

- Docker Compose docs: Services web/api/game-server/worker/postgres/redis séparés.

- Meta WhatsApp Business Platform: Messages, webhooks, opt-in et templates.

- OWASP Session, Password, Authorization, Business Logic, Logging, API Security: Sécurité session, mots de passe, accès, abus logique métier, logs et BOLA.

Documents internes utilisés : BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md et fichiers feature 01/02/04/06/07/08/09/10/11/12/13/14/15.


---

## FILE: `docs/catalogue-mini-jeux.md`

# Catalogue de mini-jeux — 120 jeux de production

Ce document couvre les 6 familles de rounds définies pour la session de jeu : **Solo**, **Duel 1v1**, **Alliance forcée (binôme)**, **Équipe libre**, **Survie collective**, **Rôle caché**. Chaque famille contient 20 jeux entièrement pensés : concept, déroulement, paramètres de configuration, condition de résolution/victoire, et note technique d'implémentation (état de room, timers, anti-triche).

Convention commune à tous les jeux :
- Tous les timers sont **calculés côté serveur** (le client ne fait qu'afficher), pour éviter la triche par manipulation du temps local.
- `winnersCount` (nombre de gagnants par round) est un paramètre externe au jeu lui-même — chaque fiche indique juste comment le jeu produit un **classement** ou un **statut qualifié/éliminé**, que la couche session applique ensuite selon `winnersCount`.
- "Room" fait référence à une room Colyseus dédiée à l'instance du mini-jeu.

---

## 1. Rounds Solo (test QI / réflexe)

Chaque joueur affronte uniquement le chrono et sa propre performance. Pas d'interaction sociale, classement par score et/ou temps.

### 1.1 Séquence mémoire
**Concept** : Simon-like — une suite de couleurs/formes s'affiche, le joueur la reproduit dans l'ordre.
**Déroulement** : Le serveur génère une séquence aléatoire (longueur initiale 3). Elle est diffusée en lecture seule (délai fixe par élément, ex: 600ms). Le joueur reproduit via clics. Si correct, une manche supplémentaire s'ajoute (+1 élément) ; sinon élimination immédiate.
**Paramètres** : longueur initiale, incrément par manche, vitesse d'affichage, nombre max de manches.
**Résolution** : classement par nombre de manches réussies ; en cas d'égalité, temps de réaction moyen sur les bonnes réponses.
**Note technique** : séquence générée et stockée server-side (seed non transmise) ; seule la validation manche par manche est envoyée au client pour empêcher la lecture du code source.

### 1.2 Calcul rapide
**Concept** : série de calculs simples affichés un par un.
**Déroulement** : Room envoie une opération (ex: `47 + 18`), le joueur saisit la réponse avant expiration du délai (ex: 5s). Bonne réponse = point + question suivante immédiate ; mauvaise ou timeout = pas de point mais round continue jusqu'à la fin du temps global.
**Paramètres** : durée totale du round, plage de difficulté des opérations, délai par question.
**Résolution** : classement par nombre de bonnes réponses ; tie-break par temps de réponse cumulé.
**Note technique** : questions générées server-side à la volée, jamais préchargées côté client en liste complète (évite l'inspection du DOM/state pour anticiper).

### 1.3 L'intrus
**Concept** : grille d'images quasi identiques, une seule différente à repérer.
**Déroulement** : génération d'une grille (ex: 6x6) avec un motif de base répété et une case modifiée (couleur/rotation/détail). Le joueur clique la case intruse. Bonne réponse = grille suivante plus difficile (différence plus subtile) ; erreur = pénalité de temps (ex: +2s ajoutées au chrono).
**Paramètres** : taille de grille, nombre de niveaux, subtilité de la différence par niveau, pénalité d'erreur.
**Résolution** : classement par niveau atteint dans le temps imparti, puis temps total si égalité.
**Note technique** : grilles précalculées côté serveur sous forme de coordonnées + attribut modifié, rendues côté client en CSS/canvas.

### 1.4 Réaction pure
**Concept** : cliquer dès qu'un signal apparaît, sans anticiper.
**Déroulement** : après un délai aléatoire (2-6s), un signal visuel/sonore apparaît. Le joueur clique. Clic avant le signal = faute (élimination ou pénalité selon config). Le temps de réaction est mesuré au ms près.
**Paramètres** : nombre de manches, plage du délai aléatoire, pénalité de faux départ (élimination stricte ou +500ms de pénalité).
**Résolution** : classement par temps de réaction moyen sur les manches valides.
**Note technique** : le déclenchement du signal est timestampé côté serveur ; le clic client envoie son propre timestamp, la latence réseau moyenne du joueur est soustraite (mesurée en amont via ping) pour équité.

### 1.5 Tri rapide
**Concept** : trier des objets qui apparaissent dans la bonne catégorie avant qu'ils n'atteignent le bas de l'écran.
**Déroulement** : des objets tombent un par un (ex: fruits vs légumes), le joueur doit les glisser/cliquer vers la bonne zone avant qu'ils sortent de l'écran. Vitesse de chute augmente progressivement.
**Paramètres** : vitesse initiale, accélération, nombre de catégories, durée totale.
**Résolution** : classement par score net (bons tris − erreurs − objets manqués).
**Note technique** : logique de spawn et de scoring gérée côté serveur à intervalle fixe, le client ne fait que rendre et transmettre l'action.

### 1.6 Mémoire de grille
**Concept** : mémoriser un motif affiché sur une grille puis le reproduire après disparition.
**Déroulement** : une grille (ex: 4x4) affiche N cases allumées pendant 2s, puis s'éteint. Le joueur doit recliquer exactement les mêmes cases. Bonne reproduction = complexité +1 case à la manche suivante.
**Paramètres** : taille de grille, temps d'affichage, incrément de complexité, nombre max de manches.
**Résolution** : classement par nombre de manches réussies, tie-break par précision moyenne (cases correctes/total).
**Note technique** : pattern généré et vérifié server-side, aucune info sur le pattern n'est renvoyée avant validation complète du joueur (anti triche par relecture du state).

### 1.7 Rotation mentale
**Concept** : reconnaître si une forme pivotée est identique ou en miroir d'une forme de référence.
**Déroulement** : une forme de référence est affichée, puis une variante pivotée apparaît (0-360°). Le joueur répond "identique" ou "miroir" le plus vite possible. Série de N essais.
**Paramètres** : nombre d'essais, complexité des formes, temps limite par essai.
**Résolution** : classement par score (bonnes réponses) puis temps moyen.
**Note technique** : formes générées procéduralement (polygones aléatoires) pour éviter la mémorisation par répétition d'un joueur à l'autre.

### 1.8 Compte à rebours inversé
**Concept** : arrêter un chronomètre visuel le plus près possible d'une cible sans la dépasser.
**Déroulement** : une barre de progression avance vers une cible cachée (ex: 7.00s). Le joueur clique "stop". S'il dépasse la cible, échec immédiat de la manche ; sinon score = proximité à la cible.
**Paramètres** : plage de la cible, nombre de manches, vitesse de la barre.
**Résolution** : classement par score cumulé de proximité sur toutes les manches valides.
**Note technique** : la cible n'est jamais transmise au client avant le clic ; seul l'écart est renvoyé après coup.

### 1.9 Labyrinthe éclair
**Concept** : traverser un labyrinthe généré aléatoirement le plus vite possible.
**Déroulement** : labyrinthe affiché en entier (pas de brouillard de guerre), le joueur navigue au clavier/tactile jusqu'à la sortie. Chrono déclenché au premier mouvement.
**Paramètres** : taille du labyrinthe, complexité (nombre d'embranchements), limite de temps.
**Résolution** : classement par temps de complétion ; DNF (non complété) classé après tous les finishers.
**Note technique** : génération procédurale par algorithme de type "recursive backtracking", seed unique par joueur pour éviter le partage de solution en direct.

### 1.10 Précision de tir
**Concept** : cliquer des cibles qui apparaissent brièvement à des positions aléatoires.
**Déroulement** : des cibles apparaissent une par une (ou en vagues) pendant un temps très court (ex: 800ms) puis disparaissent. Clic sur cible = point, clic manqué = rien, cible ratée = rien.
**Paramètres** : nombre de cibles, temps d'apparition, taille des cibles, densité des vagues.
**Résolution** : classement par nombre de cibles touchées, tie-break par précision (touches/clics totaux).
**Note technique** : positions et timing générés server-side par vague, validation du clic avec tolérance de hitbox et prise en compte de la latence réseau.

### 1.11 Mots mêlés chronométrés
**Concept** : retrouver des mots cachés dans une grille de lettres avant la fin du temps.
**Déroulement** : grille de lettres affichée avec une liste de mots à trouver. Le joueur sélectionne les lettres en glissant. Mot trouvé = retiré de la liste + point.
**Paramètres** : taille de grille, nombre de mots, durée totale, difficulté du vocabulaire.
**Résolution** : classement par nombre de mots trouvés, tie-break par temps du dernier mot trouvé.
**Note technique** : grille et positions des mots générées server-side, validation de sélection par comparaison de coordonnées plutôt que du texte affiché (anti-inspection DOM).

### 1.12 Puzzle glissant
**Concept** : reconstituer une image en faisant glisser des tuiles sur une grille avec une case vide (taquin).
**Déroulement** : puzzle mélangé de façon garantie résolvable, le joueur déplace les tuiles jusqu'à reconstitution complète.
**Paramètres** : taille de grille (3x3, 4x4...), niveau de mélange, limite de temps.
**Résolution** : classement par temps de résolution ; DNF classé par nombre de tuiles correctement placées à la fin du temps.
**Note technique** : algorithme de mélange garantissant la solvabilité (permutation paire), état de grille validé server-side à chaque coup.

### 1.13 Suite logique
**Concept** : deviner l'élément suivant d'une suite (numérique, visuelle ou symbolique).
**Déroulement** : une suite est affichée avec un élément manquant (ex: 2, 4, 8, 16, ?). Le joueur choisit parmi 4 propositions. Série de N suites, difficulté croissante.
**Paramètres** : nombre de suites, types autorisés (arithmétique, géométrique, visuelle), temps par suite.
**Résolution** : classement par bonnes réponses, tie-break par temps moyen.
**Note technique** : banque de suites catégorisées en base, sélection aléatoire sans répétition par session pour éviter l'effet d'apprentissage entre rounds.

### 1.14 Répétition audio
**Concept** : reproduire un rythme ou une mélodie courte après l'avoir entendue.
**Déroulement** : un motif sonore (ex: 4-6 notes/beats) est joué une fois, le joueur reproduit en cliquant sur des pads dans le bon ordre et avec un timing approximatif.
**Paramètres** : longueur du motif, tolérance de timing, nombre de manches.
**Résolution** : classement par précision cumulée (ordre + timing), tie-break par nombre de manches réussies.
**Note technique** : lecture audio synchronisée via Web Audio API, validation du timing par comparaison des timestamps client corrigés de la latence.

### 1.15 Comptage rapide
**Concept** : estimer/compter un nombre d'objets affichés très brièvement.
**Déroulement** : un nuage d'objets (points, formes) apparaît pendant un temps très court (ex: 500ms) puis disparaît. Le joueur saisit le nombre exact ou une estimation selon le mode.
**Paramètres** : temps d'affichage, plage du nombre d'objets, mode (exact ou tolérance ±X).
**Résolution** : classement par proximité cumulée à la vraie valeur sur toutes les manches.
**Note technique** : le nombre réel n'est jamais exposé côté client avant la réponse (généré et vérifié server-side).

### 1.16 Anagramme éclair
**Concept** : reconstituer un mot à partir de lettres mélangées.
**Déroulement** : lettres d'un mot affichées dans le désordre, le joueur les réarrange (glisser ou saisie) pour former le mot correct avant expiration du temps.
**Paramètres** : longueur des mots, nombre de mots par round, temps par mot.
**Résolution** : classement par mots résolus, tie-break par temps cumulé.
**Note technique** : dictionnaire de mots validés en base avec niveau de difficulté ; vérification server-side de la réponse (pas de validation client qui exposerait le mot).

### 1.17 Suivi de curseur
**Concept** : suivre une cible mobile avec le curseur/doigt le plus précisément possible.
**Déroulement** : une cible se déplace selon une trajectoire (aléatoire ou sinusoïdale) pendant X secondes. Le score est basé sur la distance moyenne entre le curseur du joueur et la cible.
**Paramètres** : durée, vitesse et complexité de la trajectoire.
**Résolution** : classement par distance moyenne cumulée (plus petite = meilleur).
**Note technique** : position de la cible calculée server-side à chaque tick et diffusée ; position du curseur envoyée par le client à intervalle régulier (ex: 10 fois/sec) pour calcul de distance.

### 1.18 Estimation visuelle
**Concept** : estimer une quantité, une distance ou une proportion sans pouvoir compter précisément.
**Déroulement** : affichage d'une image (ex: un récipient rempli à X%, une distance entre deux points) pendant un temps limité. Le joueur donne une estimation chiffrée. Score basé sur l'écart à la valeur réelle.
**Paramètres** : type d'estimation, nombre de manches, temps d'affichage.
**Résolution** : classement par écart cumulé à la réalité (plus petit = meilleur).
**Note technique** : valeurs réelles générées aléatoirement server-side et jamais exposées avant la réponse du joueur.

### 1.19 Stabilité de main
**Concept** : garder le curseur à l'intérieur d'une zone qui se déplace et/ou rétrécit, sans en sortir.
**Déroulement** : une zone tolérante affichée à l'écran se déplace lentement ; le joueur doit y maintenir son curseur. Chaque sortie de zone déclenche une pénalité ou un chrono de "hors zone" cumulé.
**Paramètres** : taille de la zone, vitesse/complexité du déplacement, durée totale, seuil de tolérance en temps hors-zone.
**Résolution** : classement par temps cumulé passé dans la zone (plus grand = meilleur).
**Note technique** : position de la zone calculée server-side, position du curseur reçue à intervalle régulier, calcul d'intersection fait côté serveur pour éviter la triche par modification du rendu client.

### 1.20 Mémoire de symboles
**Concept** : mémoriser un ensemble de symboles affichés puis identifier celui qui n'y était pas.
**Déroulement** : une série de symboles (ex: 8) est affichée pendant un temps court, puis une nouvelle grille de symboles (dont un intrus non présent initialement) apparaît. Le joueur doit cliquer l'intrus.
**Paramètres** : nombre de symboles, temps de mémorisation, nombre de manches, similarité visuelle des intrus.
**Résolution** : classement par bonnes réponses cumulées, tie-break par temps de réponse moyen.
**Note technique** : liste des symboles affichés stockée server-side par manche pour validation, jamais réexposée au client avant réponse.

---

## 2. Rounds Duel 1v1

Deux joueurs s'affrontent directement, un seul passe. Room à 2 joueurs, résolution binaire (gagnant/perdant), parfois avec égalité gérée par rejouabilité (« sudden death »).

### 2.1 Chifoumi à mise
**Concept** : pierre-papier-ciseaux enrichi d'un système de jetons de mise.
**Déroulement** : chaque joueur reçoit 3 jetons (attaque/défense/feinte). À chaque manche, les deux posent un choix en simultané (caché jusqu'à résolution). Attaque bat feinte, feinte bat défense, défense bat attaque. Premier à 2 victoires de manche gagne le duel.
**Paramètres** : nombre de jetons, nombre de victoires nécessaires, temps de décision par manche.
**Résolution** : premier à atteindre le nombre de victoires requis remporte le duel ; égalité de manche = manche neutre, rejouée.
**Note technique** : les deux choix sont stockés côté serveur et ne sont révélés qu'une fois les deux reçus (pattern "commit-reveal" simplifié), évite qu'un joueur voie le choix de l'autre avant de jouer.

### 2.2 Course au signal
**Concept** : cliquer le plus vite possible après un signal aléatoire, sans anticiper.
**Déroulement** : les deux joueurs attendent un signal déclenché après un délai aléatoire (2-6s). Premier à cliquer après le signal gagne. Clic avant le signal = faux départ = défaite immédiate.
**Paramètres** : plage du délai aléatoire, nombre de manches (best of N), gestion du faux départ.
**Résolution** : gagnant du duel = premier à remporter la majorité des manches.
**Note technique** : signal timestampé server-side, correction de latence individuelle par joueur (mesurée via ping moyen) avant comparaison des temps de réaction.

### 2.3 Bras de fer digital
**Concept** : faire avancer une jauge vers son camp par clics/appuis répétés.
**Déroulement** : une jauge centrale se déplace selon la fréquence de clic de chaque joueur (moyenne mobile sur une fenêtre courte). Le premier à pousser la jauge dans la zone de l'adversaire gagne.
**Paramètres** : sensibilité de la jauge, durée max du duel (limite anti-blocage), zones de victoire.
**Résolution** : victoire dès que la jauge atteint la zone adverse ; si limite de temps atteinte, victoire au joueur ayant la position la plus avancée.
**Note technique** : calcul de la jauge fait exclusivement côté serveur à partir des inputs bruts (timestamps de clics), pour empêcher un client de simuler une fréquence de clic supérieure à la réalité.

### 2.4 Duel de tir
**Concept** : toucher un maximum de cibles communes avant l'adversaire.
**Déroulement** : les deux joueurs voient les mêmes cibles apparaître simultanément à des positions différentes (miroir ou identiques selon mode). Chaque touche = point. Premier à un score cible gagne, ou meilleur score au temps écoulé.
**Paramètres** : nombre de cibles, vitesse d'apparition, score cible ou durée fixe.
**Résolution** : le joueur avec le plus de touches valides remporte le duel.
**Note technique** : génération des cibles server-side identique pour les deux joueurs (même seed) pour garantir l'équité des conditions.

### 2.5 Le bluff des cartes
**Concept** : deviner si l'adversaire annonce une vraie ou une fausse valeur de carte.
**Déroulement** : chaque joueur tire une carte (valeur cachée à l'autre) et annonce une valeur (vraie ou fausse à son choix). L'adversaire doit deviner "vrai" ou "bluff". Bonne devinette = point pour le devineur ; bluff réussi = point pour le bluffeur.
**Paramètres** : nombre de manches, valeurs possibles des cartes, temps de décision.
**Résolution** : le joueur avec le plus de points après N manches gagne.
**Note technique** : la carte réelle est stockée côté serveur et n'est révélée qu'après la décision de l'adversaire, empêchant toute vérification anticipée côté client.

### 2.6 Match de rythme
**Concept** : reproduire un motif rythmique plus vite et plus précisément que l'adversaire.
**Déroulement** : un motif (suite de touches/temps) est affiché aux deux joueurs simultanément. Chacun le reproduit dès qu'il est prêt. Le score combine précision du timing et rapidité d'exécution.
**Paramètres** : longueur du motif, tolérance de timing, nombre de motifs (best of N).
**Résolution** : le joueur avec le meilleur score cumulé (précision + rapidité) gagne le duel.
**Note technique** : motif généré server-side et diffusé identique aux deux joueurs ; validation du timing par comparaison des timestamps corrigés de la latence individuelle.

### 2.7 Poussée de jauge
**Concept** : variante du bras de fer où chaque clic a un poids aléatoire (risque/récompense).
**Déroulement** : chaque clic pousse la jauge d'une valeur variable (ex: 1 à 3), affichée seulement après le clic. Les deux jouent en simultané jusqu'à ce que la jauge atteigne un camp.
**Paramètres** : plage de valeur par clic, vitesse de décroissance naturelle de la jauge (optionnelle), durée max.
**Résolution** : victoire dès que la jauge atteint la zone adverse.
**Note technique** : valeur de chaque clic tirée aléatoirement server-side au moment du clic (non prévisible côté client) pour éviter toute prédiction.

### 2.8 Le voleur de points
**Concept** : un pot de points partagé, chaque joueur peut piocher ou laisser grossir.
**Déroulement** : un pot commun visible grossit automatiquement. À tour de rôle (ou en simultané avec fenêtre courte), chaque joueur peut "voler" une partie du pot. Le duel se termine après N tours ou un montant cible atteint.
**Paramètres** : vitesse de croissance du pot, nombre de tours, part maximale volable par tour.
**Résolution** : le joueur avec le plus de points volés au total remporte le duel.
**Note technique** : état du pot et des vols géré comme état de room synchronisé, résolu au tick serveur pour éviter les conflits de vol simultané.

### 2.9 Duel de mémoire
**Concept** : jeu de paires (memory) en tête-à-tête, à tour de rôle.
**Déroulement** : une grille de cartes retournées est affichée aux deux joueurs. À tour de rôle, chacun retourne 2 cartes ; paire trouvée = point + rejoue, sinon tour passe à l'adversaire.
**Paramètres** : taille de la grille, temps de décision par tour.
**Résolution** : le joueur avec le plus de paires à la fin de la grille gagne.
**Note technique** : disposition des cartes générée et stockée server-side, cartes révélées un par un uniquement au tour du joueur concerné.

### 2.10 Roulette de risque
**Concept** : chaque joueur choisit un niveau de risque avec probabilité de succès inversement proportionnelle au gain.
**Déroulement** : à chaque manche, le joueur choisit entre plusieurs paliers (ex: 90% de chance de gagner 1pt, 50% pour 3pts, 20% pour 10pts). Le serveur tire au sort selon la probabilité choisie.
**Paramètres** : nombre de paliers et probabilités associées, nombre de manches.
**Résolution** : le joueur avec le plus de points cumulés après N manches gagne le duel.
**Note technique** : tirage aléatoire effectué server-side avec RNG vérifiable (seed loguée) pour garantir l'absence de manipulation.

### 2.11 Le duel du menteur
**Concept** : chaque joueur annonce un nombre, et son adversaire doit deviner si l'annonce dépasse un seuil réel caché.
**Déroulement** : chaque joueur reçoit un nombre réel caché. Il annonce un nombre à l'adversaire (peut mentir). L'adversaire choisit "plus haut" ou "plus bas" pour tenter de deviner la relation entre les deux nombres réels.
**Paramètres** : plage des nombres, nombre de manches, temps de décision.
**Résolution** : point à qui devine correctement la relation ; le meilleur score sur N manches gagne.
**Note technique** : les nombres réels sont stockés et comparés côté serveur, jamais transmis en clair avant résolution de la manche.

### 2.12 Tir à la corde de précision
**Concept** : variante du bras de fer où la précision du timing de clic compte plus que la fréquence.
**Déroulement** : un signal métronomique est diffusé ; chaque clic dans la fenêtre de précision autour du signal pousse fortement la jauge, un clic hors fenêtre la pousse faiblement voire la fait reculer.
**Paramètres** : tempo du métronome, largeur de la fenêtre de précision, force de poussée/pénalité.
**Résolution** : victoire dès que la jauge atteint la zone adverse.
**Note technique** : fenêtre de précision calculée par rapport à l'horloge serveur, comparaison des timestamps de clic corrigés de latence.

### 2.13 Dernier chiffre
**Concept** : jeu de type Nim — les joueurs retirent alternativement des jetons d'un tas commun, celui qui prend le dernier perd (ou gagne, selon variante).
**Déroulement** : un tas de jetons (ex: 21) est affiché. À tour de rôle, chaque joueur retire 1, 2 ou 3 jetons. Le joueur forcé de retirer le dernier jeton perd (variante "misère").
**Paramètres** : taille du tas de départ, nombre max de jetons retirables par tour, variante (misère ou normale).
**Résolution** : le joueur qui respecte la condition de fin (prendre ou éviter le dernier jeton) gagne.
**Note technique** : état du tas synchronisé en room, tour strictement alterné avec validation server-side du nombre retiré.

### 2.14 Le mimeur
**Concept** : reproduire un motif Simon-like en duel direct, celui qui échoue en premier perd.
**Déroulement** : un motif s'allonge à chaque manche (comme Séquence mémoire en solo), mais ici les deux joueurs voient et reproduisent le même motif en parallèle. Le premier à se tromper perd le duel.
**Paramètres** : longueur initiale, incrément par manche, vitesse d'affichage.
**Résolution** : le dernier joueur encore correct après l'erreur de l'autre gagne.
**Note technique** : motif identique généré server-side (même seed) et diffusé simultanément aux deux joueurs pour garantir l'équité.

### 2.15 Duel d'enchères
**Concept** : enchère silencieuse sur un lot de points avec un budget limité.
**Déroulement** : chaque joueur reçoit un budget de points fictifs. Sur plusieurs lots successifs, chacun mise en secret une partie de son budget. Le plus gros miseur remporte le lot, les points misés (par les deux) sont déduits du budget quel que soit le résultat.
**Paramètres** : budget de départ, nombre de lots, valeur de chaque lot.
**Résolution** : le joueur avec le plus de valeur de lots remportés à la fin gagne le duel.
**Note technique** : mises stockées côté serveur et révélées uniquement après réception des deux enchères (commit-reveal).

### 2.16 Pierre-papier-ciseaux évolutif
**Concept** : RPS étendu à 5 choix (pierre, papier, ciseaux, lézard, spock) pour réduire les parties nulles.
**Déroulement** : les deux joueurs choisissent en simultané parmi 5 options avec une matrice de victoire étendue. Best of N manches.
**Paramètres** : nombre de manches à gagner, temps de décision.
**Résolution** : premier à atteindre le nombre de victoires requis gagne.
**Note technique** : matrice de résolution codée en dur côté serveur, choix révélés uniquement après réception des deux (commit-reveal).

### 2.17 Le duel des zones
**Concept** : contrôler des zones qui apparaissent sur un plateau partagé en s'y positionnant/cliquant en premier.
**Déroulement** : des zones apparaissent aléatoirement sur un plateau commun ; chaque joueur clique pour revendiquer une zone. Chaque zone revendiquée rapporte un point. Le duel dure un temps fixe.
**Paramètres** : fréquence d'apparition des zones, durée totale, taille des zones.
**Résolution** : le joueur avec le plus de zones revendiquées à la fin du temps gagne.
**Note technique** : apparition des zones générée server-side avec timestamp, résolution du "premier clic" tranchée par ordre d'arrivée des messages serveur (pas par affichage client).

### 2.18 Quiz éclair face à face
**Concept** : buzzer de quiz — le premier à buzzer a le droit de répondre.
**Déroulement** : une question à choix multiple s'affiche aux deux joueurs. Le premier à appuyer sur le buzzer obtient le droit de répondre sous X secondes. Bonne réponse = point ; mauvaise réponse ou timeout = le droit passe à l'autre joueur.
**Paramètres** : nombre de questions, temps de réponse après buzz, banque de questions.
**Résolution** : le joueur avec le plus de bonnes réponses après N questions gagne.
**Note technique** : ordre de buzz déterminé par timestamp serveur de réception du message, pas par l'affichage local du bouton.

### 2.19 Le compte juste
**Concept** : se rapprocher d'un nombre cible sans le dépasser, à partir de tirages aléatoires successifs (façon blackjack simplifié).
**Déroulement** : chaque joueur tire des valeurs aléatoires une à une et décide de s'arrêter ou de continuer. Dépasser la cible élimine le joueur de la manche. Le plus proche de la cible sans dépasser gagne la manche.
**Paramètres** : valeur cible, plage des tirages, nombre de manches.
**Résolution** : le joueur avec le plus de manches gagnées remporte le duel.
**Note technique** : tirages générés server-side à la demande (pas de liste prégénérée visible), RNG loguée pour audit.

### 2.20 Duel de patience
**Concept** : concours d'immobilité/de non-action — le premier qui agit (bouge, clique, relâche) perd.
**Déroulement** : les deux joueurs doivent maintenir un état (ex: garder un bouton enfoncé, ou au contraire ne rien cliquer) le plus longtemps possible face à des distracteurs affichés à l'écran. Premier à céder perd.
**Paramètres** : nature des distracteurs, durée max avant match nul, fréquence des distracteurs.
**Résolution** : le dernier joueur à ne pas avoir cédé gagne ; si les deux tiennent jusqu'à la durée max, égalité tranchée par un round supplémentaire.
**Note technique** : état "maintenu" vérifié par ping continu du client au serveur ; une coupure de connexion ou un relâchement est détecté et timestampé côté serveur.

---

## 3. Rounds Alliance forcée (binôme)

Le jeu impose un binôme (tirage aléatoire), les deux doivent collaborer pour réussir l'épreuve, mais une seule place de "gagnant" existe à l'arrivée — ce qui force un dilemme coopération/trahison sans logique de négociation complexe à coder.

### 3.1 Le coffre à deux clés
**Concept** : chacun a une moitié de code à communiquer pour ouvrir un coffre commun, mais un seul peut valider.
**Déroulement** : chat limité à 30s s'ouvre, A et B ont chacun une moitié du code. Une fois le chat fermé (ou le code reconstitué), un bouton "Ouvrir" unique apparaît pour les deux ; premier à saisir le bon code gagne.
**Paramètres** : durée du chat, complexité du code, temps de saisie après fermeture du chat.
**Résolution** : premier à valider le bon code gagne ; si personne ne valide dans le temps imparti, les deux sont éliminés.
**Note technique** : les deux moitiés de code générées server-side et jamais combinées automatiquement ; validation de la saisie comparée au code complet stocké en room state.

### 3.2 Synchronisation
**Concept** : les deux doivent cliquer à un instant précis à quelques centaines de ms près, mais un seul empoche le point.
**Déroulement** : compte à rebours visible affiché aux deux (ex: cliquer à 5.00s). Chacun clique sans concertation possible (pas de chat). Si l'écart entre les deux clics est sous le seuil, l'épreuve réussit ; le point va au dernier des deux à avoir cliqué (ou tirage aléatoire selon config).
**Paramètres** : cible de temps, seuil de tolérance, règle d'attribution du point (dernier cliqueur ou aléatoire).
**Résolution** : si échec (écart trop grand), aucun des deux ne marque ; si réussite, un seul reçoit le point selon la règle configurée.
**Note technique** : timestamps des deux clics comparés côté serveur avec correction de latence individuelle pour une mesure d'écart fiable.

### 3.3 Pot commun
**Concept** : cagnotte partagée qui grossit dans le temps, un seul bouton "empocher" existe.
**Déroulement** : une cagnotte visible par les deux grossit automatiquement (+1pt/s). Pendant 20s, un bouton "Empocher" est disponible pour les deux ; le premier qui clique rafle tout, l'autre repart à zéro. Si personne ne clique, la cagnotte est perdue pour les deux.
**Paramètres** : durée de la fenêtre, vitesse de croissance de la cagnotte.
**Résolution** : premier clic valide sur "Empocher" remporte la cagnotte actuelle ; aucun clic avant expiration = zéro pour les deux.
**Note technique** : croissance de la cagnotte calculée server-side par tick, résolution du "premier clic" par ordre d'arrivée des messages serveur.

### 3.4 Le pont fragile
**Concept** : les deux doivent traverser un chemin de cases fragiles en se coordonnant, mais un seul obtient la récompense à l'arrivée.
**Déroulement** : un chemin de cases est affiché, certaines s'effondrent après un passage. Les deux joueurs doivent se coordonner (verbalement ou par timing) sur l'ordre de passage pour que l'un au moins atteigne l'autre bout. Une seule place de vainqueur à l'arrivée.
**Paramètres** : longueur du pont, probabilité d'effondrement par case, temps limite de traversée.
**Résolution** : premier joueur à atteindre l'autre bout sans tomber gagne ; si les deux tombent, élimination des deux.
**Note technique** : état de chaque case (intacte/effondrée) géré en room state partagé, mise à jour synchronisée après chaque passage.

### 3.5 Le partage inégal
**Concept** : jeu de l'ultimatum — un joueur propose une répartition d'un gain, l'autre accepte ou refuse.
**Déroulement** : un joueur (tiré au sort) propose une répartition d'un pot de points entre lui et son partenaire. L'autre accepte (répartition appliquée) ou refuse (les deux perdent tout pour cette manche).
**Paramètres** : taille du pot, nombre de manches, temps de décision.
**Résolution** : répartition appliquée si acceptée ; zéro pour les deux si refusée. Score cumulé sur les manches.
**Note technique** : rôle de proposant/répondant alterné à chaque manche, décision stockée et appliquée server-side.

### 3.6 Le fil tendu
**Concept** : maintenir une tension équilibrée à deux via des inputs opposés, sans faire rompre le fil.
**Déroulement** : une jauge de tension doit rester dans une plage cible ; chaque joueur pousse la jauge dans une direction opposée par appuis répétés. Si la jauge sort de la plage, le fil "rompt" et les deux échouent. Après un temps de maintien réussi, un seul peut valider pour capter la récompense (mais valider stoppe l'effort de l'autre).
**Paramètres** : plage cible, sensibilité des appuis, durée de maintien requise avant validation possible.
**Résolution** : le premier à valider après la durée de maintien requise remporte le point ; rupture du fil avant cela élimine les deux.
**Note technique** : calcul de jauge fait exclusivement côté serveur à partir des inputs bruts des deux joueurs.

### 3.7 Le mensonge partagé
**Concept** : les deux doivent s'accorder sur un nombre à annoncer, mais chacun est aussi récompensé individuellement s'il s'en écarte au bon moment.
**Déroulement** : les deux discutent brièvement (chat limité) pour choisir un nombre commun à soumettre. Au moment de la validation, chacun soumet en secret son propre nombre. S'ils sont identiques, les deux gagnent un petit gain garanti ; si l'un des deux s'écarte discrètement vers un nombre plus avantageux pour lui selon une règle cachée, il peut gagner plus, au risque que les deux perdent tout si l'écart est détecté comme "trop grand".
**Paramètres** : durée du chat, seuil de tolérance d'écart, barème de gains.
**Résolution** : nombres identiques = gain partagé garanti ; écart dans la tolérance = gain individuel supérieur pour celui qui s'écarte ; écart hors tolérance = zéro pour les deux.
**Note technique** : soumissions stockées séparément côté serveur et comparées uniquement après réception des deux (commit-reveal).

### 3.8 La clé unique
**Concept** : un seul des deux reçoit une clé d'accès, doit décider s'il la partage ou l'utilise seul.
**Déroulement** : la room tire au sort lequel des deux détient la "clé" (code d'accès à une porte commune). Le détenteur peut la garder secrète (passer seul) ou la communiquer à son partenaire via le chat limité (les deux peuvent alors tenter de passer, mais un seul créneau de passage existe).
**Paramètres** : durée du chat, temps de la fenêtre de passage.
**Résolution** : si la clé n'est pas partagée, le détenteur passe automatiquement ; si partagée, premier des deux à valider le passage l'emporte.
**Note technique** : attribution de la clé et son état (partagée ou non) suivis en room state, jamais visibles à l'autre joueur avant action explicite du détenteur.

### 3.9 Le compte à repartir
**Concept** : un chronomètre commun décompte un pot, chacun peut "voler" le pot à tout moment avant la fin.
**Déroulement** : un pot visible décompte lentement vers zéro (perte progressive) pendant que les deux joueurs peuvent, à tout moment, cliquer "Prendre" pour récupérer le pot restant à cet instant. Premier à cliquer l'emporte.
**Paramètres** : valeur de départ du pot, vitesse de décompte, durée max.
**Résolution** : premier clic valide sur "Prendre" remporte le montant restant à cet instant ; si personne ne clique avant que le pot atteigne zéro, aucun gain.
**Note technique** : valeur du pot recalculée à chaque tick serveur, le clic "Prendre" est horodaté et comparé server-side pour départager les clics quasi simultanés.

### 3.10 Le miroir
**Concept** : reproduire exactement le mouvement du partenaire pour ouvrir une porte commune, récompense inégale à la clé.
**Déroulement** : un des deux joueurs (le "meneur", tiré au sort) effectue une série de mouvements/clics ; l'autre (le "suiveur") doit les reproduire en léger différé. Une bonne synchronisation ouvre la porte, mais seul le suiveur qui valide en premier le passage final obtient le point plein (le meneur obtient un gain réduit fixe).
**Paramètres** : longueur de la séquence, tolérance de reproduction, gains respectifs meneur/suiveur.
**Résolution** : porte ouverte si la reproduction est suffisamment fidèle ; le suiveur reçoit le gain plein, le meneur un gain fixe réduit (incitation à bien guider malgré l'écart de récompense).
**Note technique** : séquence du meneur capturée et stockée server-side en temps réel, comparée à la séquence du suiveur avec tolérance de timing et de position.

### 3.11 La corde à deux
**Concept** : tirer ensemble une corde virtuelle pour déplacer un objet commun vers un but, un seul reçoit le trophée à l'arrivée.
**Déroulement** : les deux joueurs doivent alterner ou synchroniser des appuis pour faire avancer un objet vers une ligne d'arrivée. Une fois la ligne atteinte, un bouton "Récupérer le trophée" apparaît, valide pour un seul clic.
**Paramètres** : distance à parcourir, effort requis par appui, fenêtre de récupération du trophée.
**Résolution** : premier à cliquer "Récupérer" une fois la ligne atteinte gagne ; si aucun ne clique dans la fenêtre, le trophée est perdu pour les deux.
**Note technique** : position de l'objet calculée server-side à partir des inputs cumulés des deux joueurs.

### 3.12 Le puzzle inversé
**Concept** : chacun détient la moitié des pièces d'un puzzle, doivent combiner l'information mais un seul peut soumettre la solution.
**Déroulement** : chat limité pour que chacun décrive ses pièces à l'autre ; un seul des deux a accès au plateau de soumission final. S'il ne partage pas correctement les infos avec son partenaire (qui pourrait avoir une pièce clé), la soumission peut échouer.
**Paramètres** : nombre de pièces, durée du chat, complexité du puzzle.
**Résolution** : le détenteur du plateau de soumission gagne s'il résout correctement (avec ou sans l'aide de l'autre) ; échec de soumission élimine les deux.
**Note technique** : répartition des pièces et solution correcte stockées server-side, validation de la soumission côté serveur uniquement.

### 3.13 Le vote à deux
**Concept** : chacun vote secrètement pour désigner le gagnant du round entre les deux.
**Déroulement** : après une brève phase de discussion (chat limité), chacun vote en secret "moi" ou "mon partenaire". Si les deux votent pour l'autre, l'un des deux est tiré au sort pour gagner (bonus). Si les deux votent pour eux-mêmes, aucun ne gagne. Si un vote pour l'autre et l'autre pour lui-même, celui qui a voté pour l'autre gagne.
**Paramètres** : durée du chat, barème de gains selon les combinaisons.
**Résolution** : appliquée selon la matrice de vote ci-dessus.
**Note technique** : votes stockés séparément côté serveur et révélés uniquement après réception des deux (commit-reveal).

### 3.14 La lumière partagée
**Concept** : maintenir un bouton enfoncé ensemble pour garder une lumière allumée, le premier à lâcher volontairement capte un bonus.
**Déroulement** : les deux doivent maintenir un bouton enfoncé simultanément pour que la "lumière" (jauge commune) reste active. Après une durée minimale de maintien collectif, l'un des deux peut choisir de lâcher volontairement pour capter un bonus individuel — mais cela coupe la lumière et fait échouer l'autre s'il n'a pas atteint son propre seuil de validation.
**Paramètres** : durée minimale de maintien, taille du bonus de lâcher volontaire, seuil de validation individuel.
**Résolution** : si les deux maintiennent jusqu'au seuil de validation individuel de chacun, les deux gagnent un gain de base ; si l'un lâche avant que l'autre ait atteint son seuil, celui qui lâche gagne le bonus et l'autre échoue.
**Note technique** : état de maintien de chaque joueur suivi en continu server-side via ping, avec horodatage précis du relâchement.

### 3.15 Le message caché
**Concept** : relayer un message chiffré entre les deux pour déverrouiller l'accès, un seul peut valider en premier.
**Déroulement** : chacun reçoit une partie d'un message chiffré (ex: une clé de décalage et un texte codé). Chat limité pour combiner l'information et décoder le message complet. Une fois décodé, un bouton de validation unique est disponible pour les deux.
**Paramètres** : durée du chat, complexité du chiffrement, temps de la fenêtre de validation.
**Résolution** : premier à soumettre le message décodé correctement gagne ; les deux perdent si personne ne soumet dans le temps imparti.
**Note technique** : message et clé générés et stockés server-side séparément, validation de la soumission comparée au message déchiffré réel côté serveur.

### 3.16 Le compte parallèle
**Concept** : chacun accumule des points séparément mais doit atteindre un seuil combiné pour débloquer la manche, seul le meilleur score individuel garde ses points.
**Déroulement** : les deux jouent un mini-défi de clic/rapidité en parallèle (comme un solo), leurs scores s'additionnent pour vérifier si le seuil combiné est atteint. Si le seuil est atteint, la manche est validée, mais seul celui qui a le meilleur score individuel garde ses points (l'autre repart à zéro malgré sa contribution).
**Paramètres** : seuil combiné requis, durée du mini-défi.
**Résolution** : si seuil non atteint, les deux échouent ; si atteint, le meilleur score individuel empoche les points, l'autre rien.
**Note technique** : scores individuels et somme calculés server-side en temps réel, comparaison finale au terme du temps imparti.

### 3.17 Le saut de confiance
**Concept** : l'un doit "sauter" en se fiant à un timing donné par l'autre pour être "rattrapé", mais le rattrapeur choisit ensuite qui marque le point.
**Déroulement** : le "sauteur" doit cliquer "sauter" à un instant qu'il juge bon en fonction d'indices affichés au "rattrapeur" (qui voit une jauge cachée au sauteur). Le rattrapeur peut cliquer "rattraper" pour valider le saut au bon moment. Si le timing est bon, l'épreuve réussit, et le rattrapeur choisit alors librement lequel des deux reçoit le point.
**Paramètres** : fenêtre de timing valide, information visible pour chaque rôle.
**Résolution** : épreuve échouée si le timing est raté (les deux perdent) ; si réussie, le rattrapeur désigne le gagnant du point entre les deux.
**Note technique** : rôles et informations asymétriques gérés en room state (chaque client ne reçoit que les données de son rôle), décision finale du rattrapeur appliquée server-side.

### 3.18 Le silence forcé
**Concept** : rester immobile/silencieux ensemble pendant un temps donné, avec possibilité de trahir en rompant le silence au bon moment pour un gain.
**Déroulement** : les deux doivent ne fournir aucun input pendant X secondes pour valider l'épreuve collectivement. À tout moment, l'un des deux peut choisir de "rompre" volontairement (un clic) pour capter un gain individuel immédiat, mais cela annule la validation collective pour l'autre.
**Paramètres** : durée du silence requis, taille du gain de rupture volontaire.
**Résolution** : si les deux restent immobiles jusqu'au bout, gain collectif de base pour les deux ; si l'un rompt avant, il capte le gain de rupture et l'autre échoue.
**Note technique** : détection d'input (même minime) suivie en continu côté serveur avec horodatage précis.

### 3.19 Le pacte à durée
**Concept** : les deux s'accordent verbalement sur une répartition future, puis chacun choisit en secret de l'honorer ou non (dilemme du prisonnier classique).
**Déroulement** : phase de chat limité pour négocier une répartition d'un gain commun (ex: 50/50). Ensuite, chacun soumet en secret son choix réel : "coopérer" (respecter le pacte) ou "trahir" (prendre plus pour soi). Les deux soumissions sont comparées : coopération mutuelle = gain moyen partagé ; trahison mutuelle = gain faible partagé ; un coopère/un trahit = le traître gagne gros, le coopérant rien.
**Paramètres** : durée du chat, barème de gains de la matrice.
**Résolution** : appliquée selon la matrice de choix ci-dessus.
**Note technique** : choix stockés séparément et révélés uniquement après réception des deux (commit-reveal), matrice de résolution codée en dur côté serveur.

### 3.20 Le relais à un seul jeton
**Concept** : un seul jeton de passage existe pour un checkpoint, les deux doivent décider ensemble qui l'utilise.
**Déroulement** : chat limité pour discuter de qui doit passer le checkpoint (celui qui passe avance dans le classement général, l'autre reste bloqué à ce round). Après la discussion, chacun peut quand même tenter de forcer le passage en cliquant en premier sur le jeton, indépendamment de ce qui a été décidé à l'oral.
**Paramètres** : durée du chat, fenêtre d'utilisation du jeton après la discussion.
**Résolution** : premier à cliquer effectivement le jeton l'utilise et passe, peu importe l'accord verbal ; si aucun ne clique, les deux restent bloqués.
**Note technique** : jeton représenté comme ressource unique en room state, verrouillé au premier clic reçu côté serveur.

---

## 4. Rounds Équipe libre (3-4 joueurs, choix mutuel)

Les joueurs s'allient volontairement avant l'épreuve (pas d'obligation), ceux qui s'allient bénéficient d'un avantage sur l'épreuve collective. La stratégie sociale émerge naturellement.

### 4.1 Relais de mini-défis
**Concept** : chaque membre de l'équipe enchaîne un mini-défi solo, le temps total de l'équipe compte.
**Déroulement** : les membres jouent l'un après l'autre un mini-défi tiré de la banque solo (mémoire, réaction, etc.). Le chrono de l'équipe est la somme des temps individuels. Les équipes les plus rapides passent.
**Paramètres** : nombre de membres requis, mini-défis piochés, seuil de qualification (temps ou rang).
**Résolution** : classement des équipes par temps total cumulé ; qualification selon `winnersCount` appliqué au niveau équipe.
**Note technique** : room d'équipe orchestrant le passage séquentiel des membres, chrono cumulé calculé server-side entre le début du premier et la fin du dernier membre.

### 4.2 Construction collective
**Concept** : reproduire un motif/une forme ensemble avec un temps de discussion très court.
**Déroulement** : un motif cible (ex: disposition de blocs) est affiché brièvement à toute l'équipe. Chacun place ensuite une partie des blocs sur un plateau commun, sans revoir le motif. L'équipe entière réussit ou échoue selon la fidélité du résultat.
**Paramètres** : complexité du motif, temps d'affichage, temps de construction, seuil de fidélité pour validation.
**Résolution** : équipe validée si le plateau final atteint le seuil de fidélité ; sinon échec collectif.
**Note technique** : motif cible stocké server-side, comparaison pixel/case par case avec le plateau final pour calcul du score de fidélité.

### 4.3 Vote unanime
**Concept** : l'équipe doit se mettre d'accord sur une réponse commune dans un temps limité.
**Déroulement** : une question à choix multiple est posée à toute l'équipe. Chat limité pour discuter, puis vote simultané. Unanimité requise pour valider la manche ; sinon personne ne marque.
**Paramètres** : durée du chat, durée du vote, nombre de manches.
**Résolution** : manche validée uniquement si 100% des votes concordent ; score cumulé sur plusieurs manches.
**Note technique** : votes collectés en room state et comparés uniquement après réception de tous les votes (ou expiration du temps).

### 4.4 Le pont collectif
**Concept** : construire un pont ensemble pour que toute l'équipe puisse traverser.
**Déroulement** : chaque membre contrôle un segment du pont (ex: doit maintenir une jauge de stabilité sur sa portion). Le pont n'est traversable que si tous les segments sont stables simultanément ; l'équipe traverse ensemble ou échoue ensemble.
**Paramètres** : nombre de segments, difficulté de stabilisation par segment, durée de traversée requise.
**Résolution** : équipe qualifiée seulement si tous les membres franchissent le pont dans le temps imparti.
**Note technique** : état de stabilité de chaque segment suivi indépendamment côté serveur, condition de traversée vérifiée globalement à chaque tick.

### 4.5 La chaîne humaine
**Concept** : suite d'actions dépendantes où chaque membre doit réussir sa partie pour débloquer la suivante.
**Déroulement** : le défi est divisé en étapes séquentielles, chacune assignée à un membre différent. Un membre ne peut agir que lorsque l'étape précédente est validée par son coéquipier.
**Paramètres** : nombre d'étapes, difficulté par étape, temps limite global.
**Résolution** : équipe qualifiée si toutes les étapes sont validées dans le temps imparti.
**Note technique** : machine à états séquentielle en room, chaque étape ne devient "active" côté serveur qu'après validation de la précédente.

### 4.6 Le trésor partagé
**Concept** : rechercher collectivement des objets cachés, à répartir ensuite entre les membres.
**Déroulement** : des indices/objets sont dispersés dans une zone de jeu commune (grille ou plan). Les membres cherchent en parallèle. Une fois le temps écoulé ou tous les objets trouvés, le groupe doit décider (vote ou discussion) comment répartir les gains associés.
**Paramètres** : nombre d'objets, taille de la zone, durée de recherche, durée de négociation de répartition.
**Résolution** : équipe qualifiée si un seuil minimal d'objets est trouvé ; répartition individuelle des gains selon l'accord du groupe (défaut : partage égal si pas d'accord).
**Note technique** : positions des objets générées server-side, retrait de l'objet dès la première découverte validée (anti-doublon).

### 4.7 Le vote de leader
**Concept** : l'équipe élit un leader qui décide seul de la répartition finale des gains.
**Déroulement** : avant l'épreuve, vote rapide pour élire un leader. L'équipe réalise ensuite une épreuve collective standard (ex: défi de rapidité collectif). À la fin, le leader élu décide comment répartir les points gagnés entre les membres.
**Paramètres** : durée du vote de leader, type d'épreuve collective, contrainte de répartition minimale (optionnelle, ex: chacun doit recevoir au moins 10%).
**Résolution** : gains distribués selon la décision du leader, dans les limites des contraintes configurées.
**Note technique** : élection résolue par majorité simple côté serveur (égalité = tirage au sort), répartition finale validée contre les contraintes avant application.

### 4.8 La tour fragile
**Concept** : empiler des éléments ensemble sans faire tomber la construction.
**Déroulement** : chaque membre ajoute à tour de rôle un élément à une tour virtuelle avec une jauge de stabilité qui réagit à la précision du placement (timing/position). Si la tour s'effondre, l'équipe échoue.
**Paramètres** : hauteur cible de la tour, sensibilité de la stabilité, nombre de tours de jeu.
**Résolution** : équipe qualifiée si la hauteur cible est atteinte sans effondrement.
**Note technique** : calcul de stabilité cumulatif fait server-side à chaque ajout, avec seuil d'effondrement déclenché automatiquement si dépassé.

### 4.9 Le code collectif
**Concept** : chaque membre détient un indice partiel, la combinaison de tous permet de résoudre une énigme commune.
**Déroulement** : chat limité pour que chacun partage son indice. Un membre désigné (ou n'importe qui) soumet la réponse finale une fois l'énigme reconstituée.
**Paramètres** : nombre d'indices, durée du chat, complexité de l'énigme.
**Résolution** : équipe qualifiée si la réponse correcte est soumise dans le temps imparti.
**Note technique** : indices et solution stockés server-side, validation de la soumission uniquement côté serveur.

### 4.10 La course en cordée
**Concept** : simulation d'ascension où les membres sont "liés" et doivent avancer à un rythme coordonné.
**Déroulement** : chaque membre doit valider son propre "pas" (clic/action rythmée) mais l'équipe n'avance que si les pas sont suffisamment synchronisés (écart de timing sous un seuil). Un membre trop en avance ou en retard ralentit toute la cordée.
**Paramètres** : nombre de "pas" à valider, seuil de synchronisation, distance à parcourir.
**Résolution** : équipe qualifiée si elle atteint la distance cible dans le temps imparti.
**Note technique** : timestamps de chaque pas comparés server-side pour calculer l'écart de synchronisation à chaque étape.

### 4.11 Le radeau
**Concept** : ramer ensemble en rythme pour faire avancer un radeau virtuel.
**Déroulement** : chaque membre rame (clics répétés) ; la vitesse du radeau dépend de la synchronisation des rythmes de rame de tous les membres, pas seulement de la fréquence individuelle.
**Paramètres** : distance à parcourir, tolérance de synchronisation, durée max.
**Résolution** : équipe qualifiée si elle atteint la distance cible dans le temps imparti.
**Note technique** : vitesse calculée server-side comme fonction de la moyenne et de l'écart-type des fréquences de clic des membres (pénalité si désynchronisé).

### 4.12 Le chant collectif
**Concept** : synchroniser les inputs de tous les membres sur un même rythme.
**Déroulement** : un métronome commun est diffusé ; chaque membre doit cliquer en rythme. Le score de l'équipe dépend du pourcentage de clics de tous les membres dans la fenêtre de précision.
**Paramètres** : tempo, largeur de la fenêtre de précision, durée totale.
**Résolution** : équipe qualifiée si le score global de précision dépasse un seuil.
**Note technique** : chaque clic comparé au tempo serveur, score agrégé calculé en temps réel côté serveur.

### 4.13 La cartographie
**Concept** : explorer par tâtonnement pour identifier collectivement les zones sûres d'une grille cachée.
**Déroulement** : chaque membre teste des cases (à tour de rôle ou en parallèle limité) ; une case testée révèle "sûre" ou "danger" à toute l'équipe. L'objectif est de tracer un chemin sûr complet avant la fin du temps.
**Paramètres** : taille de la grille, proportion de cases dangereuses, nombre de tests autorisés.
**Résolution** : équipe qualifiée si un chemin sûr complet est tracé dans le temps/nombre de tests imparti.
**Note technique** : grille de danger générée et stockée server-side, résultat de chaque test partagé en temps réel à tous les membres de la room.

### 4.14 Le marché troc
**Concept** : les membres échangent des ressources entre eux avant une épreuve qui nécessite un lot précis de ressources.
**Déroulement** : chaque membre reçoit des ressources différentes en quantités inégales. Phase de troc (chat limité) pour redistribuer avant l'épreuve, qui nécessite qu'au moins un membre atteigne un lot cible précis.
**Paramètres** : types et quantités de ressources, durée du troc, lot cible requis.
**Résolution** : équipe qualifiée si le lot cible est atteint par au moins un membre à la fin du troc.
**Note technique** : inventaire de chaque membre suivi en room state, transferts validés server-side (pas de double dépense possible).

### 4.15 Le bouclier
**Concept** : coordonner les membres pour bloquer une série d'attaques simulées.
**Déroulement** : des "attaques" apparaissent sur différents côtés d'un plateau commun ; chaque membre doit cliquer pour bloquer les attaques de son côté assigné. Une attaque non bloquée réduit la jauge de vie collective de l'équipe.
**Paramètres** : fréquence des attaques, nombre de côtés/membres, jauge de vie de départ.
**Résolution** : équipe qualifiée si la jauge de vie collective reste au-dessus de zéro à la fin du temps imparti.
**Note technique** : attaques générées server-side avec position et timing, validation du blocage par comparaison de la position du clic et du côté assigné.

### 4.16 La pyramide de points
**Concept** : l'équipe doit décider d'une hiérarchie de répartition avant de savoir le résultat de l'épreuve collective.
**Déroulement** : avant l'épreuve, vote ou discussion pour établir un ordre de priorité de répartition (qui reçoit en premier, deuxième, etc. sur les gains). L'épreuve collective se déroule ensuite normalement (ex: rapidité collective), et les gains sont distribués selon l'ordre décidé, du haut vers le bas jusqu'à épuisement du pot.
**Paramètres** : durée de la discussion de hiérarchie, taille du pot, type d'épreuve.
**Résolution** : distribution des gains selon la hiérarchie décidée et le pot obtenu à l'épreuve.
**Note technique** : ordre de hiérarchie stocké en room state avant le début de l'épreuve, distribution calculée automatiquement server-side après résolution du pot.

### 4.17 Le compte à trois
**Concept** : tous les membres doivent cliquer dans une fenêtre de temps minuscule et commune.
**Déroulement** : un compte à rebours est diffusé à toute l'équipe (ex: "cliquez à exactement 10 secondes"). Tous cliquent sans concertation en temps réel. La manche réussit seulement si l'écart entre le clic le plus rapide et le plus lent est sous un seuil.
**Paramètres** : cible de temps, seuil de tolérance global, nombre de manches.
**Résolution** : équipe qualifiée selon le nombre de manches réussies (écart sous le seuil).
**Note technique** : tous les timestamps de clic comparés server-side, calcul de l'écart max entre tous les membres avec correction de latence individuelle.

### 4.18 Le sacrifice
**Concept** : l'équipe peut voter pour exclure un membre afin d'augmenter les gains des autres.
**Déroulement** : après une épreuve collective standard qui génère un pot commun, l'équipe vote (majorité) pour éventuellement exclure un membre du partage des gains, ce qui augmente la part des membres restants.
**Paramètres** : type d'épreuve initiale, règle de majorité pour le vote de sacrifice, effet sur le partage (proportionnel au nombre exclu).
**Résolution** : si le vote de sacrifice passe, le membre exclu ne reçoit rien et les autres se partagent son dû ; sinon partage égal entre tous.
**Note technique** : vote résolu server-side par majorité simple, redistribution des gains calculée automatiquement selon le résultat du vote.

### 4.19 Le fil rouge
**Concept** : les membres sont liés par un risque partagé — l'échec de l'un affecte le score de tous.
**Déroulement** : chaque membre réalise un mini-défi individuel (ex: réaction ou précision), mais le score final de l'équipe est celui du membre le plus faible (façon "maillon faible"), ce qui incite le groupe à s'entraider avant l'épreuve (conseils via chat) plutôt que pendant.
**Paramètres** : type de mini-défi individuel, durée de la phase de conseils avant l'épreuve.
**Résolution** : score de l'équipe = score du membre le plus faible ; qualification selon ce score minimal.
**Note technique** : scores individuels calculés en parallèle côté serveur, score d'équipe dérivé comme le minimum du groupe.

### 4.20 La négociation finale
**Concept** : l'équipe entière doit s'accorder sur un ratio final de distribution du pot avant qu'il ne soit validé.
**Déroulement** : après avoir gagné collectivement un pot (via n'importe quelle épreuve d'équipe), le groupe dispose d'un temps de négociation libre pour proposer et voter un ratio de répartition. Si aucun accord n'est trouvé dans le temps imparti, répartition égale par défaut est appliquée.
**Paramètres** : durée de négociation, mécanisme de vote (majorité ou unanimité), règle de répartition par défaut.
**Résolution** : ratio voté appliqué si le seuil de vote est atteint ; sinon répartition égale automatique.
**Note technique** : propositions de ratio stockées en room state, vote final résolu server-side selon la règle configurée (majorité/unanimité).

---
# Catalogue de mini-jeux — Section 5

## 5. Rounds Survie collective

Tout le monde joue en simultané contre la même menace (chrono, jauge, mécanique environnementale) — pas d'alliance ni de rôle caché ici. Seul un pourcentage ou un nombre fixe du groupe est éliminé à chaque round. La tension vient de la pression collective et du timing, pas de la négociation sociale.

### 5.1 1,2,3 Soleil digital
**Concept** : un signal alterne entre "safe" (les joueurs peuvent avancer) et "danger" (immobilité totale requise) ; bouger pendant "danger" élimine.
**Déroulement** : le serveur diffuse l'état courant à intervalles irréguliers (aléatoire dans une plage). Pendant "safe", chaque joueur fait progresser une jauge personnelle (input continu : maintien de touche, glissé). Pendant "danger", tout input détecté élimine immédiatement.
**Paramètres** : durée des phases safe/danger (plage aléatoire), distance à parcourir, durée totale du round, tolérance de détection pendant danger.
**Résolution** : qualifiés = joueurs ayant atteint la ligne d'arrivée avant la fin du round ; éliminés = joueurs pris en mouvement pendant danger ou n'ayant pas fini à temps.
**Note technique** : bascule safe/danger décidée et horodatée server-side ; chaque input est comparé à la fenêtre danger avec une marge de tolérance réseau (jamais basé sur l'affichage local).

### 5.2 Zones qui rétrécissent
**Concept** : des cases "sûres" sur une grille diminuent en nombre à chaque tour ; les joueurs sans case sont éliminés.
**Déroulement** : une grille de cases sûres est affichée, chaque joueur doit s'y positionner avant la fin d'un compte à rebours court. Au signal, les cases en surnombre sont retirées et le nombre de cases sûres diminue au tour suivant.
**Paramètres** : nombre de cases initial, taux de réduction par tour, durée du compte à rebours, règle de sur-occupation (une case = un joueur, premier arrivé).
**Résolution** : à chaque tour, les joueurs sans case validée sont éliminés ; le round se termine au nombre de qualifiés visé.
**Note technique** : occupation résolue server-side par ordre d'arrivée des messages ; nombre de cases du tour suivant calculé après résolution du tour précédent.

### 5.3 Dernier debout
**Concept** : tout le monde clique en boucle pour "tenir" une jauge personnelle active ; qui relâche ou est trop lent est éliminé.
**Déroulement** : chaque joueur doit maintenir une fréquence de clic minimale (ou garder un bouton enfoncé). Le serveur vérifie à intervalles réguliers ("checks") que chaque joueur est toujours actif ; inactivité à un check = élimination immédiate.
**Paramètres** : fréquence minimale requise, intervalle entre checks, durée max du round.
**Résolution** : éliminés = joueurs sous le seuil à un check ; qualifiés = derniers joueurs actifs (nombre selon `winnersCount`).
**Note technique** : activité mesurée via timestamps d'input reçus côté serveur (pas de simple flag client, pour détecter les patterns d'auto-clic suspects) ; checks avec léger jitter aléatoire non prévisible côté client.

### 5.4 Le sol qui s'effondre
**Concept** : un sol en cases s'effondre progressivement sous les joueurs, qui doivent se déplacer vers les cases encore intactes.
**Déroulement** : à intervalles réguliers, un sous-ensemble de cases est marqué pour effondrement avec un court délai d'alerte visuelle, puis disparaît. Les joueurs doivent quitter leur case avant son effondrement.
**Paramètres** : taille de la grille, fréquence des vagues, délai d'alerte, proportion de cases effondrées par vague.
**Résolution** : éliminé = joueur présent sur une case au moment de son effondrement ; qualifiés = joueurs encore sur case intacte à la fin du temps imparti.
**Note technique** : état de chaque case géré en room state ; position du joueur vérifiée server-side à l'instant précis de l'effondrement (pas de tolérance visuelle client qui désynchroniserait le rendu).

### 5.5 Le rayon balayeur
**Concept** : un rayon (ou une ombre) balaie l'écran régulièrement ou aléatoirement ; être touché élimine.
**Déroulement** : une ligne (verticale, horizontale ou rotative) traverse le plateau commun à vitesse variable. Les joueurs se déplacent librement pour l'éviter ; contact = élimination.
**Paramètres** : vitesse et trajectoire (linéaire, rotative, aléatoire), largeur du rayon, taille du plateau, durée totale.
**Résolution** : éliminés = joueurs touchés ; qualifiés = joueurs encore en jeu à la fin du temps (ou selon `winnersCount`).
**Note technique** : position du rayon calculée par fonction déterministe côté serveur à chaque tick ; collision vérifiée par comparaison des coordonnées joueur/rayon à chaque tick serveur.

### 5.6 La chaise musicale digitale
**Concept** : variante des chaises musicales — moins de places sûres que de joueurs quand la musique s'arrête.
**Déroulement** : une musique/minuterie tourne pendant une durée aléatoire pendant que les joueurs se déplacent librement entre des places affichées. À l'arrêt (signal serveur), chaque joueur doit valider une place ; il y a toujours moins de places que de joueurs restants.
**Paramètres** : nombre de places par tour (< joueurs restants), durée aléatoire de la musique, fenêtre de validation après l'arrêt.
**Résolution** : joueurs sans place validée à temps sont éliminés ; le tour se répète avec une place en moins jusqu'au nombre de qualifiés visé.
**Note technique** : arrêt déclenché et horodaté server-side à un instant non prévisible ; validation de place résolue par ordre d'arrivée des messages serveur (place verrouillée au premier arrivé).

### 5.7 Le silence mortel
**Concept** : variante audio pure du "1,2,3 soleil" — un signal sonore d'alerte impose l'immobilité, sans repère visuel, pour forcer l'écoute active.
**Déroulement** : un fond sonore neutre joue en continu ; à intervalles irréguliers, un son distinct retentit brièvement. Pendant les X ms suivants, tout mouvement élimine. Le reste du temps, les joueurs avancent librement vers un objectif.
**Paramètres** : fréquence et durée des alertes, fenêtre d'immobilité après chaque alerte, distance à parcourir, durée totale.
**Résolution** : éliminés = joueurs en mouvement pendant une fenêtre d'alerte ; qualifiés = joueurs ayant atteint l'objectif sans être éliminés.
**Note technique** : déclenchement de l'alerte horodaté et diffusé server-side avec correction de latence audio/réseau par joueur (mesurée en amont), marge de tolérance pour éviter les faux positifs liés au décalage de lecture.

### 5.8 Le pont de lumières
**Concept** : un chemin de dalles sûres/piégées est à mémoriser à partir d'un indice visuel très bref.
**Déroulement** : une rangée de dalles s'illumine brièvement pour indiquer un chemin sûr temporaire, puis s'éteint. Les joueurs avancent en se souvenant du chemin ; une dalle piégée élimine au contact.
**Paramètres** : longueur du pont, durée d'affichage de l'indice, proportion de dalles piégées, temps total pour traverser.
**Résolution** : éliminés = joueurs sur une dalle piégée ; qualifiés = joueurs ayant atteint l'autre bout dans le temps imparti.
**Note technique** : disposition sûr/piégé générée et stockée server-side (jamais transmise en clair, seul l'indice temporaire est envoyé) ; chaque pas vérifié contre la disposition réelle côté serveur.

### 5.9 La marée montante
**Concept** : un niveau d'eau commun monte progressivement ; les joueurs doivent grimper sur des plateformes de plus en plus hautes/rares pour rester au sec.
**Déroulement** : une jauge de niveau d'eau visible par tous augmente à intervalle régulier. Chaque joueur doit se positionner sur une plateforme dont la hauteur dépasse le niveau courant ; les plateformes basses deviennent inaccessibles au fil du temps.
**Paramètres** : vitesse de montée de l'eau, nombre et hauteur des plateformes, durée totale.
**Résolution** : éliminé = joueur sous le niveau d'eau à un check ; qualifiés = joueurs restant au-dessus jusqu'au nombre visé.
**Note technique** : niveau d'eau calculé server-side par tick et diffusé ; position de chaque joueur vérifiée contre le niveau à chaque check.

### 5.10 Le radeau qui coule
**Concept** : un radeau commun a une flottabilité limitée qui diminue ; les joueurs doivent sauter volontairement ou risquer le naufrage collectif.
**Déroulement** : tous les joueurs commencent "à bord" ; la flottabilité diminue avec le temps (ou avec le nombre de joueurs à bord). Si elle atteint zéro avec des joueurs encore à bord, tous les joueurs présents à cet instant sont éliminés. Un bouton "sauter" permet de se retirer volontairement pour rester qualifié, au prix d'un moins bon classement.
**Paramètres** : vitesse de décroissance de la flottabilité, temps total avant naufrage, avantage de classement pour ceux qui restent le plus longtemps.
**Résolution** : joueurs encore à bord au naufrage = éliminés ; joueurs ayant sauté à temps = qualifiés, classés par ordre inverse du temps passé à bord.
**Note technique** : flottabilité recalculée server-side à chaque tick selon le nombre à bord ; action de saut horodatée et traitée en priorité absolue avant le calcul du naufrage au même tick.

### 5.11 La ligne de feu
**Concept** : des obstacles mobiles traversent le plateau à intervalles réguliers ; les joueurs se positionnent dans les intervalles sûrs.
**Déroulement** : une ou plusieurs lignes d'obstacles traversent le plateau commun selon un pattern (aléatoire ou cyclique). Les joueurs se déplacent librement pour éviter le contact ; contact = élimination immédiate.
**Paramètres** : nombre de lignes, vitesse et espacement, taille du plateau, durée totale.
**Résolution** : éliminés = joueurs touchés ; qualifiés = joueurs encore en jeu à la fin du temps (ou selon `winnersCount`).
**Note technique** : trajectoires calculées de façon déterministe côté serveur (seed loguée pour audit) ; collision vérifiée par comparaison de coordonnées à chaque tick.

### 5.12 La bulle commune
**Concept** : une jauge partagée gonfle avec les actions cumulées de tous les joueurs ; au-delà d'un seuil, elle explose et élimine une partie du groupe.
**Déroulement** : chaque joueur contribue à une jauge commune visible en temps réel via ses actions. Si elle dépasse un seuil critique, elle explose : un pourcentage des plus gros contributeurs récents (ou un tirage parmi les contributeurs) est éliminé.
**Paramètres** : seuil critique (exact ou flouté), pourcentage éliminé à l'explosion, durée totale, visibilité de la jauge.
**Résolution** : après explosion (ou à la fin du temps sans explosion), les joueurs restants sont qualifiés.
**Note technique** : contribution de chaque joueur suivie individuellement côté serveur pour la sélection en cas d'explosion ; seuil réel jamais transmis en clair si le mode flouté est activé.

### 5.13 Le poids du groupe
**Concept** : une plateforme en équilibre (bascule) réagit au positionnement des joueurs ; un déséquilibre trop fort fait tomber un côté.
**Déroulement** : les joueurs se répartissent librement entre plusieurs zones d'une plateforme commune avec jauge d'équilibre visible. Si un côté devient trop chargé au-delà d'un seuil pendant un temps donné, il s'effondre et élimine les joueurs qui y sont.
**Paramètres** : seuil de déséquilibre tolérable, temps de tolérance avant effondrement, nombre de zones, durée totale.
**Résolution** : éliminés = joueurs du côté effondré ; qualifiés = joueurs des côtés restés stables à la fin.
**Note technique** : position de chaque joueur suivie en room state, calcul de la charge et du déséquilibre fait server-side à chaque tick ; effondrement déclenché uniquement par le serveur.

### 5.14 Le vote d'élimination express
**Concept** : le groupe vote directement pour éliminer un pourcentage de joueurs, sans rôle caché ni tâche — un vote de survie pur.
**Déroulement** : une courte discussion collective (chat commun limité) précède un vote simultané où chaque joueur désigne un ou plusieurs autres à éliminer. Les plus votés sont éliminés jusqu'au quota du tour.
**Paramètres** : durée de la discussion, nombre de votes par joueur, quota d'éliminés par tour, règle de départage en cas d'égalité.
**Résolution** : éliminés = joueurs les plus votés jusqu'au quota ; qualifiés = tous les autres.
**Note technique** : votes collectés en room state et révélés uniquement après clôture du scrutin (pas de compteur en direct, pour éviter l'effet moutonnier) ; départage par tirage aléatoire audité si nécessaire.

### 5.15 La roue du hasard collective
**Concept** : une élimination partiellement aléatoire et transparente, où chacun influence légèrement ses chances via une action simple.
**Déroulement** : chaque joueur effectue une action rapide (mini-défi de précision très court) dont le résultat pondère son poids dans un tirage au sort final. Le tirage élimine un pourcentage de joueurs, avec une probabilité inversement proportionnelle à leur performance.
**Paramètres** : type de mini-défi de pondération, quota d'éliminés, formule de pondération du tirage.
**Résolution** : éliminés = joueurs tirés au sort selon la pondération, jusqu'au quota ; qualifiés = les autres.
**Note technique** : RNG exécuté et logué côté serveur avec seed vérifiable pour audit ; pondérations calculées à partir des performances mesurées server-side avant le tirage.

### 5.16 La bombe partagée
**Concept** : un compte à rebours commun doit être "désamorcé" collectivement par des actions individuelles suffisantes avant zéro, sinon une partie du groupe est éliminée.
**Déroulement** : une jauge de désamorçage commune doit atteindre 100% avant la fin d'un compte à rebours visible, via la contribution cumulée de tous les joueurs. Si le compte atteint zéro sans jauge pleine, les moins contributeurs sont éliminés.
**Paramètres** : durée du compte à rebours, vitesse de remplissage par action, seuil de contribution minimale individuelle.
**Résolution** : si la jauge atteint 100% à temps, tout le monde est qualifié ; sinon, les joueurs sous le seuil de contribution sont éliminés.
**Note technique** : contribution de chaque joueur trackée séparément côté serveur pour permettre le classement en cas d'échec collectif ; jauge globale recalculée à chaque tick.

### 5.17 Le cercle qui tourne
**Concept** : une plateforme circulaire divisée en secteurs tourne ; seuls certains secteurs sont sûrs à un instant donné.
**Déroulement** : le plateau est divisé en secteurs autour d'un cercle ; un sous-ensemble est marqué "sûr" à chaque instant, ce marquage tourne progressivement (façon aiguille d'horloge). Les joueurs se déplacent pour rester dans un secteur sûr au moment des checks.
**Paramètres** : nombre de secteurs, proportion de secteurs sûrs, vitesse de rotation, fréquence des checks.
**Résolution** : éliminés = joueurs dans un secteur non-sûr à un check ; qualifiés = joueurs survivants à la fin du temps imparti.
**Note technique** : position des secteurs sûrs calculée par fonction de rotation déterministe côté serveur ; position de chaque joueur vérifiée contre le secteur sûr courant à chaque check.

### 5.18 Les dominos
**Concept** : une réaction en chaîne se propage sur le plateau ; les joueurs doivent s'écarter de la trajectoire avant qu'elle ne les atteigne.
**Déroulement** : un point de départ déclenche une propagation visuelle (façon dominos qui tombent) qui avance case par case selon un pattern défini (ligne, vague, ramifications). Chaque joueur atteint par la propagation à son tour est éliminé, sauf s'il s'est déplacé hors de la trajectoire à temps.
**Paramètres** : vitesse de propagation, pattern (ligne droite, vague, ramifications), taille du plateau.
**Résolution** : éliminés = joueurs atteints par la propagation ; qualifiés = joueurs ayant esquivé jusqu'à la fin du round.
**Note technique** : trajectoire de propagation calculée de façon déterministe et diffusée avec un préavis minimal juste avant l'arrivée sur chaque case, côté serveur ; position des joueurs vérifiée à chaque étape.

### 5.19 Le sprint des lucioles
**Concept** : des points lumineux temporaires apparaissent sur le plateau ; chaque joueur doit en collecter un minimum avant la fin du temps pour survivre.
**Déroulement** : des lucioles apparaissent aléatoirement pendant un court instant chacune, puis disparaissent si non collectées (clic/déplacement dessus). Chaque joueur doit atteindre un quota individuel avant la fin du round.
**Paramètres** : fréquence d'apparition, durée de vie de chaque luciole, quota individuel requis, durée totale.
**Résolution** : éliminés = joueurs n'ayant pas atteint leur quota à la fin du temps imparti ; qualifiés = les autres.
**Note technique** : apparition et retrait des lucioles gérés server-side avec horodatage ; collecte validée par le premier clic reçu sur une luciole encore active (anti-doublon).

### 5.20 La dernière lumière
**Concept** : chaque joueur possède une jauge de lumière individuelle qui décroît naturellement ; il doit la ranimer par des actions répétées avant qu'elle ne s'éteigne totalement.
**Déroulement** : la jauge personnelle décroît en continu ; des actions (clics, mini-tâches rapides) la rechargent. Si la jauge d'un joueur atteint zéro, il est éliminé.
**Paramètres** : vitesse de décroissance naturelle, quantité rechargée par action, durée totale du round.
**Résolution** : éliminés = joueurs dont la jauge atteint zéro avant la fin du round ; qualifiés = joueurs dont la lumière est encore active (ou selon `winnersCount`).
**Note technique** : jauge de chaque joueur calculée et mise à jour exclusivement côté serveur à chaque tick à partir des actions reçues ; élimination déclenchée dès que la jauge calculée atteint zéro, jamais dépendante de l'affichage client.

---

# Catalogue de mini-jeux — Section 6

## 6. Rounds Rôle caché

Un ou plusieurs joueurs reçoivent un rôle secret (traître, saboteur, imposteur) pendant une tâche collective standard. Discussion limitée dans le temps, puis vote d'élimination/démasquage. Version allégée façon Among Us : jamais de tâches physiques complexes ni de négociation IA — juste un rôle secret simple, une tâche empruntée aux autres familles de rounds, et un vote.

### 6.1 Le saboteur
**Concept** : un joueur tiré au sort doit empêcher discrètement le groupe de valider une tâche commune.
**Déroulement** : le groupe reçoit une tâche collective simple (ex : valider un calcul commun en accumulant les chiffres soumis par chacun). Le saboteur reçoit en privé l'instruction de fausser discrètement un chiffre. Après un temps de discussion court, vote unique pour désigner le suspect.
**Paramètres** : durée de la tâche, durée de la discussion, nombre de saboteurs (1 par défaut), majorité requise pour le vote.
**Résolution** : bonne désignation = la tâche est validée pour le groupe malgré le sabotage et le saboteur est éliminé ; mauvaise désignation = le vote échoue et le groupe subit une pénalité collective (ex : élimination aléatoire ou blocage d'un tour).
**Note technique** : rôle assigné et connu uniquement du joueur concerné (message privé server-side) ; action de sabotage journalisée côté serveur pour audit post-vote, jamais visible pendant la partie.

### 6.2 L'imposteur silencieux
**Concept** : un joueur ne reçoit pas la même information que les autres et doit bluffer pour ne pas se faire repérer.
**Déroulement** : tout le groupe reçoit la même consigne sauf l'imposteur, qui reçoit une version différente ou absente (ex : décrire un objet affiché à l'écran, que l'imposteur ne voit pas et doit improviser). Discussion, puis vote.
**Paramètres** : durée d'affichage de l'info aux non-imposteurs, durée de discussion, nombre d'imposteurs.
**Résolution** : bonne désignation = imposteur éliminé et groupe validé ; mauvaise désignation = le joueur accusé à tort est éliminé à sa place.
**Note technique** : contenu affiché différent selon le rôle, envoyé par canal privé (deux versions de la consigne en room state) ; aucune fuite possible via un état partagé unique.

### 6.3 Le double agent
**Concept** : deux saboteurs coordonnent leur sabotage sans se faire repérer ni se découvrir publiquement.
**Déroulement** : même mécanique que "Le saboteur" mais avec deux rôles secrets, qui connaissent mutuellement leur identité via un canal privé, sans pouvoir se coordonner ouvertement dans le chat public.
**Paramètres** : durée de la tâche, durée de discussion, quota d'éliminés par vote (1 ou 2 selon config).
**Résolution** : au moins un saboteur démasqué = tâche validée pour le reste du groupe ; aucun démasqué = pénalité collective.
**Note technique** : canal privé dédié entre les deux saboteurs (sous-room ou flag serveur), distinct et invisible du chat public utilisé pour le vote.

### 6.4 La carte truquée
**Concept** : un joueur reçoit un objectif légèrement différent qu'il doit faire passer pour l'objectif commun.
**Déroulement** : chaque joueur reçoit une carte d'objectif (ex : "trouver le nombre pair le plus grand"), sauf le traître qui en reçoit une variante et doit orienter la discussion vers une réponse erronée.
**Paramètres** : durée de discussion, complexité de l'objectif, nombre de traîtres.
**Résolution** : réponse commune correcte = tous validés (sauf traître démasqué séparément) ; réponse incorrecte = pénalité collective.
**Note technique** : objectifs réels stockés séparément par rôle côté serveur ; la réponse finale du groupe est comparée à l'objectif réel, jamais à celui du traître.

### 6.5 Le faux témoin
**Concept** : lors d'une mini-enquête collective, un joueur détient une fausse information à injecter sans se faire remarquer.
**Déroulement** : le groupe doit résoudre une petite énigme de déduction à partir d'indices partagés par chacun. Le faux témoin reçoit un indice légèrement modifié qu'il partage comme s'il était vrai.
**Paramètres** : nombre d'indices, durée de partage/discussion, durée du vote final.
**Résolution** : bonne résolution de l'énigme = tous validés (sauf faux témoin démasqué) ; mauvaise résolution = pénalité collective.
**Note technique** : indices réels et faux indices stockés séparément server-side ; la réponse finale est comparée à la solution réelle, jamais à la version du faux témoin.

### 6.6 Le voleur silencieux
**Concept** : un joueur prélève discrètement des points d'une cagnotte commune sans se faire remarquer.
**Déroulement** : une cagnotte commune grossit automatiquement, visible par tous. Le voleur reçoit en secret la capacité de prélever une petite portion à intervalles réguliers, avec un léger différé d'affichage qui masque le prélèvement en temps réel.
**Paramètres** : vitesse de croissance de la cagnotte, montant prélevable, fréquence de prélèvement, durée totale.
**Résolution** : la cagnotte restante est partagée entre les non-voleurs à la fin ; un vote final peut démasquer le voleur et lui retirer son gain volé.
**Note technique** : montant réel et prélèvements suivis exclusivement côté serveur ; l'affichage public tolère un léger délai pour masquer les prélèvements en direct.

### 6.7 L'espion des couleurs
**Concept** : dans une tâche de reconnaissance de motif, seul le traître connaît la vraie règle et doit orienter le groupe vers une erreur.
**Déroulement** : le groupe doit s'accorder sur une règle de tri (ex : classer des formes par couleur) à partir d'exemples partagés. Le traître connaît la vraie règle mais argumente en faveur d'une règle légèrement fausse.
**Paramètres** : complexité du motif, durée de discussion, nombre de traîtres.
**Résolution** : réponse commune correcte = tous validés ; le traître marque un bonus si sa désinformation fait échouer le groupe sans être démasqué au vote suivant.
**Note technique** : règle réelle stockée server-side, jamais exposée en clair avant soumission finale ; le vote de démasquage est traité séparément de la validation de tâche.

### 6.8 Le menteur du groupe
**Concept** : à chaque manche, le traître doit donner une réponse fausse à une question commune et la justifier de façon crédible.
**Déroulement** : une question courte est posée au groupe (ex : estimation d'une quantité). Chacun répond publiquement à tour de rôle avec une brève justification. Le traître ment sciemment tout en argumentant comme s'il disait vrai.
**Paramètres** : nombre de manches, temps de réponse/justification, nombre de traîtres.
**Résolution** : après plusieurs manches, vote pour désigner le(s) suspect(s) ; bonne désignation = bonus pour les votants ; traître non démasqué après N manches = bonus pour lui.
**Note technique** : réponse réelle du traître enregistrée server-side pour vérifier la cohérence de son discours a posteriori, sans être révélée avant le vote.

### 6.9 La preuve cachée
**Concept** : chaque joueur a un alibi secret, le traître doit inventer le sien sans se contredire.
**Déroulement** : chaque joueur reçoit une fiche décrivant une action fictive effectuée pendant un laps de temps donné. Le traître reçoit une fiche vide et doit improviser un alibi cohérent en le communiquant pendant la discussion.
**Paramètres** : nombre de détails par fiche, durée de discussion, nombre de traîtres.
**Résolution** : vote final pour désigner l'alibi le moins cohérent ; bonne désignation élimine le traître, mauvaise élimine un innocent à sa place.
**Note technique** : fiches réelles générées et stockées server-side par joueur (jamais partagées automatiquement entre clients), permettant de vérifier la cohérence des alibis après coup.

### 6.10 Le pion secret
**Concept** : un joueur reçoit pour mission de déplacer discrètement un jeton commun vers un mauvais emplacement.
**Déroulement** : le groupe déplace collectivement un jeton virtuel vers une case cible en votant à chaque tour sur le prochain mouvement. Le traître, quand vient son tour de proposer, essaie de faire dévier le jeton sans paraître suspect.
**Paramètres** : taille du plateau, nombre de tours, majorité requise pour valider chaque mouvement.
**Résolution** : jeton arrivé à la case cible dans le nombre de tours imparti = manche validée (sauf traître démasqué séparément) ; sinon pénalité collective.
**Note technique** : position réelle du jeton et cible stockées server-side, chaque proposition de mouvement journalisée avec l'identité du proposant pour analyse post-manche.

### 6.11 Le validateur corrompu
**Concept** : un joueur reçoit secrètement le pouvoir d'approuver ou rejeter la progression collective, et peut en abuser.
**Déroulement** : le groupe réalise une tâche standard (ex : reproduire un motif), puis un joueur tiré au sort (le "validateur") valide ou rejette le résultat final via un simple bouton, sans justification visible.
**Paramètres** : type de tâche initiale, durée de la tâche, transparence du rôle de validateur (connu ou secret).
**Résolution** : résultat objectivement bon validé = groupe qualifié ; sinon pénalité, avec vote possible ensuite pour démasquer un abus de pouvoir.
**Note technique** : résultat réel de la tâche évalué server-side indépendamment de la décision du validateur, permettant de détecter un abus a posteriori.

### 6.12 Le compte faussé
**Concept** : dans une tâche de calcul collectif, le traître glisse discrètement une mauvaise information dans le total.
**Déroulement** : chaque joueur propose sa contribution au total du groupe. Le traître annonce un nombre légèrement différent du sien sans que cela soit trop visible, faussant la somme finale.
**Paramètres** : nombre de contributeurs, plage des nombres, seuil de tolérance d'erreur sur la somme finale.
**Résolution** : somme annoncée conforme (à la tolérance près) à la vraie somme calculée server-side = manche validée ; sinon pénalité, avec vote de démasquage possible.
**Note technique** : vraie contribution de chaque joueur stockée server-side séparément de ce qu'il annonce publiquement, pour vérifier qui a menti après coup.

### 6.13 L'allié fantôme
**Concept** : dans un round d'équipe, un joueur infiltré prétend aider mais sabote discrètement l'effort collectif.
**Déroulement** : une petite équipe réalise une épreuve collective standard (ex : construction collective). Un membre est secrètement désigné "allié fantôme" et doit commettre une erreur discrète (mauvaise pièce, mauvais timing) sans que cela paraisse volontaire.
**Paramètres** : type d'épreuve collective, taille de l'équipe, nombre d'alliés fantômes.
**Résolution** : épreuve échouée = vote de démasquage ensuite ; bonne désignation = bonus de consolation pour les autres malgré l'échec.
**Note technique** : action de sabotage effectuée via les mêmes inputs que les autres joueurs mais journalisée avec un flag serveur "intentionnelle" pour l'analyse du vote, jamais visible pendant la partie.

### 6.14 Le chronomètre sabordé
**Concept** : le traître peut discrètement ralentir une tâche collective chronométrée sans se faire remarquer.
**Déroulement** : le groupe valide une tâche commune (ex : bombe partagée) avant la fin d'un compte à rebours. Le traître dispose d'un bouton privé qui ralentit légèrement le remplissage de la jauge commune à chaque activation, sans indication publique de l'auteur.
**Paramètres** : durée du compte à rebours, effet de ralentissement par activation, cooldown entre deux activations.
**Résolution** : jauge à 100% à temps = tous qualifiés (sauf traître démasqué à part) ; sinon pénalité collective avec vote de démasquage.
**Note technique** : activations du traître enregistrées avec timestamp server-side pour audit post-manche ; effet appliqué uniquement à la jauge serveur, jamais visible comme action distincte dans le flux public.

### 6.15 Le messager corrompu
**Concept** : dans une tâche de relais d'information, le traître altère discrètement le message transmis.
**Déroulement** : une information est transmise de joueur en joueur (façon "téléphone arabe") jusqu'à un point de validation final. Le traître, en recevant le message, le modifie légèrement avant de le retransmettre.
**Paramètres** : longueur de la chaîne de joueurs, complexité du message, temps de transmission par maillon.
**Résolution** : message final fidèle à l'original = manche validée (sauf traître démasqué séparément) ; sinon pénalité collective avec vote de démasquage.
**Note technique** : message original et chaque version transmise journalisés server-side à chaque maillon, permettant d'identifier précisément où l'altération a eu lieu.

### 6.16 Le jury caché
**Concept** : un joueur détient secrètement un droit de veto sur les votes collectifs du groupe.
**Déroulement** : le groupe organise un vote standard (répartition, élimination). Un joueur tiré au sort peut, une fois par partie, annuler le résultat du vote et le remplacer par son choix personnel, sans annonce publique.
**Paramètres** : nombre d'utilisations du veto autorisées, transparence du résultat (annoncé après coup ou jamais).
**Résolution** : résultat appliqué = celui du veto si utilisé, sinon celui du vote normal ; un vote de démasquage ultérieur permet de sanctionner le détenteur identifié.
**Note technique** : résultat du vote normal et décision de veto stockés séparément côté serveur, avec log de l'utilisation pour analyse post-partie sans exposition en direct.

### 6.17 La fausse alerte
**Concept** : dans un round de survie collective, le traître déclenche secrètement de faux signaux de danger pour piéger les innocents.
**Déroulement** : le groupe joue une variante du "1,2,3 soleil" ; en plus du signal serveur normal, le traître dispose d'un bouton caché qui déclenche une fausse alerte à un moment de son choix, dans la limite d'un cooldown.
**Paramètres** : cooldown entre deux fausses alertes, durée de la fausse alerte, nombre d'utilisations max par manche.
**Résolution** : les joueurs piégés subissent une pénalité de temps (pas d'élimination directe, pour éviter une sanction injuste irréversible) ; un vote de démasquage final sanctionne le traître identifié.
**Note technique** : origine de chaque alerte (réelle ou fausse) journalisée server-side avec l'identité de l'émetteur, jamais révélée en direct aux autres joueurs.

### 6.18 Le sondeur menteur
**Concept** : le traître répond malhonnêtement à un sondage de groupe pour fausser la perception collective.
**Déroulement** : le groupe répond à une série de questions rapides dont les résultats agrégés orientent une décision collective (ex : stratégie pour la manche suivante). Le traître répond délibérément à l'inverse de sa vraie opinion.
**Paramètres** : nombre de questions, visibilité des résultats individuels (anonyme ou nominatif), poids du sondage sur la décision finale.
**Résolution** : décision collective appliquée selon le résultat du sondage (potentiellement biaisé) ; un vote de démasquage séparé peut identifier le traître si les résultats sont incohérents avec son comportement observé.
**Note technique** : réponses individuelles stockées server-side avec identité du répondant (même en affichage anonyme), permettant une analyse de cohérence a posteriori.

### 6.19 Le pacte secret
**Concept** : deux traîtres se connaissent mutuellement mais ne doivent surtout pas être vus en train de collaborer publiquement.
**Déroulement** : deux joueurs reçoivent le rôle de traître et sont informés de l'identité de l'autre via un canal privé. Ensemble, ils doivent faire échouer une tâche collective standard sans jamais échanger publiquement de façon suspecte (le chat public reste journalisé pour le vote final).
**Paramètres** : type de tâche collective, durée de la tâche, durée du vote final.
**Résolution** : tâche échouée et aucun des deux démasqué = bonus commun aux traîtres ; traître(s) démasqué(s) = éliminé(s).
**Note technique** : canal privé entre les deux traîtres géré comme sous-room dédiée invisible aux autres joueurs ; chat public journalisé intégralement pour l'analyse du vote.

### 6.20 Le remplaçant
**Concept** : le traître échange secrètement sa fiche d'objectif avec celle d'un autre joueur, à son insu.
**Déroulement** : chaque joueur reçoit une fiche d'objectif individuel à réaliser. Le traître dispose d'une action unique lui permettant d'échanger sa fiche avec celle d'un autre joueur de son choix, sans que ce dernier en soit informé, avant la fin de la phase de préparation.
**Paramètres** : durée de la phase de préparation, nombre d'échanges autorisés (1 par défaut), moment limite pour échanger.
**Résolution** : chaque joueur est évalué sur la fiche qu'il détient réellement au moment de la validation (potentiellement celle d'un autre) ; le joueur lésé peut voter pour démasquer le traître en fin de manche s'il soupçonne l'échange.
**Note technique** : fiches et propriétaire réel suivis en room state à tout moment (mise à jour lors de l'échange) ; le joueur floué ne reçoit aucune notification client de l'échange, pour préserver le secret jusqu'à la résolution.

---

Fin du catalogue — 120 jeux (6 catégories × 20). Les sections 1 à 6 partagent toutes la même architecture de room (état géré côté serveur, timers serveur, RNG loguée), ce qui permet de les généraliser facilement dans `game-engine` comme des familles de mini-jeux paramétrables plutôt que 120 implémentations isolées.


---

## FILE: `docs/deep-research-report.md`

# Cahier des charges technique V1 pour une plateforme web de sessions de jeu multijoueur

## Résumé exécutif

La V1 doit être conçue comme une **plateforme web de sessions payantes autonomes**, et non comme un jeu d’argent, un pari, ni un “grand tournoi global” avec redistribution finale unique. Le socle métier déjà stabilisé dans vos documents internes est cohérent avec cette orientation : `GameSession` comme unité économique indépendante, paiement par session, wallet interne non retirable en V1, ledger obligatoire, moteur de jeu séparé du temps réel, WhatsApp non critique, et vérité durable portée par PostgreSQL/Prisma plutôt que par le client ou Colyseus. fileciteturn0file0 fileciteturn0file2 fileciteturn0file3

La recommandation d’architecture la plus robuste pour cette V1 est la suivante : **Next.js** pour les surfaces web publiques, joueur et admin ; **Hono** pour l’API HTTP, les middlewares de sécurité, la validation et les webhooks ; **Colyseus** pour les rooms, le state sync, les timers live perçus et la reconnexion ; **Prisma/PostgreSQL** pour les transactions critiques et la persistance réglementaire/audit ; **Redis/BullMQ** pour la présence inter-processus, les deadlines, la récupération sur incident et les workers différés. Cette séparation correspond à la fois aux contraintes de vos documents internes et aux capacités recommandées par les documentations officielles de Next.js, Colyseus, Prisma, Redis et BullMQ. citeturn22view0turn22view1turn21view0turn13view0turn14view1turn15view1turn15view3turn3view7 fileciteturn0file0

Les trois décisions les plus importantes pour la production sont les suivantes. D’abord, **toute valeur critique doit être recalculée côté serveur** : prix, totaux, capacité restante, statuts, scores, éliminations, gains, soldes et transitions d’état. Ensuite, **toute mutation sensible doit être transactionnelle, idempotente et auditée** : confirmation de paiement, débit wallet, check-in, clôture de round, distribution de gains, ajustement admin. Enfin, **les workflows doivent être modélisés comme des machines d’état explicites**, car OWASP recommande d’imposer les workflows côté serveur, de retraiter les valeurs de sécurité côté serveur, de prévenir les race conditions et de tester explicitement les abus métier. citeturn12view2turn21view3turn21view0turn3view7turn19view0

Le cadrage conformité doit rester prudent. Vos documents internes identifient déjà le risque principal : une compétition payante avec gains peut changer de qualification juridique selon le pays, l’importance du hasard, le mécanisme de redistribution et la possibilité ou non de retrait en argent réel. Pour cette raison, la V1 doit **bloquer tout retrait monétaire**, traiter le wallet comme **crédit interne non retirable**, limiter ou exclure les mécaniques où le hasard domine, rendre les calculs et les journaux de résolution contestables/auditables, et exposer des CGU/règles/règles de remboursement avant mise en production publique. fileciteturn0file2 fileciteturn0file16

## Cadre de conception et architecture cible

Le périmètre fonctionnel V1 est bien posé par vos 15 branches : acquisition, auth, profil, admin config, inscription, paiement Fapshi, wallet/ledger, lobby, live temps réel, game engine, catalogue de mini-jeux, résultats/crédits, dashboard admin, WhatsApp, sécurité/conformité. La lecture la plus saine de ce périmètre consiste à considérer que certaines valeurs sont **paramétrables et encore ouvertes** : frais provider réels, délais de check-in, fenêtre de reconnexion, politique de no-show, période de contestation, nombre de gagnants par défaut, règles exactes de remboursement. Le cahier des charges doit donc distinguer clairement ce qui est **verrouillé**, ce qui est **recommandé**, et ce qui est **à confirmer produit/légalement**. fileciteturn0file3

Le schéma applicatif recommandé pour V1 est le suivant.

```mermaid
flowchart TD
    A[Next.js Web] --> B[Hono API]
    A --> C[Colyseus Game Server]
    B --> D[(PostgreSQL via Prisma)]
    C --> D
    B --> E[(Redis)]
    C --> E
    F[BullMQ Worker] --> E
    F --> D
    B --> G[Fapshi]
    B --> H[WhatsApp Gateway optionnelle]
```

Cette séparation respecte les recommandations documentées. Next.js recommande de garder l’authentification, l’autorisation et la logique Data Access Layer dans des modules `server-only`, et de ne renvoyer au client que les données nécessaires à l’UI. Colyseus documente un modèle de room authoritative, un mécanisme de `Presence` local ou Redis selon l’échelle, un `clock` pour les timers live, et une reconnexion explicite via `allowReconnection()`. Prisma documente plusieurs styles transactionnels — nested writes, `$transaction([])`, interactive transactions et OCC — qui se prêtent bien à la séparation mutation HTTP / orchestration temps réel / workers. citeturn22view0turn11view3turn13view0turn14view1turn2view2turn21view1turn21view2turn11view5

Le choix de **sessions serveur** est le meilleur arbitrage V1 pour l’auth web, plutôt qu’un modèle “full JWT bearer partout”. Next.js distingue sessions stateless et database sessions, en notant que la session en base est plus sûre mais plus coûteuse, et recommande l’usage de cookies gérés côté serveur. OWASP recommande des cookies `HttpOnly`, `Secure` et `SameSite`, avec stratégie explicite plutôt que confiance dans les valeurs par défaut du navigateur. Pour un produit avec wallet, back-office, audit et rôles sensibles, le compromis recommandé est : **session ID chiffré en cookie + session en base + rotation au login/changement de privilège**. citeturn22view1turn22view2turn11view8turn11view7turn17view1

Le choix de **Redis Presence + PostgreSQL deadline + BullMQ delayed jobs** est, lui aussi, supérieur à une stratégie “tout en room memory” ou “tout en base”. Colyseus documente que `LocalPresence` suffit en mono-processus, mais que `RedisPresence` est requis en multi-processus/distribué. BullMQ documente les jobs différés et les `jobId` uniques comme mécanisme de non-duplication. PostgreSQL et Prisma documentent que les transactions critiques doivent être soit exécutées en isolation plus forte, soit rejouées avec retry contrôlé en cas de conflit. En pratique, cela permet d’avoir : **timer ressenti en live dans Colyseus**, **deadline officielle persistée en DB**, **filet de sécurité worker** si un process live tombe. citeturn13view0turn15view1turn15view3turn21view0turn11view6

Le tableau suivant synthétise les alternatives utiles pour l’auth web et la présence. Il s’agit d’une synthèse d’architecture fondée sur les docs officielles citées, et non d’une obligation normative de ces outils. citeturn22view1turn11view8turn13view0turn15view3turn21view0

| Sujet | Option | Avantages | Limites | Recommandation V1 |
|---|---|---|---|---|
| Gestion de session | Cookie signé/stateless | Simple, peu de lectures DB | Révocation plus complexe, contrôle multi-device plus limité | Non prioritaire |
| Gestion de session | Session DB + cookie ID chiffré | Révocation, traçabilité, contrôle admin et appareils | Plus de lectures/écritures | **Oui** |
| Gestion de session | JWT bearer pur | Pratique pour API tierces | Plus risqué côté navigateur, révocation délicate | Non recommandé en principal |
| Présence live | LocalPresence Colyseus | Très simple | Mono-processus | Dev seulement |
| Présence live | RedisPresence Colyseus | Multi-processus, pub/sub, K/V partagé | Redis obligatoire | **Oui** |
| Deadlines | Colyseus uniquement | Faible latence | Pas assez robuste au crash | Non |
| Deadlines | PostgreSQL + BullMQ | Durable, reprenable après incident | Plus de complexité | **Oui** |

## Principes transverses de modélisation et contrats techniques

Le **premier invariant** du système doit être monétaire : tous les montants sont stockés en **entiers XAF**, jamais en flottants. Toutes les proportions sont stockées en **basis points** (`bps`, 1/100 de pourcent), ce qui évite les erreurs binaires et simplifie l’audit. Sur cette base, les formules recommandées sont :

- `grossCollectionXaf = paidRegistrationsCount * entryFeeXaf`
- `estimatedFeesXaf = ceil(grossCollectionXaf * providerFeeBps / 10000)` pour l’estimation prudente avant settlement
- `netCollectionXaf = grossCollectionXaf - settledFeesXaf`
- `prizePoolXaf = floor(netCollectionXaf * prizePoolBps / 10000)`
- `organizationCommissionXaf = netCollectionXaf - prizePoolXaf`
- `winnerShareXaf[i] = floor(prizePoolXaf * winnerSplitBps[i] / 10000)`
- `roundingRemainderXaf = prizePoolXaf - sum(winnerShareXaf[])`

Le reliquat de division entière doit être affecté par une politique explicite et auditée : `FIRST_WINNER`, `LAST_WINNER`, `RESERVE_WALLET`, ou `ROLL_FORWARD_TO_PLATFORM_COMMISSION`. Cette règle est métier, pas purement technique, donc elle doit être configurable ou au minimum documentée publiquement. Les formules de collecte, net, prize pool et commission sont déjà cohérentes avec vos documents internes. fileciteturn0file0 fileciteturn0file13

L’exemple économique interne déjà validé reste une bonne **illustration** pour l’interface admin, sans devenir une hypothèse produit figée. Pour 20 joueurs à 1 000 XAF, avec 3 % de frais estimés et un split net 60/40, la collecte brute est de 20 000 XAF, les frais de 600 XAF, la collecte nette de 19 400 XAF, le prize pool de 11 640 XAF et la commission organisation de 7 760 XAF. Cet exemple doit apparaître dans l’admin comme **simulation**, jamais comme promesse externe si le barème réel de frais n’est pas encore contractuellement verrouillé. fileciteturn0file0

```mermaid
pie showData
    title Exemple illustratif de répartition d'une session
    "Prize pool" : 11640
    "Commission organisation" : 7760
    "Frais paiement estimés" : 600
```

Le **deuxième invariant** doit être workflow : toute feature sensible doit être une machine d’état serveur. OWASP recommande explicitement de réimposer côté serveur les valeurs de sécurité, de modéliser les workflows comme des state machines explicites, de rejeter les replays d’étapes terminées et de prévenir les races sur les opérations sensibles. Cela s’applique directement à `SessionRegistrationStatus`, `PaymentStatus`, `GameSessionStatus` et `RoundStatus`. citeturn12view2 fileciteturn0file0

Le **troisième invariant** doit être transactionnel. Prisma documente trois familles réellement utiles ici. Les **nested writes** pour des créations dépendantes atomiques. Le **`$transaction([])`** pour des écritures indépendantes à committer ensemble. Les **interactive transactions** pour les cas `read → validate → write` comme un débit wallet, un check de capacité ou une clôture de round. Prisma permet aussi de monter le niveau d’isolation à `Serializable`; PostgreSQL documente alors que l’application doit être prête à rejouer certaines transactions en cas de `serialization failure`. C’est exactement ce qu’il faut pour les sections les plus sensibles : réservation de place, paiement/wallet, distribution de gains, ajustements admin. citeturn21view1turn21view2turn21view0turn11view6

Un schéma de données minimal mais production-ready pour V1 peut être structuré ainsi.

```prisma
enum UserRole {
  PLAYER
  SUPPORT
  FINANCE
  ADMIN
  SUPER_ADMIN
}

enum GameSessionStatus {
  DRAFT
  PUBLISHED
  REGISTRATION_OPEN
  REGISTRATION_CLOSED
  WAITING_START
  LIVE
  PAUSED
  FINISHED
  CANCELLED
}

enum SessionRegistrationStatus {
  CREATED
  PAYMENT_PENDING
  PAID
  CHECKED_IN
  IN_ROOM
  ACTIVE
  ELIMINATED
  WINNER
  DISQUALIFIED
  REFUNDED
  CANCELLED
}

enum PaymentStatus {
  CREATED
  PENDING
  SUCCESS
  FAILED
  EXPIRED
  CANCELLED
  REFUNDED
}

enum LedgerDirection {
  DEBIT
  CREDIT
}

enum LedgerType {
  ENTRY_FEE
  PRIZE
  REFUND
  ADMIN_ADJUSTMENT
  PLATFORM_COMMISSION
}

model User {
  id              String   @id @default(cuid())
  email           String?  @unique
  phone           String?  @unique
  passwordHash    String
  role            UserRole @default(PLAYER)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  profile         PlayerProfile?
  authSessions    AuthSession[]
  auditLogs       AuditLog[] @relation("AuditActor")
}

model PlayerProfile {
  id                String   @id @default(cuid())
  userId            String   @unique
  nickname          String   @unique
  avatarUrl         String?
  sessionsPlayed    Int      @default(0)
  sessionsWon       Int      @default(0)
  user              User     @relation(fields: [userId], references: [id])
  wallet            Wallet?
}

model AuthSession {
  id              String   @id @default(cuid())
  userId          String
  expiresAt       DateTime
  revokedAt       DateTime?
  lastSeenAt      DateTime?
  ipHash          String?
  userAgentHash   String?
  user            User     @relation(fields: [userId], references: [id])
  @@index([userId, expiresAt])
}

model GameSession {
  id                   String             @id @default(cuid())
  slug                 String             @unique
  title                String
  visibility           String
  status               GameSessionStatus
  startsAt             DateTime
  registrationClosesAt DateTime?
  entryFeeXaf          Int
  minPlayers           Int
  maxPlayers           Int
  prizePoolBps         Int
  providerFeeBps       Int?
  configVersion        Int                @default(1)
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
  rounds               Round[]
  registrations        SessionRegistration[]
}

model SessionRegistration {
  id                 String                    @id @default(cuid())
  sessionId          String
  userId             String
  status             SessionRegistrationStatus
  seatVersion        Int                       @default(0)
  checkInAt          DateTime?
  paymentDeadlineAt  DateTime?
  createdAt          DateTime                  @default(now())
  updatedAt          DateTime                  @updatedAt
  session            GameSession               @relation(fields: [sessionId], references: [id])
  user               User                      @relation(fields: [userId], references: [id])
  payment            Payment?
  @@unique([sessionId, userId])
  @@index([sessionId, status])
}

model Payment {
  id                 String        @id @default(cuid())
  registrationId     String        @unique
  provider           String
  providerTransId    String?       @unique
  providerExternalId String?       @unique
  amountXaf          Int
  status             PaymentStatus
  providerPayload    Json?
  webhookReceivedAt  DateTime?
  settledAt          DateTime?
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt
  registration       SessionRegistration @relation(fields: [registrationId], references: [id])
}

model Wallet {
  id              String   @id @default(cuid())
  userId          String   @unique
  balanceXaf      Int      @default(0)
  version         Int      @default(0)
  user            User     @relation(fields: [userId], references: [id])
  entries         LedgerEntry[]
}

model LedgerEntry {
  id              String          @id @default(cuid())
  walletId        String
  type            LedgerType
  direction       LedgerDirection
  amountXaf       Int
  balanceAfterXaf Int
  referenceType   String
  referenceId     String
  idempotencyKey  String          @unique
  createdAt       DateTime        @default(now())
  wallet          Wallet          @relation(fields: [walletId], references: [id])
  @@index([walletId, createdAt])
}

model Round {
  id              String   @id @default(cuid())
  sessionId       String
  ordinal         Int
  miniGameKey     String
  configJson      Json
  deadlineAt      DateTime?
  createdAt       DateTime @default(now())
  session         GameSession @relation(fields: [sessionId], references: [id])
  @@unique([sessionId, ordinal])
}

model AuditLog {
  id              String   @id @default(cuid())
  actorId         String?
  action          String
  targetType      String
  targetId        String
  beforeJson      Json?
  afterJson       Json?
  reason          String?
  ipHash          String?
  userAgentHash   String?
  requestId       String?
  createdAt       DateTime @default(now())
  actor           User?    @relation("AuditActor", fields: [actorId], references: [id])
}
```

Ce noyau correspond à vos objets métier centraux, avec deux ajouts fortement recommandés pour la prod : `configVersion` pour l’OCC sur les modifications de session et `idempotencyKey` pour le ledger. Vos documents internes convergent déjà vers ce noyau (`User`, `PlayerProfile`, `GameSession`, `SessionRegistration`, `Payment`, `Wallet`, `LedgerEntry`, `Round`, `AuditLog`, etc.). Prisma documente l’usage d’un champ de version ou d’un timestamp comme jeton OCC, et l’usage de transactions interactives ou séquentielles selon le cas. fileciteturn0file0 fileciteturn0file2 citeturn11view5turn21view1

```mermaid
erDiagram
    User ||--o| PlayerProfile : has
    User ||--o{ AuthSession : owns
    User ||--o{ SessionRegistration : creates
    User ||--o| Wallet : owns
    Wallet ||--o{ LedgerEntry : contains
    GameSession ||--o{ SessionRegistration : accepts
    GameSession ||--o{ Round : contains
    SessionRegistration ||--o| Payment : pays
```

Les conventions API doivent être homogènes sur tout le système. Recommandation : `application/json`, `X-Request-Id`, `Idempotency-Key` sur toutes les mutations à effet financier, réponses d’erreur structurées `{ code, message, details, retryable }`, et stock de validation côté Hono avec `validator()` ou `zValidator()`. Hono documente la validation ciblée par zone (`param`, `query`, `json`, `form`) et le middleware `requestId`; ses helpers cookie et `secureHeaders()` couvrent les besoins de base HTTP. citeturn17view2turn17view3turn23view1turn3view0turn17view1

L’exemple suivant est une base saine pour l’API Hono.

```ts
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { secureHeaders } from 'hono/secure-headers'
import { requestId } from 'hono/request-id'
import { setSignedCookie } from 'hono/cookie'

const app = new Hono()

app.use('*', requestId())
app.use('*', secureHeaders())

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

app.post(
  '/v1/auth/login',
  zValidator('json', loginSchema),
  async (c) => {
    const body = c.req.valid('json')
    // vérifier credentials en DAL/server-only
    const sessionId = 'sess_123'
    await setSignedCookie(c, '__Host-session', sessionId, process.env.SESSION_SECRET!, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      prefix: 'host',
    })
    return c.json({ ok: true, requestId: c.get('requestId') }, 200)
  }
)
```

Cet exemple est directement aligné avec les docs Hono pour `secureHeaders`, `requestId`, `cookie helper` et `zValidator`. citeturn3view0turn23view1turn17view1turn17view3

Côté Next.js, la doc officielle recommande aussi de garder la logique HTTP et d’accès aux données dans des modules serveur dédiés, typiquement `server-only`, avec des Server Actions fines qui délèguent au Data Access Layer. Cela correspond parfaitement à votre besoin de séparer **pages/UI**, **API Hono**, et **transactions Prisma**. citeturn22view0turn11view3

```ts
// app/lib/session.ts
import 'server-only'
import { cookies } from 'next/headers'

export async function writeSessionCookie(session: string, expiresAt: Date) {
  const cookieStore = await cookies()
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: true,
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}
```

Cet usage est conforme au guide officiel Next.js sur l’authentification et aux recommandations OWASP sur les attributs des cookies de session. citeturn22view2turn11view8

## Spécification détaillée par feature

**Acquisition, landing et catalogue public**

_Règles métier et calculs._ Le catalogue public ne doit exposer que les sessions `PUBLIC`; les sessions `UNLISTED` doivent être consultables par URL directe mais absentes des listings; les sessions `PRIVATE` doivent exiger une invitation, une allowlist ou un code d’accès. Les indicateurs affichés côté catalogue doivent être dérivés côté serveur : `placesRemaining = max(0, maxPlayers - activeRegistrationsCount)`, où `activeRegistrationsCount` doit exclure les `CANCELLED` et `REFUNDED`, et inclure au minimum `PAYMENT_PENDING` encore valides et `PAID` selon la politique de réservation choisie. Le wording public doit rester celui d’une compétition structurée et non d’un pari. fileciteturn0file4 fileciteturn0file0

_Modèles, API et flux._ Les modèles concernés sont `GameSession` et un éventuel `SessionInvite`. Contrats proposés : `GET /v1/public/sessions`, `GET /v1/public/sessions/:slug`, `POST /v1/public/sessions/:slug/access-code`. Réponse exemple : `{ "slug":"night-drop-2026-07-22", "status":"REGISTRATION_OPEN", "entryFeeXaf":1000, "placesRemaining":7, "startsAt":"2026-07-22T20:00:00+01:00" }`. Les erreurs typiques sont `404_SESSION_NOT_VISIBLE`, `410_SESSION_CLOSED`, `423_ACCESS_CODE_REQUIRED`. Les tests doivent couvrir SEO/metadata, filtrage de visibilité, calcul de `placesRemaining`, et absence de fuite d’informations pour `PRIVATE`. Côté monitoring : `catalogue_page_view`, `session_detail_view`, `cta_register_click`, `share_link_open_rate`, alerte si `GET /public/sessions` > 1 % d’erreurs sur 5 minutes. Next.js convient bien à ces pages publiques, au rendu metadata et aux redirections conditionnelles. citeturn22view1turn11view3 fileciteturn0file4

**Authentification et gestion de compte**

_Règles métier et calculs._ Le joueur choisit son mot de passe; les admins utilisent email + mot de passe dès V1; la 2FA admin reste ouverte mais recommandée post-MVP si la pression d’exploitation augmente. Les mots de passe ne doivent jamais être stockés en clair. OWASP recommande des fonctions de hachage lentes, en priorité Argon2id, puis scrypt, puis bcrypt/PBKDF2 selon contraintes. Les sessions navigateur doivent être gérées par cookie `HttpOnly`, `Secure`, `SameSite`, et invalidées/régénérées lors du login, du logout, du reset et du changement de privilège. fileciteturn0file5 citeturn22view3turn22view1turn11view8turn19view0

_Modèles, API et flux._ Les modèles centraux sont `User`, `PlayerProfile`, `AuthSession`, `PasswordResetToken` si vous l’ajoutez. Contrats recommandés : `POST /v1/auth/register`, `POST /v1/auth/login`, `POST /v1/auth/logout`, `POST /v1/auth/forgot-password`, `POST /v1/auth/reset-password`, `GET /v1/auth/me`. `POST /v1/auth/register` doit refuser les doublons d’email/téléphone, créer `User`, `PlayerProfile`, et une `AuthSession` dans une même transaction logique. Exemple de réponse : `{ "userId":"usr_...", "role":"PLAYER", "sessionExpiresAt":"..." }`. Les erreurs communes sont `409_EMAIL_ALREADY_USED`, `429_LOGIN_RATE_LIMITED`, `401_INVALID_CREDENTIALS`, `403_ACCOUNT_DISABLED`. Les contrôles sécurité doivent appliquer le principe du moindre privilège et du “deny by default”, avec autorisation vérifiée sur chaque requête, pas seulement au niveau UI. Les tests doivent couvrir fixation de session, vol de cookie, reset token expiré, élévation horizontale et rotation de session sur changement de rôle. Métriques : login success rate, refresh rate, password-reset abuse, invalid-session rate. citeturn19view0turn11view8turn17view1turn22view2turn23view2 fileciteturn0file5

**Profil joueur et historique**

_Règles métier et calculs._ Les statistiques visibles ne doivent jamais être saisies manuellement : elles doivent être dérivées depuis les résultats officiels persistés. Exemples : `sessionsPlayed = count(GameResult where finalStatus in [FINISHED, ELIMINATED, WINNER])`, `sessionsWon = count(GameResult where registrationStatus = WINNER)`, `winRate = sessionsWon / max(1, sessionsFinished)`, `avgFinalRank = sum(finalRank)/sessionsFinished`. Les sessions annulées, remboursées ou incomplètes doivent être exclues ou affichées séparément. Les “credits gagnés” visibles au profil doivent être dérivés du ledger, pas d’un champ décoratif. fileciteturn0file0 fileciteturn0file2

_Modèles, API et flux._ Modèles : `PlayerProfile`, `GameResult`, `RoundResult`, `Wallet`. Contrats : `GET /v1/me/profile`, `PATCH /v1/me/profile`, `GET /v1/me/history`, `GET /v1/me/stats`. Exemple : `{ "nickname":"Kora221", "sessionsPlayed":12, "sessionsWon":2, "winRate":0.1667, "walletBalanceXaf":6400 }`. Les risques principaux sont l’exposition excessive de données, l’incohérence statistique et la fuite de données privées. La stratégie recommandée est de distinguer strictement **profil privé complet** et **profil public minimal**. Next.js recommande de ne retourner au client que ce dont l’UI a besoin, et de garder les validations auth/authz en DAL serveur. Tests : recomputation stats après annulation/refund, contrôle de visibilité, cohérence avec `GameResult`. Métriques : latence `GET /me/profile`, mismatch stats detector, avatars upload failures si ajoutés. citeturn22view0turn11view3

**Configuration des sessions admin**

_Règles métier et calculs._ Une session doit naître en `DRAFT`, puis passer à `PUBLISHED`, `REGISTRATION_OPEN`, etc. Les champs économiques doivent respecter des invariants stricts : `minPlayers >= 2`; `maxPlayers >= minPlayers`; `entryFeeXaf >= minimumProviderAmount`; `0 <= prizePoolBps <= 10000`; `sum(winnerSplitBps) = 10000`; `startsAt > now`; `registrationClosesAt <= startsAt`. La projection de rentabilité affichée à l’admin doit recalculer en temps réel `grossCollectionXaf`, `estimatedFeesXaf`, `netCollectionXaf`, `prizePoolXaf`, `organizationCommissionXaf`, `minimumViableRevenueXaf` et `maximumProjectedRevenueXaf`. Une fois qu’une première inscription payée existe, les champs économiques et les règles de distribution doivent devenir **immutables** ou n’être modifiables que via versioning + audit + blocage des nouvelles inscriptions le temps de republier. fileciteturn0file6 fileciteturn0file0

_Modèles, API et flux._ Modèles : `GameSession`, `Round`, `MiniGameTemplate`, `AuditLog`. Contrats : `POST /v1/admin/sessions`, `PATCH /v1/admin/sessions/:id`, `POST /v1/admin/sessions/:id/publish`, `POST /v1/admin/sessions/:id/open-registration`, `POST /v1/admin/sessions/:id/cancel`. Exemple de payload de création : `{ "title":"Night Drop", "entryFeeXaf":1000, "minPlayers":10, "maxPlayers":20, "prizePoolBps":6000, "winnerSplitBps":[10000], "startsAt":"...", "rounds":[...] }`. Les conflits de modification doivent utiliser soit OCC avec `configVersion`, soit une transaction `Serializable` si l’écran admin est concurrent. Prisma documente l’OCC par champ `version`, et PostgreSQL documente les erreurs à rejouer en `RepeatableRead/Serializable`. Les tests doivent couvrir modification concurrente, somme des pourcentages, publication d’une session invalide, et audit des changements. Alertes : publication impossible, marge négative projetée, changement admin sans `reason`, taux d’échec `PATCH /admin/sessions` anormal. citeturn11view5turn21view0turn11view6turn19view0 fileciteturn0file6

**Inscription à une session**

_Règles métier et calculs._ La règle centrale est l’unicité : un même utilisateur ne doit pas avoir deux inscriptions actives à la même session. `SessionRegistration` doit suivre un workflow contraint : `CREATED → PAYMENT_PENDING → PAID → CHECKED_IN → IN_ROOM → ACTIVE`, avec branches alternatives `CANCELLED`, `REFUNDED`, `DISQUALIFIED`. Si vous réservez une place avant paiement, il faut une `paymentDeadlineAt`; si la deadline expire, la place est relâchée. Le calcul de capacité doit être transactionnel. Deux approches sont viables : verrou applicatif léger + OCC sur compteur/version, ou transaction `Serializable` lors de la création d’inscription/réservation. OWASP rappelle que les workflows et les races sur opérations sensibles doivent être explicitement protégés. fileciteturn0file0 citeturn12view2turn21view0turn11view5

_Modèles, API et flux._ Modèles : `SessionRegistration`, `Payment`, `AuditLog`. Contrats : `POST /v1/sessions/:sessionId/registrations`, `GET /v1/registrations/:id`, `DELETE /v1/registrations/:id`. Réponse de création : `{ "registrationId":"reg_...", "status":"PAYMENT_PENDING", "paymentDeadlineAt":"..." }`. Erreurs : `409_ALREADY_REGISTERED`, `409_SESSION_FULL`, `423_REGISTRATION_CLOSED`, `410_SESSION_CANCELLED`. Les tests clés sont : double-clic sur “join”, deux utilisateurs pour la dernière place, expiration worker, relance après callback Fapshi tardif, annulation d’une session avec inscriptions pendantes. Métriques : `registration_create_success`, `seat_contention_rate`, `payment_pending_timeout_count`, `duplicate_registration_blocked_count`. fileciteturn0file3

**Paiement Fapshi**

_Règles métier et calculs._ Vos notes internes issues de la documentation officielle Fapshi indiquent que l’API d’initiation de paiement retourne un `link` de paiement hébergé et un `transId`, que le lien expire après 24 h, que le webhook doit être sécurisé via l’en-tête `x-wh-secret`, et qu’il faut privilégier une stratégie **webhook-first** avec polling de réconciliation seulement en secours. Elles mentionnent aussi un minimum de 100 XAF pour l’initiation. Dans le cahier des charges V1, cela implique : `Payment` créé en `PENDING`; `providerExternalId` et `providerTransId` uniques; validation du webhook par secret + idempotence; matérialisation de la confirmation de paiement uniquement via l’API et PostgreSQL, jamais via Colyseus. fileciteturn0file7 fileciteturn0file2

_Modèles, API et flux._ Contrats recommandés : `POST /v1/payments/fapshi/initiate`, `POST /v1/payments/fapshi/webhook`, `GET /v1/payments/:id/status`. Exemple d’initiation : le client envoie `{ "registrationId":"reg_..." }`; l’API répond `{ "paymentId":"pay_...", "provider":"FAPSHI", "status":"PENDING", "checkoutUrl":"...", "providerTransId":"..." }`. Le webhook doit traiter les événements en moins de quelques secondes, répondre `200` rapidement, puis déléguer le travail lourd à une transaction courte ou à un worker. Échecs à traiter : webhook replayé, webhook avant persistance locale, paiement réussi pour inscription expirée, session annulée pendant paiement, webhook absent, statut provider contradictoire. Pattern recommandé : transaction `Serializable`, verrou logique par `providerTransId`, `Idempotency-Key` et event outbox. BullMQ apporte le filet de sécurité pour la réconciliation différée; ses `jobId` uniques permettent d’éviter de planifier plusieurs fois la même réconciliation métier. citeturn21view0turn15view3turn12view2turn23view1 fileciteturn0file7

```mermaid
sequenceDiagram
    participant U as Joueur
    participant W as Next.js Web
    participant A as Hono API
    participant F as Fapshi
    participant DB as PostgreSQL
    participant Q as BullMQ

    U->>W: Choisit une session
    W->>A: POST /payments/fapshi/initiate
    A->>DB: create Payment(PENDING)
    A->>F: initier transaction
    F-->>A: link + transId
    A->>DB: save providerTransId
    A-->>W: checkoutUrl
    U->>F: paie
    F-->>A: webhook status
    A->>A: verify x-wh-secret + idempotence
    A->>DB: tx -> Payment.SUCCESS + Registration.PAID
    A->>Q: enqueue reconciliation/notifications
    A-->>F: 200 OK
```

**Wallet et ledger**

_Règles métier et calculs._ Le wallet V1 doit être un **crédit interne non retirable**. Cela signifie trois choses. D’abord, `balanceXaf` n’est qu’un cache de lecture ; la vérité comptable reconstituable réside dans `LedgerEntry`. Ensuite, chaque mutation doit produire exactement une entrée de ledger avec `direction`, `amountXaf`, `balanceAfterXaf`, `referenceType`, `referenceId`, `idempotencyKey`. Enfin, l’équilibre doit rester vérifiable : `wallet.balanceXaf = Σ(credits) - Σ(debits)` sur les écritures `POSTED`. Les débits insuffisants doivent être refusés en transaction interactive, et le pattern recommandé est `read balance → verify >= amount → write ledger + update wallet`. Prisma documente précisément ce type de transaction interactive, et OWASP recommande des contrôles spécifiques sur les features qui distribuent de la valeur. fileciteturn0file8 citeturn21view1turn12view3turn12view4

_Modèles, API et flux._ Contrats clés : `GET /v1/wallet`, `GET /v1/wallet/ledger`, `POST /v1/wallet/pay-registration`, `POST /v1/admin/wallet/adjustments`. Exemple de paiement interne : `{ "registrationId":"reg_..." }` → `{ "status":"PAID", "walletBalanceXaf":3400, "ledgerEntryId":"led_..." }`. Erreurs : `409_INSUFFICIENT_FUNDS`, `409_WALLET_FROZEN`, `409_LEDGER_DUPLICATE`, `403_WITHDRAWALS_DISABLED`. Les tests critiques sont : double-débit concurrent, adjustment admin sans raison, refund après consommation d’un crédit, recomputation de balance à partir du ledger, et alignement `wallet.balanceXaf` avec le total reconstitué. Alertes : mismatch cash-versus-ledger, balance négative, duplicate idempotency key, spike d’ajustements admin. fileciteturn0file8

```ts
const result = await prisma.$transaction(async (tx) => {
  const wallet = await tx.wallet.findUniqueOrThrow({
    where: { userId },
  })

  if (wallet.balanceXaf < amountXaf) {
    throw new Error('INSUFFICIENT_FUNDS')
  }

  const nextBalance = wallet.balanceXaf - amountXaf

  await tx.wallet.update({
    where: { id: wallet.id, version: wallet.version },
    data: { balanceXaf: nextBalance, version: { increment: 1 } },
  })

  await tx.ledgerEntry.create({
    data: {
      walletId: wallet.id,
      type: 'ENTRY_FEE',
      direction: 'DEBIT',
      amountXaf,
      balanceAfterXaf: nextBalance,
      referenceType: 'SessionRegistration',
      referenceId: registrationId,
      idempotencyKey,
    },
  })

  return { nextBalance }
}, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
```

Ce snippet combine transaction interactive, OCC et isolation forte, conformément aux docs Prisma/PostgreSQL. citeturn21view1turn11view5turn11view6

**Lobby, check-in et préparation**

_Règles métier et calculs._ Seuls les joueurs `PAID` doivent accéder au lobby. Le check-in fait passer `PAID → CHECKED_IN`. Le démarrage peut être conditionné soit au `minPlayers` de joueurs payés, soit — plus strictement et plus cohérent pour le live — au `minPlayers` de joueurs effectivement check-in. Ce choix reste ouvert, mais techniquement la règle doit être unique et visible. Les délais ouverts sont au minimum : ouverture du lobby, deadline de check-in, éventuelle grace period après `startsAt`, et politique `NO_SHOW`. Si vous implémentez un no-show cost, il doit être explicitement documenté et non inféré de l’absence. fileciteturn0file9

_Modèles, API et flux._ Contrats : `GET /v1/sessions/:id/lobby`, `POST /v1/registrations/:id/check-in`, `POST /v1/sessions/:id/ready`, `POST /v1/admin/sessions/:id/start`. La présence courte peut être suivie via Redis (`SADD/SCARD` sur des ensembles de présence ou via Presence Colyseus), mais le statut officiel doit être persisté en base. Colyseus permet ensuite la réservation/reconsommation de seat pour l’entrée en room, tandis que BullMQ programme les deadlines de démarrage/annulation. Les tests doivent couvrir late check-in, reconnection dans le lobby, seuil min non atteint, annulation automatique, et incohérence entre présence Redis et statut DB. Métriques : `lobby_join_rate`, `checkin_success_rate`, `no_show_rate`, `start_delay_seconds`. Redis et Colyseus documentent tous deux des primitives adaptées à ces usages : ensembles, pub/sub et `reserveSeatFor()`. citeturn16view1turn16view3turn13view0turn14view3turn15view1 fileciteturn0file9

**Session live temps réel**

_Règles métier et calculs._ Le live doit être **authoritative server** : le client ne propose que des inputs, jamais des résultats. La recommandation V1 est d’utiliser **une room Colyseus par `GameSession`**, avec une `phase` interne (`LOBBY`, `BRIEFING`, `ROUND_ACTIVE`, `RESOLVING`, `RESULTS`, etc.) plutôt qu’une room physique par round dès le départ. Cela réduit la complexité de reconnexion et garde un `sessionId` de room stable pour les joueurs. Chaque round garde néanmoins une identité persistée en base. Le timer ressenti est géré par `this.clock`; la deadline officielle est `Round.deadlineAt` en base; BullMQ clôture en secours si le process live meurt. Colyseus documente le `clock`, `setTimeout`, la reconnexion avec `allowReconnection(client, seconds)`, et le `Presence` Redis pour le multi-processus. citeturn14view1turn2view2turn13view0 fileciteturn0file10

_Modèles, API et flux._ Contrats : `POST /v1/live/sessions/:id/reservation`, `POST /v1/live/sessions/:id/actions`, `GET /v1/live/sessions/:id/state-snapshot`. Le `reservation` endpoint doit vérifier auth, statut de session, statut de registration, et retourner soit un seat reservation Colyseus, soit un token de bridging propre. Les erreurs majeures sont `403_NOT_CHECKED_IN`, `409_SESSION_NOT_LIVE`, `409_RECONNECT_WINDOW_EXPIRED`, `410_ROUND_ALREADY_CLOSED`. Les tests doivent couvrir reconnexion après switch réseau, drop pendant résolution, host process crash, pause/reprise admin, et divergence état room / état DB. Les métriques critiques sont `room_active_count`, `reconnect_success_rate`, `drop_rate`, `round_close_lag_ms`, `desync_repair_count`. Colyseus documente aussi que l’on peut restreindre les méthodes exposées côté matchmaker pour empêcher le client de créer arbitrairement des rooms. citeturn14view5turn14view4turn2view2

```ts
onDrop(client: Client) {
  this.allowReconnection(client, 30)
  const player = this.state.players.get(client.sessionId)
  if (player) player.connected = false
}
```

Ce pattern suit la documentation officielle de reconnexion Colyseus. citeturn2view2

**Game engine et résolution des rounds**

_Règles métier et calculs._ Le moteur doit être séparé de Colyseus et ne dépendre ni du rendu du client ni de la room en tant que telle. La sortie normale d’un mini-jeu doit être une structure déterministe du type : `{ scores, ranks, qualifiedIds, eliminatedIds, tieGroups, evidence, seedLog }`. La session applique ensuite `winnersCount`, `eliminationCount`, `qualificationPolicy`, et la transition suivante. Cela suit exactement vos documents internes : le mini-jeu produit un classement ou des statuts, et la couche session décide qui passe ou sort. Toutes les résolutions doivent être **rejouables** à partir de la config, des inputs validés et du `seedLog` si RNG autorisé. fileciteturn0file11 fileciteturn0file1 fileciteturn0file0

_Modèles, API et flux._ Modèles : `Round`, `RoundResult`, `Elimination`, `GameEvent` ou `OutboxEvent` recommandé. Contrats côté API interne : `POST /internal/rounds/:id/close`, `POST /internal/rounds/:id/replay`, `POST /internal/sessions/:id/finalize`. Les tests doivent être plus exigeants que pour les autres features : unitaires sur tous les resolvers; tests de propriétés sur les invariants de ranking; tests de simulation multi-joueurs; tests de répétabilité pour la RNG; tests de concurrence entre timer close et dernier input. OWASP rappelle que les règles métier et les courses critiques doivent être testées explicitement avec un état d’esprit adversarial. Métriques : `round_resolve_duration_ms`, `tie_rate`, `replay_mismatch_count`, `late_input_rejected_count`. Prisma et PostgreSQL imposent ici un point ferme : la finalisation de round doit être transactionnelle. citeturn12view2turn21view1turn11view6

**Catalogue de mini-jeux configurables**

_Règles métier et calculs._ Le catalogue de 120 mini-jeux ne doit pas être implémenté comme 120 systèmes isolés. Chaque mini-jeu doit devenir une **définition paramétrable** : `key`, `family`, `playerMode`, `configSchema`, `allowedActions`, `stateFactory`, `resolver`, `antiCheatPolicy`. Les familles déjà posées dans vos documents — solo, duel, alliance forcée, équipe libre, survie collective, rôle caché — sont le bon niveau d’abstraction pour la V1. Le MVP doit privilégier 3 à 5 mini-jeux où le hasard est faible, l’explication simple, la télémétrie claire et les règles auditables. Vos fichiers catalogue insistent déjà sur les timers serveur, la validation serveur, la non-exposition prématurée des réponses sensibles et la correction de latence lorsque nécessaire. fileciteturn0file1 fileciteturn0file12

_Modèles, API et flux._ Modèles : `MiniGameDefinition`, `MiniGameVersion`, `Round.configJson`. Contrats : `GET /v1/admin/minigames`, `POST /v1/admin/minigames/validate-config`, et côté game-server une interface interne `start(definition, config, participants)` puis `submitAction(action)`. Les jeux recommandés pour un MVP stable sont : un solo de mémoire/séquence, un duel de réaction, un round de survie à zones sûres, un mini-jeu coopératif simple, et un rôle caché très allégé. Les tests doivent valider le schéma de config, l’ordre des inputs, les timeouts, la résolution reproductible et les protections anti auto-click / double submit. Les alertes utiles sont : `minigame_runtime_exception`, `answer_leak_detected`, `abnormal_client_action_rate`, `rng_family_usage_count` pour suivre l’exposition au hasard. Colyseus Schema est bien adapté au state sync de ces définitions, avec ses types synchronisables et collections dédiées. citeturn14view0turn14view1

**Résultats, gains et crédits**

_Règles métier et calculs._ La finalisation d’une session doit suivre une règle simple : **un seul point de clôture officielle**, puis **une seule distribution idempotente**. Les gains sont calculés à partir de la collecte nette et de la clé de répartition configurée, puis crédités au wallet. La commission organisation doit être tracée, même si elle ne descend pas dans un wallet joueur. Si plusieurs gagnants existent, la somme des parts (`winnerSplitBps`) doit être exactement 10 000 bps. En cas d’égalité non prévue, la session doit soit appliquer une `tieBreakPolicy`, soit étendre la liste de gagnants, soit passer en `CONTESTABLE`. Rien ne doit distribuer de gain “au fil de l’eau” avant la finalisation officielle si cela change le résultat économique final. fileciteturn0file13 fileciteturn0file0

_Modèles, API et flux._ Modèles : `GameResult`, `PrizeDistribution`, `Wallet`, `LedgerEntry`, `AuditLog`. Contrats : `POST /internal/sessions/:id/finalize`, `GET /v1/sessions/:id/results`, `POST /v1/admin/sessions/:id/recompute-results`. Les cas d’échec sont redoutables : double-credit, session finalisée deux fois, distribution partielle, worker crash entre deux gagnants, correction manuelle post-factum. Le pattern recommandé est : transaction DB courte de passage en `FINISHED` + création d’événements/outbox + distribution worker idempotente par `idempotencyKey` unique par gagnant et par session. BullMQ documente justement les jobs différés et la déduplication par `jobId`, ce qui s’adapte bien à un credit prize par `jobId = sessionId:winnerId:prize:v1`. Métriques : `session_finalize_ms`, `prize_credit_jobs`, `ledger_entries_per_finalize`, `credit_retry_count`, alerte sur tout `wallet.balanceXaf < 0` ou `duplicate prize idempotency`. citeturn15view3turn21view0 fileciteturn0file13

**Dashboard admin, audit et support**

_Règles métier et calculs._ Les rôles V1 minimaux devraient être `SUPPORT`, `FINANCE`, `ADMIN`, `SUPER_ADMIN`, avec séparation claire des capacités. `SUPPORT` peut lire et annoter; `FINANCE` peut réconcilier/refund selon workflow; `ADMIN` peut créer/publier/pauser/annuler; `SUPER_ADMIN` peut exécuter des corrections exceptionnelles. Le principe OWASP ici est celui du **least privilege**, du **deny by default** et de la vérification d’autorisation sur chaque action. Toute action manuelle touchant paiement, wallet, résultats, exclusion, session live, ou visibilité doit exiger `reason` et produire `AuditLog` avec avant/après. citeturn19view0 fileciteturn0file14

_Modèles, API et flux._ Contrats : `GET /v1/admin/sessions`, `GET /v1/admin/payments`, `POST /v1/admin/payments/:id/reconcile`, `POST /v1/admin/registrations/:id/refund`, `POST /v1/admin/wallet/adjustments`, `GET /v1/admin/audit`. Les opérations interdites en V1 devraient être explicites : modification silencieuse d’un résultat fini, écrasement direct d’un `balanceXaf`, suppression d’audit, bypass de rôle par UI seul. Tests : autorisation positive/négative par rôle, journal sync avec `requestId`, recherche d’audit par cible, résistance aux actions répétées. Métriques : `admin_mutation_count_by_role`, `manual_reconciliation_count`, `refund_volume_xaf`, `audit_write_failure`. Hono `requestId` et Next.js DAL côté serveur aident ici à garder la chaîne de causalité propre. citeturn23view1turn22view0 fileciteturn0file14

**WhatsApp et notifications**

_Règles métier et calculs._ WhatsApp ne doit jamais être un point de défaillance critique. La règle métier est claire dans vos documents : si le canal WhatsApp tombe, la plateforme doit continuer. En V1, la version la plus simple et sûre est : web app + éventuelles notifications in-app/email; liens partageables manuels pour les communautés; gateway WhatsApp automatisée seulement si un cadre d’opt-in, de template et de support opérationnel existe. Les messages transactionnels prioritaires sont : inscription créée, paiement confirmé, rappel avant check-in, rappel avant start, résultat publié. Les messages marketing doivent être séparés, consentis et désactivables. fileciteturn0file15 fileciteturn0file0

_Modèles, API et flux._ Modèles : `NotificationPreference`, `NotificationLog`, `MessageTemplate`, `OutboundMessage`. Contrats : `POST /v1/notifications/preferences`, `POST /internal/notifications/send`, `POST /webhooks/whatsapp` si gateway. Les workers BullMQ sont adaptés pour les rappels planifiés avec `delay`, et leurs `jobId` uniques évitent de renvoyer plusieurs fois le même rappel. Tests : opt-in/out, déduplication des messages, template introuvable, envoi échoué, absence de fuite des résultats à des tiers. Métriques : `notification_send_rate`, `delivery_failure_rate`, `duplicate_message_prevented`, `time_to_reminder_before_start`. citeturn15view1turn15view3 fileciteturn0file15

**Sécurité, anti-triche et conformité**

_Règles métier et calculs._ Cette feature est transversale. Les règles à figer dans le cahier des charges sont les suivantes : le client n’est jamais source de vérité pour timer, score, RNG, paiement, élimination, gain ou classement; toute valeur de sécurité doit être recalculée serveur; les features distributrices de valeur doivent avoir leurs propres rate limits, caps et journaux; la sécurité des workflows prévaut sur la fluidité si les deux entrent en conflit. OWASP insiste sur la ré-derivation serveur des prix/totaux/permissions, sur les state machines explicites, sur les protections contre les races, sur les limites par feature et sur les signaux d’identification plus stables que l’email seul pour contrer le multi-compte. citeturn12view2turn12view3turn12view4turn19view0turn11view8 fileciteturn0file16

_Modèles, API et flux._ Ajouts recommandés : `FraudSignal`, `DeviceFingerprintHash`, `OutboxEvent`, `AbuseCaseLog`, `ModerationAction`. Contrats : `POST /internal/fraud/report`, `POST /v1/support/disputes`, `POST /v1/admin/moderation/actions`. Les contre-mesures anti-triche doivent inclure : rejet des doubles soumissions par `actionNonce`; journalisation des seeds RNG; correction de latence bornée pour les jeux de réflexe; caps d’actions par intervalle; détection d’auto-click; heuristiques multi-compte par device/phone/payment/IP; et revue manuelle sur signaux forts. Les tests doivent explicitement viser les abus, pas seulement les happy paths : coupon/promo stacking si un jour ajouté, double payout, parallel tab race, skip d’étape, spoof de résultat, collusion évidente. Les métriques critiques sont `fraud_signal_count`, `multi_account_suspect_rate`, `webhook_signature_failures`, `authorization_denied_rate`, `business_rule_violation_rate`, `round_replay_disagreement`. citeturn12view2turn12view3turn19view0turn3view8turn22view3 fileciteturn0file16

## Patterns de transaction, séquences de référence et observabilité

Le système doit adopter une **matrice explicite de patterns transactionnels**. Pour les créations reliées — utilisateur + profil, session + rounds, inscription + paiement initial local — utilisez des **nested writes**. Pour les écritures indépendantes qui doivent réussir ou échouer ensemble — par exemple annulation d’une session + clôture de plusieurs inscriptions — utilisez **`$transaction([])`**. Pour les flux `read → validate → write` — wallet debit, dernière place disponible, check-in limite, distribution de gain — utilisez des **interactive transactions** avec `Serializable` ou OCC selon la contention. Prisma documente aussi que `Serializable` peut imposer des retries applicatifs, ce qui est attendu et doit être normé dans le cahier des charges. citeturn21view1turn21view2turn11view5turn21view0turn11view6

| Cas métier | Pattern recommandé | Pourquoi |
|---|---|---|
| Création `User` + `PlayerProfile` | Nested write | Dépendance stricte entre enregistrements |
| Création `GameSession` + `Round[]` | Nested write | Atomicité de configuration |
| Réconciliation de lots admin indépendants | `$transaction([])` | Écritures ordonnées mais indépendantes |
| Débit wallet | Interactive tx + `Serializable` | Lecture/validation/écriture sensible |
| Réservation dernière place | OCC ou `Serializable` | Forte contention possible |
| Clôture de round | Interactive tx | Calcul métier + persistance |
| Distribution de gains | Interactive tx + idempotence | Valeur monétaire et risques de double crédit |

La séquence canonique d’une session doit aussi être documentée pour les équipes backend, frontend, temps réel et support.

```mermaid
flowchart LR
    A[Catalogue] --> B[Compte]
    B --> C[Inscription]
    C --> D[Paiement]
    D --> E[PAID]
    E --> F[Lobby]
    F --> G[Check-in]
    G --> H[Room live]
    H --> I[Rounds]
    I --> J[Résolution]
    J --> K[Résultats officiels]
    K --> L[Crédit wallet]
```

Pour l’observabilité, il faut éviter un monitoring purement infra. OWASP recommande aussi de **surveiller les invariants métier** et les anomalies de business logic. En V1, les panneaux d’observabilité doivent contenir au moins :

- Auth : login success rate, invalid-cookie rate, password reset rate, authorization denied rate.
- Acquisition : catalogue views, CTA rate, session detail latency.
- Inscription : seat contention, duplicate registration prevented, timeout pending payments.
- Paiement : webhook delay, signature failures, reconciliation count, payment success rate.
- Wallet : negative balance attempts, ledger mismatch, admin adjustments.
- Live : drop rate, reconnect success, round close lag, desync repairs.
- Résultats : finalize duration, duplicate prize prevented, contestation count.
- WhatsApp/notifications : send rate, retry rate, duplicate reminder prevented.
- Compliance : fraud signals, multi-account suspects, manual overrides by role. citeturn12view2turn12view3turn23view1turn15view1turn15view3

Le modèle d’alerte doit être simple au départ : seuil fixe + fenêtre glissante. Exemples : `webhook_signature_failures > 3/5 min`, `payment_success_rate < 85 %/15 min`, `wallet_ledger_mismatch > 0`, `reconnect_success_rate < 70 %/15 min`, `manual_wallet_adjustments > baseline x3`, `round_close_lag_ms > 5000`, `authorization_denied_rate` qui explose sur un endpoint précis, ou `duplicate prize prevented` qui sort de zéro. Ces alertes sont beaucoup plus utiles opérationnellement qu’un simple CPU/RAM-only dashboard. citeturn12view2turn12view4

## Références primaires et dossier source

Les références **internes projet** qui fixent le cadre produit et métier sont : le document de synthèse général fileciteturn0file0, le catalogue interne des 120 mini-jeux fileciteturn0file1, la synthèse produit Phase 1 fileciteturn0file2, la cartographie des 15 branches Phase 2 fileciteturn0file3, ainsi que les fiches feature acquisition/auth/admin config/paiement/wallet/lobby/live/game engine/mini-jeux/résultats/admin/WhatsApp/sécurité fileciteturn0file4 fileciteturn0file5 fileciteturn0file6 fileciteturn0file7 fileciteturn0file8 fileciteturn0file9 fileciteturn0file10 fileciteturn0file11 fileciteturn0file12 fileciteturn0file13 fileciteturn0file14 fileciteturn0file15 fileciteturn0file16

Les références **officielles techniques** les plus structurantes pour la rédaction du cahier des charges sont : Next.js Authentication Guide et Data Security Guide citeturn22view1turn22view0turn11view3, Prisma Transactions and Batch Queries citeturn21view1turn21view2turn21view0turn11view5, PostgreSQL Transaction Isolation citeturn11view6, Colyseus Reconnection / Presence / Timing Events / Match-maker / Schema citeturn2view2turn13view0turn14view1turn14view3turn14view5turn14view0, Hono Secure Headers / Cookie Helper / Validation / Request ID / Body Limit citeturn3view0turn17view1turn17view3turn23view1turn23view2, BullMQ Delayed Jobs / Job IDs citeturn15view1turn15view3, Redis Presence Patterns / Sets / Distributed Locks citeturn13view0turn16view1turn16view3turn16view0, et les OWASP Cheat Sheets sur Session Management, Authorization, Business Logic Security et Password Storage citeturn11view8turn19view0turn12view2turn12view3turn12view4turn22view3

Pour **Fapshi**, les recommandations intégrées ci-dessus reprennent votre dossier interne de recherche, qui cite explicitement la documentation officielle Fapshi sur l’initiation de paiement, les webhooks, le secret `x-wh-secret`, l’expiration du lien, le sandbox/live et la préférence pour les webhooks. Ces points doivent être gardés tels quels dans la version DOCX/Markdown, avec mention qu’ils proviennent de vos notes de recherche interne fondées sur la documentation officielle à revérifier lors de l’implémentation finale. fileciteturn0file2 fileciteturn0file7

---

## FILE: `docs/plan/00-initialisation-projet.md`

# Sprint 0 - Initialisation projet

## Objectif sprint

Creer le socle technique permettant de developper les 15 features sans improvisation : monorepo, services, base de donnees, environnements, conventions, CI et strategie de test.

## Gate documentaire obligatoire

Avant de creer ou installer quoi que ce soit :

1. Lire via Context7 les docs actuelles de Next.js, Hono, Prisma, Colyseus, BullMQ, Redis et Docker Compose.
2. Pour chaque outil, noter le library ID Context7, la version visee, la commande d installation, les peer dependencies et les contraintes TypeScript.
3. Verifier les exemples officiels de setup serveur/API avant de scaffold.
4. Pour Colyseus, verifier la version actuelle et les imports serveur recommandes avant de choisir `defineServer`, `defineRoom`, `Room`, `Client`, `Schema`, `type` ou un transport.
5. Si une doc est indisponible ou contradictoire avec la version installee, bloquer la story et resoudre la version avant de coder.

## Backlog sprint

### Story 0.1 - Initialiser le monorepo

Etapes :

1. Creer la structure monorepo.
2. Ajouter `apps/web` pour Next.js.
3. Ajouter `apps/api` pour Hono.
4. Ajouter `apps/game-server` pour Colyseus.
5. Ajouter `apps/worker` pour BullMQ.
6. Ajouter `apps/whatsapp-gateway` comme service optionnel ou placeholder.
7. Ajouter `packages/db` pour Prisma/PostgreSQL.
8. Ajouter `packages/game-engine` pour les resolvers.
9. Ajouter `packages/shared` pour types, constantes, erreurs et schemas partages.
10. Configurer TypeScript strict, lint, format et conventions de nommage.

Tests :

- Build vide de chaque package.
- Typecheck global.
- Lint global.

### Story 0.2 - Initialiser l infrastructure locale

Etapes :

1. Creer `docker-compose.yml`.
2. Ajouter PostgreSQL.
3. Ajouter Redis.
4. Ajouter variables `.env.example`.
5. Separer secrets Fapshi sandbox/live.
6. Ajouter scripts `dev`, `test`, `lint`, `typecheck`, `db:migrate`, `db:seed`.
7. Documenter comment lancer localement.

Tests :

- `docker compose up` demarre PostgreSQL et Redis.
- API peut ouvrir une connexion DB.
- Worker peut ouvrir une connexion Redis.

### Story 0.3 - Initialiser Prisma

Etapes :

1. Creer `schema.prisma`.
2. Ajouter enums globaux : `UserRole`, `GameSessionStatus`, `SessionRegistrationStatus`, `PaymentStatus`, `LedgerDirection`, `LedgerType`, `RoundStatus`.
3. Ajouter modeles minimum : `User`, `PlayerProfile`, `GameSession`, `SessionRegistration`, `PaymentTransaction`, `Wallet`, `LedgerEntry`, `RoundInstance`, `RoundResult`, `GameResult`, `PrizeDistribution`, `AuditLog`.
4. Ajouter indexes uniques et contraintes critiques.
5. Ajouter premiere migration.
6. Ajouter seed de developpement avec sessions publiques/privees.

Tests :

- Migration from scratch.
- Seed executable deux fois sans casser.
- Contraintes uniques verifiees.

### Story 0.4 - Initialiser les patterns transverses

Etapes :

1. Creer format d erreur API standard.
2. Creer middleware `requestId`.
3. Creer middleware secure headers/body limit.
4. Creer helper d audit `writeAuditLog`.
5. Creer helper transaction DB.
6. Creer constantes d events/outbox.
7. Creer structure de tests unitaires/integration/E2E.

Tests :

- Une route healthcheck API.
- Une route test audit en environnement test.
- Un test transaction rollback.

## Definition of Done Sprint 0

- Criteres de tests a valider :
  - Typecheck global.
  - Lint global.
  - Tests unitaires du package shared/db initial.
  - Test integration DB : migration + seed + connexion.
  - Test integration Redis : connexion worker.
  - Test CI locale : toutes les commandes de validation executables.
- Tous les services demarrent localement.
- DB et Redis fonctionnent.
- Prisma migre et seed.
- CI minimale execute typecheck, lint et tests.
- Le projet est pret pour Feature 01.


---

## FILE: `docs/plan/01-acquisition-catalogue-public.md`

# Feature 01 - Plan Scrum - Acquisition, landing et catalogue public

## Objectif sprint

Livrer un catalogue public fiable : landing, liste des sessions publiques, detail session, liens partageables et CTA vers auth/inscription.

## Decisions non negociables

- La visibilite de session est un enum `PUBLIC | UNLISTED | PRIVATE`, pas un booleen.
- Toute modification de `schema.prisma` doit avoir une migration Prisma/SQL correspondante et testee depuis une DB vide.
- Les montants sont affiches comme frais d inscription et recompenses internes uniquement si le wording reste prudent.
- Ne pas utiliser les termes publics suivants : `pari`, `mise`, `jackpot`, `gain garanti`.
- Eviter aussi les formulations qui promettent un resultat financier, par exemple `les meilleurs joueurs remportent les gains`.
- L UI ne doit pas afficher `Prize pool` en anglais ; utiliser une formulation prudente comme `Recompenses internes configurees`.
- `PRIVATE` ne doit jamais etre accessible via catalogue, detail public ou lien partageable generique.
- `UNLISTED` ne doit pas apparaitre dans le catalogue, mais peut etre accessible via un lien direct ou un token dedie.
- Le CTA detail ne doit jamais etre `href="#"`. Si Feature 02/05 n est pas prete, pointer vers `/auth/register?next=/session/{code}` ou afficher un bouton desactive avec texte explicite.
- `pnpm typecheck`, `pnpm lint`, `pnpm test` et `pnpm build` doivent passer avant merge.

## Dependances

- Sprint 0 termine.
- Modeles `GameSession` et `SessionRegistration` disponibles.
- Seed avec sessions `PUBLIC`, `UNLISTED`, `PRIVATE`.

## Gate documentaire obligatoire

Avant implementation :

1. Lire via Context7 les docs actuelles de Next.js pour App Router, metadata et chargement serveur.
2. Lire via Context7 Hono pour routing, validation, erreurs et middleware.
3. Lire via Context7 Prisma pour requetes, pagination et calculs de capacite.
4. Noter les imports exacts, patterns de routing et conventions de response avant de coder.
5. Ne pas creer les pages/API tant que le gate documentaire n est pas documente dans les notes de sprint.

## User stories

### Story 1.1 - Landing publique

Etapes :

1. Creer la page landing dans `apps/web`.
2. Ecrire un wording prudent : competition structuree, adresse, strategie, social.
3. Retirer tout vocabulaire : pari, mise, jackpot, gain garanti.
4. Ajouter CTA vers catalogue.
5. Ajouter metadata SEO.
6. Remplacer toute metadata par defaut `Create Next App`.
7. Ne pas utiliser `next/font/google` si le build doit fonctionner sans acces reseau ; utiliser police systeme ou font locale.
8. Relire le contenu avec `rg` pour supprimer les formulations de promesse financiere.

Tests :

- Test snapshot ou component.
- Test anti-wording interdit.
- Test metadata minimale.
- Test build Next.js sans dependance reseau externe.

### Story 1.2 - API catalogue public

Etapes :

1. Verifier le schema Prisma actuel avant toute route.
2. Ajouter/valider enum `SessionVisibility { PUBLIC, UNLISTED, PRIVATE }`.
3. Generer une migration qui ajoute/remplace proprement le champ `GameSession.visibility`.
4. Mettre a jour le seed avec au moins une session `PUBLIC`, une `UNLISTED`, une `PRIVATE`.
5. Creer `GET /v1/public/sessions`.
6. Filtrer uniquement `visibility = PUBLIC`.
7. Filtrer uniquement les statuts publiables/inscriptibles definis dans le schema courant. Si `REGISTRATION_OPEN` n existe pas encore, documenter le mapping temporaire exact.
8. Calculer `placesRemaining` cote serveur.
9. Exclure les inscriptions annulees/remboursees/inactives du compteur actif selon les enums disponibles.
10. Ajouter pagination simple.
11. Ajouter erreurs standard.
12. Ajouter un test integration ou migration qui prouve que la DB migree possede bien `visibility` et plus seulement `isPublic`.

Tests :

- PUBLIC retourne.
- UNLISTED absent.
- PRIVATE absent.
- Calcul places restantes.
- Pagination.
- Migration DB depuis zero.
- Seed DB apres migration.

### Story 1.3 - Page detail session

Etapes :

1. Creer `GET /v1/public/sessions/:slug`.
2. Autoriser `PUBLIC`.
3. Autoriser `UNLISTED` par slug/token direct.
4. Bloquer `PRIVATE` sans autorisation.
5. Retourner prix, date, places, regles essentielles, politique no-show/remboursement.
6. Creer page web detail.
7. Ajouter CTA selon auth : login/register ou intention inscription.
8. Gerer l erreur 404/410 cote UI avec une page ou un etat explicite.
9. Ne pas afficher de libelle anglais comme `Prize pool`.
10. Ne pas afficher de CTA vide ou `href="#"`.
11. Ajouter test qui verifie le CTA final.

Tests :

- Detail PUBLIC OK.
- Detail UNLISTED par lien OK.
- PRIVATE refuse.
- CTA non connecte.
- CTA connecte.
- UI detail affiche les erreurs sans fuite de session private.

### Story 1.4 - Liens partageables

Etapes :

1. Creer modele ou champ `ShareLink`/token si necessaire.
2. Creer resolution `GET /v1/share/:token`.
3. Ne pas utiliser `GameSession.code` comme token de partage si cela donne acces a une session `PRIVATE`.
4. Rediriger vers detail session seulement si le token correspond a une session `PUBLIC` ou `UNLISTED` partageable.
5. Refuser `PRIVATE` sans invitation/allowlist/code d acces.
6. Journaliser `share.link-opened`.
7. Ajouter test qui prouve qu un lien vers `PRIVATE` ne fuite pas.

Tests :

- Token valide redirige.
- Token invalide renvoie 404.
- Session annulee renvoie statut ferme.
- Token/session PRIVATE refuse sans autorisation.

## Definition of Done

- Criteres de tests a valider :
  - Test unitaires du calcul `placesRemaining`.
  - Tests integration API pour `PUBLIC`, `UNLISTED`, `PRIVATE`.
  - Tests UI catalogue et detail session.
  - Test E2E visiteur : landing -> catalogue -> detail -> CTA.
  - Test securite : session `PRIVATE` ne fuite pas.
  - Test contenu : aucun wording interdit.
  - Test migration DB : `schema.prisma` et migrations sont coherents.
  - Test build : `pnpm build` passe.
  - Test lint : `pnpm lint` passe.
- Landing, catalogue et detail utilisables.
- Les visibilites `PUBLIC`, `UNLISTED`, `PRIVATE` sont respectees.
- Les tests API et UI passent.
- L E2E obligatoire existe et passe.
- Aucun texte public ne promet un gain garanti.
- Demo : ouvrir catalogue, detail public, lien unlisted, private bloque.


---

## FILE: `docs/plan/02-authentification-compte.md`

# Feature 02 - Plan Scrum - Authentification et compte

## Objectif sprint

Permettre aux joueurs et admins de creer un compte, se connecter, gerer une session serveur et proteger les roles.

## Dependances

- Sprint 0 termine.
- Feature 01 peut utiliser auth optionnelle apres livraison.

## Gate documentaire obligatoire

Avant implementation :

1. Lire via Context7 Next.js Authentication/Data Security si le web lit la session.
2. Lire via Context7 Hono cookies/middleware pour poser, lire et supprimer les cookies.
3. Lire via Context7 Prisma transactions pour creation atomique `User` + `PlayerProfile` + `AuthSession`.
4. Lire les references OWASP Session Management, Authorization et Password Storage.
5. Verifier la librairie de hash retenue et sa documentation actuelle avant installation.
6. Documenter les attributs cookies exacts et le pattern de regeneration de session avant de coder.

## User stories

### Story 2.1 - Schema auth

Etapes :

1. Ajouter `User`, `PlayerProfile`, `AuthSession`, `PasswordResetToken`, `RoleAssignment` si absents.
2. Ajouter contraintes uniques email/telephone selon choix produit.
3. Ajouter enum role.
4. Ajouter migration.
5. Ajouter seed admin local.

Tests :

- Migration.
- Creation user + profile atomique.
- Unicite email/telephone.

### Story 2.2 - Register joueur

Etapes :

1. Creer `POST /v1/auth/register`.
2. Valider input.
3. Hasher le mot de passe.
4. Creer `User`, `PlayerProfile`, `AuthSession` en transaction.
5. Poser cookie `HttpOnly`, `Secure`, `SameSite`.
6. Ecrire audit `auth.user-created`.

Tests :

- Register OK.
- Doublon refuse.
- Mot de passe jamais stocke en clair.
- Cookie securise.

### Story 2.3 - Login/logout

Etapes :

1. Creer `POST /v1/auth/login`.
2. Verifier credentials.
3. Rate limit login.
4. Regenerer session apres login.
5. Creer `POST /v1/auth/logout`.
6. Revoquer session.

Tests :

- Login OK.
- Password invalide.
- Compte desactive refuse.
- Logout invalide session.
- Rate limit.

### Story 2.4 - RBAC et `/me`

Etapes :

1. Creer `GET /v1/me`.
2. Creer middleware auth required.
3. Creer middleware role required.
4. Proteger routes admin.
5. Ajouter audit pour changement critique.

Tests :

- Player refuse admin.
- Support refuse finance si non autorise.
- Session expiree refuse.
- Changement role regenere session.

## Definition of Done

- Criteres de tests a valider :
  - Tests unitaires validation register/login.
  - Tests integration register, login, logout, `/me`.
  - Tests securite cookies `HttpOnly`, `Secure`, `SameSite`.
  - Tests RBAC positifs et negatifs.
  - Tests rate limit login/reset.
  - Test non-regression fixation de session : session regeneree apres login/changement privilege.
- Register/login/logout/me fonctionnels.
- Cookies securises.
- RBAC applique cote serveur.
- Tests auth et autorisation passent.
- Feature 01 peut afficher CTA selon etat auth.


---

## FILE: `docs/plan/03-profil-joueur-historique.md`

# Feature 03 - Plan Scrum - Profil joueur et historique

## Objectif sprint

Livrer un profil joueur prive, un profil public minimal optionnel, un historique de sessions et des statistiques derivees.

## Dependances

- Feature 02 auth.
- Feature 05 inscriptions.
- Feature 12 resultats pour statistiques finales completes.

## Gate documentaire obligatoire

Avant implementation :

1. Lire via Context7 Prisma pour requetes relationnelles, agregations et pagination.
2. Lire via Context7 Next.js si les donnees profil sont chargees depuis server components ou routes client.
3. Lire via Context7 Hono pour validation `PATCH` et erreurs standard.
4. Verifier les patterns de protection data/authorization avant de coder les profils publics/prives.
5. Documenter quelles donnees sont exposees cote client et lesquelles restent serveur.

## User stories

### Story 3.1 - Profil prive

Etapes :

1. Creer `GET /v1/players/me`.
2. Creer `PATCH /v1/players/me`.
3. Valider pseudo, avatar, preferences.
4. Verifier ownership par session auth.
5. Auditer changement pseudo/avatar si necessaire.

Tests :

- Lecture profil connecte.
- Non connecte refuse.
- Pseudo invalide refuse.
- Pseudo duplique refuse.

### Story 3.2 - Historique sessions

Etapes :

1. Creer `GET /v1/players/me/history`.
2. Retourner sessions futures, live, terminees, annulees, no-show.
3. Masquer details financiers non necessaires.
4. Ajouter pagination.

Tests :

- Historique filtre par utilisateur.
- Annulees/remboursees separees.
- Aucun autre joueur visible.

### Story 3.3 - Statistiques derivees

Etapes :

1. Creer fonction de recomputation depuis `GameResult`, `RoundResult`, `LedgerEntry`.
2. Creer `PlayerStatsSnapshot`.
3. Lancer recomputation apres finalisation session.
4. Afficher win rate, sessions jouees, sessions gagnees, credits gagnes.

Tests :

- Stats derivees des resultats.
- Stats non modifiables manuellement.
- Ledger source pour credits.

### Story 3.4 - Profil public minimal

Etapes :

1. Creer `GET /v1/players/:publicId`.
2. Exposer pseudo, avatar, stats publiques autorisees.
3. Masquer email, telephone, wallet, ledger, paiements.
4. Ajouter option de visibilite.

Tests :

- Profil public masque donnees privees.
- Profil prive retourne 403/404 selon policy.

## Definition of Done

- Criteres de tests a valider :
  - Tests unitaires recomputation statistiques.
  - Tests integration `GET/PATCH /players/me`.
  - Tests ownership : un joueur ne lit/modifie pas le profil d un autre.
  - Tests privacy profil public : email, telephone, wallet, ledger masques.
  - Test E2E joueur : consulter profil + historique.
- Profil et historique utilisables.
- Stats coherentes avec resultats officiels.
- Donnees sensibles protegees.
- Tests ownership et privacy passent.


---

## FILE: `docs/plan/04-configuration-sessions-admin.md`

# Feature 04 - Plan Scrum - Creation et configuration des sessions admin

## Objectif sprint

Permettre a un admin de creer, configurer, simuler, publier et annuler une session de jeu autonome.

## Dependances

- Feature 02 auth/RBAC.
- Sprint 0 modeles DB.

## Gate documentaire obligatoire

Avant implementation :

1. Lire via Context7 Prisma pour OCC, transactions et migrations.
2. Lire la documentation PostgreSQL sur isolation/retry si `Serializable` est utilise.
3. Lire via Context7 Hono pour routes admin, validation et erreurs.
4. Lire via Context7 Next.js pour formulaires/admin UI selon architecture retenue.
5. Documenter les formules XAF/bps, contraintes DB et pattern de versioning avant de coder.

## User stories

### Story 4.1 - Schema session admin

Etapes :

1. Finaliser `GameSession`, `SessionConfig`, `PrizeConfig`, `RoundConfig`.
2. Ajouter `configVersion`.
3. Ajouter champs prix, capacite, visibilite, status, planning.
4. Ajouter migration.

Tests :

- Contraintes min/max.
- Valeurs entieres XAF.
- Version incrementable.

### Story 4.2 - Creation DRAFT

Etapes :

1. Creer `POST /v1/admin/sessions`.
2. Verifier role admin.
3. Valider champs minimum.
4. Creer session en `DRAFT`.
5. Ecrire audit.

Tests :

- Admin cree DRAFT.
- Player refuse.
- Audit present.

### Story 4.3 - Simulation financiere

Etapes :

1. Creer `GET /v1/admin/sessions/:id/simulation`.
2. Calculer collecte brute.
3. Calculer frais estimes.
4. Calculer net, prize pool, commission.
5. Afficher risques marge negative.

Tests :

- Calcul XAF entier.
- Bps correct.
- Somme winner split = 10000.

### Story 4.4 - Publication et verrouillage

Etapes :

1. Creer `PATCH /v1/admin/sessions/:id`.
2. Creer `POST /v1/admin/sessions/:id/publish`.
3. Refuser publication incoherente.
4. Bloquer modification sensible si inscriptions payees.
5. Utiliser OCC `configVersion`.

Tests :

- Publish OK.
- Publish invalide refuse.
- Modification concurrente refusee.
- Modification apres paid refusee.

## Definition of Done

- Criteres de tests a valider :
  - Tests unitaires formules XAF/bps.
  - Tests integration creation DRAFT, simulation, publication, cancel.
  - Tests RBAC admin.
  - Tests concurrence `configVersion`/OCC.
  - Tests audit before/after/reason.
  - Test E2E admin : creer -> simuler -> publier session.
- Admin peut creer, simuler et publier une session.
- Les invariants economiques sont testes.
- Les actions sensibles sont auditees.
- Feature 01 peut afficher sessions publiees.


---

## FILE: `docs/plan/05-inscription-session.md`

# Feature 05 - Plan Scrum - Inscription joueur a une session

## Objectif sprint

Permettre a un joueur connecte de s inscrire a une session sans double inscription ni depassement de capacite.

## Dependances

- Feature 02 auth.
- Feature 04 sessions publiees.

## Gate documentaire obligatoire

Avant implementation :

1. Lire via Context7 Prisma pour transactions interactives, OCC et gestion de contention.
2. Lire la documentation PostgreSQL sur isolation si la derniere place est protegee par transaction forte.
3. Lire via Context7 BullMQ pour jobs d expiration et `jobId` idempotent.
4. Lire via Context7 Hono pour validation, auth middleware et erreurs.
5. Documenter le choix technique de reservation capacite avant de coder.

## User stories

### Story 5.1 - Schema inscription

Etapes :

1. Finaliser `SessionRegistration`.
2. Ajouter status `CREATED`, `PAYMENT_PENDING`, `PAID`, `CANCELLED`, `REFUNDED`.
3. Ajouter `paymentDeadlineAt`.
4. Ajouter contrainte unique active user/session.
5. Ajouter indexes capacite.

Tests :

- Unique active registration.
- Status transitions valides.

### Story 5.2 - Register session

Etapes :

1. Creer `POST /v1/sessions/:id/register`.
2. Verifier auth.
3. Verifier session ouverte.
4. Verifier capacite en transaction.
5. Verifier absence inscription active.
6. Creer registration `PAYMENT_PENDING`.
7. Planifier expiration BullMQ.

Tests :

- Inscription OK.
- Session fermee refusee.
- Double inscription refusee.
- Derniere place concurrente protegee.

### Story 5.3 - Consultation et annulation

Etapes :

1. Creer `GET /v1/sessions/:id/registration`.
2. Creer `POST /v1/registrations/:id/cancel`.
3. Appliquer policy avant paiement.
4. Auditer annulation support/admin.

Tests :

- Joueur voit seulement sa registration.
- Annulation pending libere place.
- Annulation paid suit policy.

### Story 5.4 - Expiration reservation

Etapes :

1. Implementer job `registration.expire`.
2. Verifier status toujours pending.
3. Passer `EXPIRED` ou `CANCELLED` selon enum retenue.
4. Liberer capacite.
5. Publier event.

Tests :

- Job idempotent.
- Paiement arrive avant expiration conserve inscription.
- Job repete sans effet.

## Definition of Done

- Criteres de tests a valider :
  - Tests unitaires transitions `SessionRegistrationStatus`.
  - Tests integration register, cancel, status.
  - Tests concurrence derniere place et double clic.
  - Tests idempotence expiration reservation.
  - Tests securite ownership registration.
  - Test E2E joueur : detail session -> inscription pending.
- Inscription concurrente fiable.
- Aucun depassement capacite.
- Aucune double inscription active.
- Expiration testee.


---

## FILE: `docs/plan/06-paiement-fapshi.md`

# Feature 06 - Plan Scrum - Paiement Fapshi

## Objectif sprint

Transformer une inscription pending en inscription payee via Fapshi avec webhook securise, idempotence et reconciliation.

## Dependances

- Feature 05 inscriptions.
- Variables Fapshi sandbox disponibles.

## Gate documentaire obligatoire

Avant implementation :

1. Lire la documentation officielle Fapshi actuelle : initiate-pay, payment status, webhooks, sandbox/live, secrets, limites de polling.
2. Lire via Context7 Hono pour webhook public sans session utilisateur, body parsing et reponse rapide.
3. Lire via Context7 Prisma/PostgreSQL pour idempotence et transaction payment + registration.
4. Lire via Context7 BullMQ pour reconciliation et retries.
5. Documenter les headers exacts Fapshi, dont `x-wh-secret`, et les statuts provider avant de coder.
6. Si la doc Fapshi contredit les notes PRD, stopper et mettre a jour la fiche PRD avant implementation.

## User stories

### Story 6.1 - Schema paiement

Etapes :

1. Finaliser `PaymentTransaction`.
2. Ajouter `provider`, `externalId`, `providerTransId`, `status`, `amountXaf`.
3. Ajouter `WebhookEvent`.
4. Ajouter contraintes uniques `externalId` et `providerTransId`.

Tests :

- Unicite transId.
- Status transitions.

### Story 6.2 - Initiation paiement

Etapes :

1. Creer `POST /v1/payments/fapshi/initiate`.
2. Verifier registration pending.
3. Creer payment local `PENDING`.
4. Appeler Fapshi initiate-pay.
5. Persister `link` et `transId`.
6. Retourner checkoutUrl.

Tests :

- Initiation OK.
- Montant < minimum refuse.
- Provider down gere.
- Payment local rollback/compensation claire.

### Story 6.3 - Webhook Fapshi

Etapes :

1. Creer `POST /v1/webhooks/fapshi`.
2. Verifier header `x-wh-secret`.
3. Dedupliquer evenement.
4. Verrouiller par `providerTransId`.
5. Passer payment SUCCESS/FAILED/EXPIRED.
6. Passer registration PAID si SUCCESS.
7. Repondre vite 200.

Tests :

- Secret invalide refuse.
- Replay webhook idempotent.
- SUCCESS marque PAID.
- FAILED/EXPIRED ne marque pas PAID.

### Story 6.4 - Reconciliation

Etapes :

1. Creer job BullMQ `payment.reconcile`.
2. Poller provider uniquement en secours.
3. Respecter rate limits.
4. Ajouter endpoint admin `POST /v1/admin/payments/:id/reconcile`.
5. Auditer reconciliation manuelle.

Tests :

- Job idempotent.
- Polling limite.
- Admin non finance refuse.

## Definition of Done

- Criteres de tests a valider :
  - Tests unitaires mapping statuts Fapshi -> statuts internes.
  - Tests integration initiate payment.
  - Tests webhook `x-wh-secret` valide/invalide.
  - Tests idempotence webhook replay.
  - Tests reconciliation worker retry.
  - Tests concurrence : webhook double + registration deja modifiee.
  - Test sandbox Fapshi documente ou mock contractuel si sandbox indisponible.
- Paiement webhook-first.
- Webhook securise.
- Pas de double validation.
- Reconciliation disponible.


---

## FILE: `docs/plan/07-wallet-ledger-credits.md`

# Feature 07 - Plan Scrum - Wallet, ledger et credits

## Objectif sprint

Gerer les credits internes non retirables en V1 avec ledger obligatoire, solde coherent et paiement wallet.

## Dependances

- Feature 02 auth.
- Feature 05 inscription.
- Feature 06 paiement.

## Gate documentaire obligatoire

Avant implementation :

1. Lire via Context7 Prisma pour transactions interactives et isolation.
2. Lire la documentation PostgreSQL sur `Serializable` et retries.
3. Lire via Context7 Hono pour routes securisees et validation.
4. Lire OWASP Business Logic/Authorization pour features qui distribuent de la valeur.
5. Documenter le pattern exact `read balance -> verify -> ledger -> update wallet` avant de coder.

## User stories

### Story 7.1 - Schema wallet/ledger

Etapes :

1. Finaliser `Wallet`.
2. Finaliser `LedgerEntry`.
3. Ajouter `direction`, `type`, `amountXaf`, `balanceAfterXaf`, `referenceType`, `referenceId`, `idempotencyKey`.
4. Ajouter contrainte unique `idempotencyKey`.
5. Interdire solde negatif par logique transactionnelle.

Tests :

- Ledger unique.
- Balance recomputable.

### Story 7.2 - Lecture wallet

Etapes :

1. Creer `GET /v1/wallet/me`.
2. Creer `GET /v1/wallet/me/ledger`.
3. Filtrer par utilisateur connecte.
4. Paginer ledger.

Tests :

- Joueur lit son wallet.
- Autre wallet inaccessible.
- Pagination.

### Story 7.3 - Paiement inscription par wallet

Etapes :

1. Creer `POST /v1/registrations/:id/pay-with-wallet`.
2. Verifier ownership.
3. Verifier solde.
4. Transaction : debit wallet + ledger + registration PAID.
5. Idempotency key obligatoire.

Tests :

- Debit OK.
- Fonds insuffisants refuse.
- Double submit ne double pas debit.
- Registration PAID atomique.

### Story 7.4 - Ajustement admin

Etapes :

1. Creer `POST /v1/admin/wallets/:userId/adjust`.
2. Exiger role finance/super admin.
3. Exiger reason.
4. Ecrire ledger + audit.
5. Bloquer retrait argent reel en V1.

Tests :

- Reason obligatoire.
- Role insuffisant refuse.
- Withdrawal disabled.

## Definition of Done

- Criteres de tests a valider :
  - Tests unitaires calcul balance depuis ledger.
  - Tests integration lecture wallet/ledger.
  - Tests transaction debit wallet + registration PAID.
  - Tests concurrence double debit.
  - Tests idempotence `idempotencyKey`.
  - Tests securite : autre wallet inaccessible.
  - Test retrait argent reel bloque.
- Aucune mutation sans ledger.
- Balance jamais negative.
- Wallet utilisable pour inscription.
- Retrait argent reel bloque.


---

## FILE: `docs/plan/08-lobby-check-in.md`

# Feature 08 - Plan Scrum - Lobby, check-in et preparation

## Objectif sprint

Rassembler les joueurs payes, verifier leur presence et generer l entree vers la room live.

## Dependances

- Feature 05 inscription.
- Feature 06/07 paiement valide.
- Redis disponible.

## Gate documentaire obligatoire

Avant implementation :

1. Lire via Context7 Redis pour presence courte, TTL et structures choisies.
2. Lire via Context7 BullMQ pour deadlines check-in et jobs retardes.
3. Lire via Context7 Colyseus pour seat reservation ou strategie d entree room si elle est utilisee.
4. Lire via Context7 Prisma pour persistance officielle `CHECKED_IN`.
5. Documenter ce qui est source de verite DB et ce qui est seulement presence volatile Redis avant de coder.

## User stories

### Story 8.1 - Lobby joueur

Etapes :

1. Creer `GET /v1/sessions/:id/lobby`.
2. Autoriser seulement `PAID`.
3. Retourner regles critiques, horaires, compte a rebours, policy no-show.
4. Brancher presence courte Redis si necessaire.

Tests :

- PAID accede.
- Non paid refuse.
- Session annulee refuse.

### Story 8.2 - Check-in

Etapes :

1. Creer `POST /v1/sessions/:id/check-in`.
2. Verifier deadline.
3. Passer registration `CHECKED_IN`.
4. Ecrire event `player.checked-in`.
5. Rendre operation idempotente.

Tests :

- Check-in OK.
- Recheck idempotent.
- Deadline passee refuse.

### Story 8.3 - Start policy

Etapes :

1. Definir policy : minimum joueurs PAID ou CHECKED_IN.
2. Creer `POST /v1/admin/sessions/:id/start`.
3. Verifier minPlayers.
4. Marquer session `WAITING_START` ou `LIVE`.
5. Planifier/emettre event vers game-server.

Tests :

- Min atteint OK.
- Min non atteint refuse ou annule selon policy.
- Admin action auditee.

### Story 8.4 - Join token

Etapes :

1. Creer `GET /v1/sessions/:id/join-token`.
2. Generer token court et single-use.
3. Lier token a registration.
4. Consommer token cote game-server.

Tests :

- Token valide.
- Token expire.
- Token reutilise refuse.

## Definition of Done

- Criteres de tests a valider :
  - Tests integration lobby accessible uniquement aux `PAID`.
  - Tests check-in idempotent.
  - Tests deadline/grace period.
  - Tests start policy minPlayers.
  - Tests join token expire et single-use.
  - Test E2E joueur : PAID -> lobby -> check-in -> join token.
- Lobby accessible aux PAID.
- Check-in fiable.
- Start policy testee.
- Join token pret pour Colyseus.


---

## FILE: `docs/plan/09-session-live-temps-reel.md`

# Feature 09 - Plan Scrum - GameSession live temps reel

## Objectif sprint

Orchestrer une session live avec Colyseus : room, phases, timers, actions, reconnexion, pause/reprise.

## Dependances

- Feature 08 lobby/check-in.
- Colyseus configure.
- Redis et BullMQ disponibles.

## Gate documentaire obligatoire

Avant implementation :

1. Lire via Context7 la documentation Colyseus actuelle avec une question precise sur setup serveur TypeScript, rooms, schema, transport, presence, matchmaking, clock et reconnection.
2. Verifier la version installee de `colyseus` et des packages `@colyseus/*` avant d ecrire les imports.
3. Confirmer depuis la doc actuelle les imports serveur. Verification Context7 du 2026-07-07 : la doc Colyseus `/colyseus/docs` montre `import { defineServer, defineRoom } from "colyseus"` pour configurer le serveur, `@colyseus/schema` pour `Schema`, `MapSchema`, `type`, et des transports comme `@colyseus/ws-transport` selon le setup.
4. Ne pas utiliser l ancienne classe `Server` ou des imports supposes sans confirmer qu ils correspondent exactement a la version installee.
5. Verifier peer dependencies, transport, RedisPresence/RedisDriver si multi-process, et contraintes TypeScript des decorators avant de coder.
6. Lire via Context7 BullMQ pour deadline recovery et Redis pour presence.
7. Documenter les exemples officiels lus et les decisions de version dans les notes de sprint.

## User stories

### Story 9.1 - Reservation live

Etapes :

1. Creer endpoint `POST /v1/live/sessions/:id/reservation`.
2. Verifier auth, registration CHECKED_IN, session startable.
3. Creer seat reservation Colyseus ou token bridging.
4. Retourner endpoint WS.

Tests :

- CHECKED_IN OK.
- Non checked-in refuse.
- Session non live refuse.

### Story 9.2 - Room Colyseus par session

Etapes :

1. Creer room `GameSessionRoom`.
2. Charger state initial depuis DB.
3. Definir phases : BRIEFING, ROUND_ACTIVE, RESOLVING, RESULTS, PAUSED.
4. Synchroniser uniquement donnees utiles au client.

Tests :

- Room creee.
- State minimal synchronise.
- Client ne peut pas creer room arbitraire.

### Story 9.3 - Timers et deadlines

Etapes :

1. Utiliser clock Colyseus pour timer ressenti.
2. Persister `RoundDeadline` en DB.
3. Planifier job BullMQ de fermeture.
4. Rejeter actions apres deadline.

Tests :

- Deadline DB existe.
- Late input refuse.
- Worker ferme round si room tombe.

### Story 9.4 - Reconnexion et pause admin

Etapes :

1. Implementer `allowReconnection`.
2. Restaurer etat joueur.
3. Creer `POST /v1/admin/live/:sessionId/pause`.
4. Creer `POST /v1/admin/live/:sessionId/resume`.
5. Auditer pause/reprise.

Tests :

- Reconnexion restaure state.
- Action deja soumise non replay.
- Pause/resume audite.

## Definition of Done

- Criteres de tests a valider :
  - Tests integration reservation live.
  - Tests Colyseus room creation avec version/imports confirmes par doc.
  - Tests state sync minimal sans donnees sensibles.
  - Tests deadline DB + timer room.
  - Tests late input refuse.
  - Tests reconnexion et non-replay action.
  - Test recovery : worker ferme round si room indisponible.
- Room live fonctionnelle.
- Timer officiel durable.
- Reconnexion testee.
- Crash/recovery minimal teste.


---

## FILE: `docs/plan/10-game-engine-resolution-rounds.md`

# Feature 10 - Plan Scrum - Game engine et resolution des rounds

## Objectif sprint

Creer un moteur de jeu separe de Colyseus, deterministe, testable et rejouable.

## Dependances

- Feature 09 live.
- Feature 11 definitions mini-jeux peut etre en parallele.

## Gate documentaire obligatoire

Avant implementation :

1. Relire la documentation Colyseus actuelle si le moteur consomme des structures venant de la room.
2. Lire via Context7 Prisma/PostgreSQL pour la finalisation transactionnelle de round.
3. Lire les references OWASP Business Logic pour tester les abus de workflow.
4. Verifier les librairies de test/propriete si ajoutees au projet.
5. Documenter les interfaces pures du moteur avant de coder, afin que Colyseus ne porte pas les regles metier.

## User stories

### Story 10.1 - Structure game-engine

Etapes :

1. Creer `packages/game-engine`.
2. Definir interfaces `ResolverInput`, `ResolverOutput`, `PlayerAction`, `ResolutionEvidence`.
3. Definir convention `scores`, `ranks`, `qualifiedIds`, `eliminatedIds`, `tieGroups`, `seedLog`.
4. Exporter helpers de ranking.

Tests :

- Types compile.
- Helpers ranking unitaires.

### Story 10.2 - Resolver MVP

Etapes :

1. Implementer 1 resolver solo simple.
2. Implementer 1 resolver duel simple.
3. Gerer tie-break.
4. Gerer late/missing actions.
5. Produire evidence.

Tests :

- Fixtures deterministes.
- Egalites.
- Missing inputs.

### Story 10.3 - Finalisation round

Etapes :

1. Creer service `finalizeRound`.
2. Charger round, config, actions valides.
3. Appeler resolver.
4. Persister `RoundResult`, qualifications, eliminations en transaction.
5. Emettre events.

Tests :

- Finalisation idempotente.
- Double close refuse.
- Transaction rollback si erreur.

### Story 10.4 - Replay litige

Etapes :

1. Creer `POST /internal/rounds/:id/replay`.
2. Recharger config, inputs, seedLog.
3. Comparer output au resultat persiste.
4. Signaler mismatch.

Tests :

- Replay identique.
- Mismatch detecte.

## Definition of Done

- Criteres de tests a valider :
  - Tests unitaires resolvers par fixtures.
  - Tests determinisme : meme input/config/seed = meme output.
  - Tests tie-break et missing inputs.
  - Tests finalisation round transactionnelle.
  - Tests idempotence double close.
  - Tests replay litige identique ou mismatch signale.
- Game-engine hors Colyseus.
- Resolvers purs.
- Meme input = meme output.
- Finalisation transactionnelle testee.


---

## FILE: `docs/plan/11-catalogue-mini-jeux-configurables.md`

# Feature 11 - Plan Scrum - Catalogue mini-jeux configurables

## Objectif sprint

Transformer le catalogue de mini-jeux en definitions parametrables par famille, sans implementer 120 systemes isoles.

## Dependances

- Feature 10 game-engine.
- Feature 04 configuration sessions.

## Gate documentaire obligatoire

Avant implementation :

1. Lire via Context7 Colyseus pour Schema/state sync si les definitions mini-jeux alimentent une room.
2. Lire via Context7 Prisma pour stockage JSON/schema/versioning.
3. Lire la documentation de la librairie de validation choisie avant installation.
4. Relire `catalogue-mini-jeux.md` pour les contraintes timers serveur, `winnersCount`, RNG et anti-triche.
5. Documenter les familles MVP et leurs schemas avant de coder.

## User stories

### Story 11.1 - Modele MiniGameDefinition

Etapes :

1. Creer `MiniGameDefinition`.
2. Ajouter `key`, `family`, `playerMode`, `enabled`, `version`.
3. Ajouter `configSchema`, `allowedActions`, `antiCheatPolicy`.
4. Ajouter migration et seed MVP.

Tests :

- Seed definitions.
- Version unique.
- Schema present.

### Story 11.2 - Admin mini-jeux

Etapes :

1. Creer `GET /v1/admin/minigames`.
2. Creer `POST /v1/admin/minigames/:id/enable`.
3. Creer `POST /v1/admin/minigames/validate-config`.
4. Brancher dans configuration rounds.

Tests :

- Admin liste.
- Player refuse.
- Config invalide refusee.

### Story 11.3 - Runtime validation

Etapes :

1. Creer `validateMiniGameAction`.
2. Verifier action autorisee.
3. Verifier deadline.
4. Verifier nonce/double submit.
5. Verifier rate cap par mini-jeu.

Tests :

- Action autorisee OK.
- Action interdite refusee.
- Double submit refuse.
- Auto-click signale.

### Story 11.4 - MVP mini-jeux

Etapes :

1. Choisir 3 a 5 mini-jeux a faible hasard.
2. Implementer schemas config.
3. Implementer state minimal.
4. Connecter resolvers Feature 10.
5. Documenter regles UI simples.

Tests :

- Chaque jeu a schema/actions/resolver.
- Pas de reponse sensible exposee.
- RNG loguee si utilisee.

## Definition of Done

- Criteres de tests a valider :
  - Tests unitaires validation `configSchema`.
  - Tests allowedActions.
  - Tests double submit/action rate.
  - Tests absence de reponse sensible dans state client.
  - Tests RNG seed log si RNG utilisee.
  - Test integration mini-jeu MVP avec resolver.
- Catalogue configurable.
- MVP mini-jeux jouable/testable.
- Anti-cheat minimum branche.
- Aucun hasard dominant non valide.


---

## FILE: `docs/plan/12-resultats-gains-distribution.md`

# Feature 12 - Plan Scrum - Resultats, gains et distribution

## Objectif sprint

Finaliser une session, publier les resultats officiels et crediter les wallets de maniere idempotente.

## Dependances

- Feature 07 wallet/ledger.
- Feature 10 game-engine.

## Gate documentaire obligatoire

Avant implementation :

1. Lire via Context7 Prisma/PostgreSQL pour transactions, retries et idempotence.
2. Lire via Context7 BullMQ pour jobs de distribution, retries et deduplication par `jobId`.
3. Lire OWASP Business Logic pour double payout, races et abus de workflow.
4. Documenter les formules XAF/bps, policy de reliquat et idempotency keys avant de coder.

## User stories

### Story 12.1 - Schema resultats

Etapes :

1. Finaliser `GameResult`.
2. Finaliser `PrizeDistribution`.
3. Ajouter `CommissionRecord`.
4. Ajouter `DisputeWindow`.
5. Ajouter idempotency keys.

Tests :

- Distribution unique.
- Result immutable apres finalisation.

### Story 12.2 - Finalisation session

Etapes :

1. Creer `POST /v1/admin/sessions/:id/finalize`.
2. Verifier session terminable.
3. Charger resultats de rounds.
4. Calculer winners.
5. Calculer prize pool, commission, reliquat.
6. Passer session `FINISHED`.
7. Publier event distribution.

Tests :

- Finalize OK.
- Double finalize refuse/idempotent.
- Tie policy requise si egalite non resolue.

### Story 12.3 - Distribution credits

Etapes :

1. Creer worker `credits.distribute`.
2. Crediter chaque gagnant via wallet ledger.
3. Utiliser idempotency key par session/winner.
4. Reprendre apres crash.
5. Publier resultats.

Tests :

- Double job ne double pas credit.
- Crash au milieu reprend.
- Ledger complet.

### Story 12.4 - Consultation resultats

Etapes :

1. Creer `GET /v1/sessions/:id/results`.
2. Creer `GET /v1/admin/sessions/:id/results`.
3. Masquer donnees financieres non publiques.
4. Ajouter correction request.

Tests :

- Joueur voit recap autorise.
- Admin voit detail.
- Correction exige role + reason.

## Definition of Done

- Criteres de tests a valider :
  - Tests unitaires calcul prize pool, commission, winner split, reliquat.
  - Tests integration finalize session.
  - Tests idempotence distribution.
  - Tests recovery worker crash au milieu distribution.
  - Tests ledger/wallet credits.
  - Tests correction exige role + reason + audit.
  - Test E2E session terminee -> resultats -> wallet credite.
- Resultats officiels figes.
- Distribution idempotente.
- Wallet credite via ledger.
- Aucun cash-out V1.


---

## FILE: `docs/plan/13-dashboard-admin-audit-support.md`

# Feature 13 - Plan Scrum - Dashboard admin, audit et support

## Objectif sprint

Fournir les vues et actions admin/support/finance necessaires pour exploiter les sessions sans casser l integrite.

## Dependances

- Feature 02 RBAC.
- Features 04 a 12 selon vues activees.

## Gate documentaire obligatoire

Avant implementation :

1. Lire via Context7 Next.js pour architecture admin UI et data loading.
2. Lire via Context7 Hono pour middleware auth/role/requestId.
3. Lire via Context7 Prisma pour requetes admin, pagination et filtres audit.
4. Lire OWASP Authorization/Logging pour least privilege et audit.
5. Documenter la matrice de roles avant de coder les endpoints.

## User stories

### Story 13.1 - Dashboard admin

Etapes :

1. Creer `GET /v1/admin/dashboard`.
2. Ajouter KPIs sessions, paiements, inscriptions, live, incidents.
3. Creer page admin.
4. Filtrer selon role.

Tests :

- Admin voit dashboard.
- Support voit scope limite.
- Player refuse.

### Story 13.2 - Audit logs

Etapes :

1. Standardiser `AuditLog`.
2. Creer `GET /v1/admin/audit-logs`.
3. Filtrer par actor/action/target/requestId.
4. Interdire suppression audit.

Tests :

- Audit ecrit pour actions sensibles.
- Recherche par target.
- Suppression impossible.

### Story 13.3 - Support utilisateur

Etapes :

1. Creer `GET /v1/admin/support/users/:id`.
2. Afficher profil, registrations, paiements, wallet resume.
3. Masquer secrets provider.
4. Creer `SupportCase`.

Tests :

- Support voit donnees utiles.
- Secrets non visibles.
- Finance voit ledger sans controle gameplay.

### Story 13.4 - Actions sensibles

Etapes :

1. Creer workflow `admin.action-requested`.
2. Exiger role + reason.
3. Ajouter approval si action critique.
4. Ecrire before/after.

Tests :

- Reason obligatoire.
- Role insuffisant refuse.
- Audit complet.

## Definition of Done

- Criteres de tests a valider :
  - Tests RBAC par role admin/support/finance/super admin.
  - Tests integration dashboard et filtres audit.
  - Tests audit ecrit pour chaque action sensible.
  - Tests secrets provider masques.
  - Tests action sensible sans reason refusee.
  - Test E2E support : recherche utilisateur -> consultation sans fuite.
- Dashboard utilisable.
- Audit exploitable.
- Support peut aider sans secrets.
- Actions sensibles tracees.


---

## FILE: `docs/plan/14-notifications-whatsapp.md`

# Feature 14 - Plan Scrum - Notifications et WhatsApp

## Objectif sprint

Informer les joueurs et communautes sans rendre WhatsApp critique pour le fonctionnement de la plateforme.

## Dependances

- Feature 01 liens partageables.
- Feature 05/06/08/12 events produit.

## Gate documentaire obligatoire

Avant implementation :

1. Lire la documentation officielle Meta WhatsApp Business Platform si la gateway est implementee.
2. Lire via Context7 BullMQ pour rappels retardes et deduplication.
3. Lire via Context7 Hono pour webhook WhatsApp.
4. Lire via Context7 Prisma pour logs de livraison et preferences.
5. Documenter opt-in, templates, limites et comportement en cas d echec avant de coder.

## User stories

### Story 14.1 - Notifications in-app

Etapes :

1. Creer `NotificationPreference`.
2. Creer `NotificationJob`.
3. Creer `DeliveryLog`.
4. Ajouter notifications inscription, paiement, check-in, resultats.
5. Afficher notifications dans web app.

Tests :

- Notification creee.
- Joueur voit ses notifications.
- Autre joueur refuse.

### Story 14.2 - Rappels planifies

Etapes :

1. Creer jobs BullMQ rappels check-in/start.
2. Utiliser `jobId` unique.
3. Annuler rappel si session annulee.
4. Reessayer en cas d echec.

Tests :

- Rappel envoye.
- Doublon evite.
- Session annulee pas de rappel.

### Story 14.3 - Liens de partage admin

Etapes :

1. Creer `POST /v1/admin/notifications/session/:id/share`.
2. Generer message partageable.
3. Ne pas inclure donnees privees.
4. Journaliser partage.

Tests :

- Message cree.
- Session private ne fuite pas.
- Player refuse.

### Story 14.4 - Gateway WhatsApp optionnelle

Etapes :

1. Creer service placeholder ou gateway.
2. Creer `POST /v1/webhooks/whatsapp`.
3. Gerer opt-in.
4. Gerer templates.
5. S assurer qu un echec WhatsApp ne bloque rien.

Tests :

- Opt-in requis.
- Gateway down non bloquante.
- Webhook valide.

## Definition of Done

- Criteres de tests a valider :
  - Tests unitaires template/message safe.
  - Tests integration preferences et notifications in-app.
  - Tests BullMQ rappels deduplices.
  - Tests opt-in requis pour WhatsApp non transactionnel.
  - Tests gateway down non bloquante.
  - Test privacy : pas de donnees privees dans message partage.
- Notifications critiques visibles web app.
- Rappels deduplices.
- WhatsApp optionnel.
- Aucun blocage coeur produit par WhatsApp.


---

## FILE: `docs/plan/15-securite-anti-triche-conformite.md`

# Feature 15 - Plan Scrum - Securite, anti-triche, conformite

## Objectif sprint

Durcir toute la plateforme : session, autorisation, anti-cheat, anti-fraude, moderation, audit et gates de conformite.

## Dependances

- Toutes les features 01 a 14.
- Peut aussi etre travaillee transversalement a chaque sprint.

## Gate documentaire obligatoire

Avant implementation :

1. Lire les references OWASP actuelles : Session Management, Authorization, API Security, Business Logic, Logging, Password Storage.
2. Lire via Context7 Hono pour secure headers, body limit, cookies, requestId, validation et rate limiting si librairie retenue.
3. Lire via Context7 Next.js pour Data Security et separation server/client.
4. Relire via Context7 Colyseus pour anti-cheat live si les signaux viennent des rooms.
5. Lire la documentation de toute librairie de rate limit, device fingerprint ou validation avant installation.
6. Documenter les menaces, controles, tests adversariaux et gates compliance avant de coder.

## User stories

### Story 15.1 - Securite API et session

Etapes :

1. Verifier cookies `HttpOnly`, `Secure`, `SameSite`.
2. Ajouter secure headers.
3. Ajouter body limit.
4. Ajouter CSRF si necessaire.
5. Ajouter rate limits par feature sensible.
6. Tester BOLA sur endpoints ID.

Tests :

- Cookies securises.
- Rate limit.
- BOLA refuse.
- Headers presents.

### Story 15.2 - Anti-cheat gameplay

Etapes :

1. Ajouter `AntiCheatEvent`.
2. Ajouter action nonce.
3. Detecter double submit.
4. Detecter action rate anormale.
5. Journaliser latence abusive.
6. Lier signals aux rounds.

Tests :

- Double submit detecte.
- Auto-click signale.
- Late input refuse.

### Story 15.3 - Anti-fraude et multi-compte

Etapes :

1. Ajouter `RiskSignal`.
2. Ajouter signaux IP, device hash, paiement, telephone/email.
3. Ajouter scoring simple.
4. Ajouter vue admin risk.
5. Ne pas bloquer automatiquement sans policy explicite sauf cas critique.

Tests :

- Signal cree.
- Plusieurs comptes suspects remontent.
- Donnees sensibles masquees.

### Story 15.4 - Compliance gates

Etapes :

1. Ajouter `ComplianceGate`.
2. Bloquer cash-out V1.
3. Bloquer mini-jeux hasard dominant non valides.
4. Bloquer publication si wording/legal gate non valide.
5. Ajouter checklist legal avant public launch.

Tests :

- Withdrawal disabled.
- Game hasard bloque.
- Gate empeche lancement public.

### Story 15.5 - Moderation et litiges

Etapes :

1. Creer `POST /v1/support/disputes`.
2. Creer `POST /v1/admin/moderation/actions`.
3. Exiger role + reason.
4. Ecrire audit.
5. Lier replay de round si litige gameplay.

Tests :

- Litige cree.
- Moderation auditee.
- Role insuffisant refuse.

## Definition of Done

- Criteres de tests a valider :
  - Tests securite cookies, headers, rate limits.
  - Tests BOLA sur tous les endpoints ID sensibles.
  - Tests anti-cheat double submit, auto-click, late input.
  - Tests webhook signature failure.
  - Tests double payout/double debit/double inscription.
  - Tests compliance gates : cash-out bloque, hasard dominant bloque, publication risquee bloquee.
  - Tests audit/moderation role + reason.
- Securite transversale testee.
- Anti-cheat minimum actif.
- Cash-out bloque.
- Legal/compliance gates visibles.
- Tests adversariaux passent.


---

## FILE: `docs/plan/16-finalisation-recette-lancement.md`

# Sprint final - Recette, stabilisation et lancement

## Objectif sprint

Verifier que le produit complet fonctionne de bout en bout, que les risques critiques sont maitrises et que la V1 peut etre lancee en environnement controle.

## Gate documentaire obligatoire

Avant recette finale :

1. Reexecuter le gate documentaire pour toutes les technologies effectivement installees.
2. Comparer versions installees, lockfile et documentation lue.
3. Verifier les breaking changes connus pour Colyseus, Prisma, Next.js, Hono, BullMQ, Redis, Fapshi et WhatsApp.
4. Bloquer le go/no-go si une implementation depend d une API non documentee ou d une version contradictoire.
5. Archiver dans la recette finale les library IDs Context7, URLs officielles et versions validees.

## Parcours de recette E2E obligatoires

### Parcours 1 - Decouverte et inscription

Etapes :

1. Visiteur ouvre landing.
2. Visiteur consulte catalogue.
3. Visiteur ouvre detail session PUBLIC.
4. Visiteur cree compte.
5. Joueur s inscrit.
6. Joueur initie paiement.

Validation :

- Aucun wording interdit.
- Session visible correcte.
- Compte cree.
- Registration pending.

### Parcours 2 - Paiement et lobby

Etapes :

1. Paiement Fapshi sandbox.
2. Webhook SUCCESS.
3. Registration passe PAID.
4. Joueur entre lobby.
5. Joueur check-in.
6. Join token genere.

Validation :

- Webhook secret verifie.
- Paiement idempotent.
- Lobby refuse non paid.
- Join token single-use.

### Parcours 3 - Live et resolution

Etapes :

1. Admin start session.
2. Joueurs entrent room.
3. Round demarre.
4. Actions soumises.
5. Deadline atteinte.
6. Game-engine resout round.
7. Eliminations/qualifications persistées.

Validation :

- Timer officiel DB.
- Late inputs refuses.
- Reconnexion fonctionne.
- Resolution rejouable.

### Parcours 4 - Resultats et credits

Etapes :

1. Session terminee.
2. Admin/systeme finalise.
3. Gagnants calcules.
4. Worker distribue credits.
5. Wallet et ledger mis a jour.
6. Resultats publies.

Validation :

- Distribution idempotente.
- Aucun double credit.
- Ledger balance coherent.
- Cash-out indisponible.

### Parcours 5 - Support et audit

Etapes :

1. Support cherche utilisateur.
2. Finance consulte paiement.
3. Admin consulte audit.
4. Litige cree.
5. Replay round execute.

Validation :

- RBAC respecte.
- Secrets provider masques.
- Audit complet.
- Replay identique ou mismatch signale.

## Tests finaux

- Unit tests tous packages.
- Integration tests API/DB.
- E2E web critiques.
- Tests concurrence : inscription derniere place, double paiement, double debit wallet, double distribution.
- Tests securite : auth, RBAC, BOLA, rate limit, webhook secret.
- Tests recovery : worker retry, game-server crash, webhook replay.
- Tests observabilite : logs requestId, audit logs, metriques critiques.

## Checklist pre-lancement

- Environnement production configure.
- Secrets production separes.
- Fapshi live valide.
- Backups PostgreSQL actives.
- Monitoring et alertes actives.
- Politique confidentialite et CGU pretes.
- Avis legal sur competition payante/gains/wallet obtenu ou lancement limite sans cash-out.
- Plan support incident pret.
- Rollback plan documente.

## Definition of Done projet

- Criteres de tests a valider :
  - Typecheck, lint, tests unitaires, integration et E2E passent en CI.
  - Tous les parcours de recette E2E obligatoires sont executes.
  - Tests de concurrence critiques passent.
  - Tests securite critiques passent.
  - Tests recovery critiques passent.
  - Tests observabilite/audit passent.
  - Rapport de tests final archive avec version, commit, environnement et anomalies restantes.
- Tous les parcours E2E critiques passent.
- Aucune faille critique connue.
- Aucune incoherence ledger/wallet.
- Aucun endpoint admin sans RBAC.
- Aucun retrait argent reel en V1.
- Product Owner accepte la demo finale.
- Go/no-go documente.


---

## FILE: `docs/plan/README.md`

# Plan d implementation Scrum - Plateforme de sessions de jeu

Date : 2026-07-07
Statut : plan de developpement executable

## Objectif

Ce dossier transforme les PRD de `prd/features/` en plan de developpement Scrum. Il donne l ordre de construction depuis l initialisation technique jusqu aux derniers tests de recette.

## Methode Scrum retenue

- Sprint court de 1 a 2 semaines.
- Chaque feature est livree comme un increment vertical testable.
- Chaque sprint commence par refinement + sprint planning.
- Chaque jour : daily courte, blocages, risques.
- Chaque fin de sprint : demo, retrospective, mise a jour du backlog.
- Aucune feature n est consideree terminee sans tests, revue, documentation et criteres d acceptation valides.

## Gate documentaire obligatoire avant implementation

Ce gate bloque le developpement. Aucun agent ne doit installer, importer ou coder une librairie, un framework, un SDK, une API externe ou un service cloud sans avoir lu la documentation actuelle.

Pour chaque story technique :

1. Lister les technologies touchees : Next.js, Hono, Prisma, PostgreSQL, Colyseus, BullMQ, Redis, Fapshi, WhatsApp, Docker, OWASP ou autre.
2. Pour chaque librairie/framework/SDK/API/CLI/cloud service, lancer Context7 :
   - `npx ctx7@latest library <Nom officiel> "<question complete de la story>"`
   - choisir l ID le plus pertinent.
   - `npx ctx7@latest docs <libraryId> "<question complete de la story>"`
3. Noter dans la story :
   - library ID utilise ;
   - version/package installe ou vise ;
   - imports exacts verifies ;
   - exemple officiel ou page officielle utilisee ;
   - peer dependencies ;
   - contraintes TypeScript/config ;
   - decisions prises et risques restants.
4. Si Context7 echoue par quota, stopper la story et demander `npx ctx7@latest login` ou `CONTEXT7_API_KEY`.
5. Si Context7 ne couvre pas un provider, lire uniquement la documentation officielle du provider.
6. Ne jamais coder a partir de memoire, d une ancienne API supposee ou d une reponse LLM non verifiee.
7. Si la version installee ne correspond pas a la documentation lue, resoudre d abord le conflit de version avant de coder.

## Ordre recommande

1. `00-initialisation-projet.md`
2. `01-acquisition-catalogue-public.md`
3. `02-authentification-compte.md`
4. `04-configuration-sessions-admin.md`
5. `05-inscription-session.md`
6. `06-paiement-fapshi.md`
7. `07-wallet-ledger-credits.md`
8. `08-lobby-check-in.md`
9. `09-session-live-temps-reel.md`
10. `10-game-engine-resolution-rounds.md`
11. `11-catalogue-mini-jeux-configurables.md`
12. `12-resultats-gains-distribution.md`
13. `03-profil-joueur-historique.md`
14. `13-dashboard-admin-audit-support.md`
15. `14-notifications-whatsapp.md`
16. `15-securite-anti-triche-conformite.md`
17. `16-finalisation-recette-lancement.md`

## Definition of Ready

Une feature peut entrer en sprint seulement si :

- Le PRD feature existe dans `prd/features/`.
- Les dependances precedentes sont livrees ou mockees proprement.
- Les user stories sont decoupees.
- Les criteres d acceptation sont testables.
- Les risques securite, paiement, legal ou data sont identifies.
- Les donnees, API et evenements sont listes.
- Le gate documentaire obligatoire est execute pour toutes les technologies touchees.

## Criteres de tests obligatoires

Avant de marquer une story ou une feature comme terminee, l agent doit valider et documenter les tests suivants selon le perimetre touche :

- Tests unitaires : fonctions metier, calculs, transitions d etat, helpers, resolvers.
- Tests d integration : API + DB, transactions, permissions, erreurs normalisees, jobs.
- Tests E2E : parcours utilisateur critique depuis l UI jusqu a la persistance.
- Tests de concurrence : double clic, derniere place, double paiement, double debit wallet, double distribution.
- Tests de securite : auth, RBAC, BOLA, rate limits, cookies, webhook secret, donnees privees.
- Tests de recovery : retry worker, webhook rejoue, crash game-server, job relance.
- Tests d observabilite : audit log, requestId, evenement metier, metrique critique.
- Tests de non-regression : ancienne erreur reproduite puis bloquee par test.

Regle stricte :

- Une feature financiere, live, auth ou admin ne peut pas etre consideree terminee sans au minimum tests unitaires + integration + securite.
- Une feature exposee a l utilisateur ne peut pas etre consideree terminee sans au minimum un test E2E du parcours principal.
- Une feature qui touche paiement, wallet, capacite ou resultats ne peut pas etre consideree terminee sans test de concurrence/idempotence.
- Si un type de test est impossible, l agent doit expliquer pourquoi dans la fiche sprint et creer une tache technique de rattrapage.

## Definition of Done globale

Une feature est terminee seulement si :

- Schema DB/migrations appliquees.
- Backend implemente et teste.
- Frontend implemente et teste.
- Jobs/events necessaires implementes ou explicitement reportes.
- Validations, erreurs et permissions couvertes.
- Tests unitaires, integration et E2E pertinents passent.
- Les criteres de tests obligatoires de la fiche feature sont valides et documentes.
- Logs, metriques et audit minimum branches.
- Documentation mise a jour.
- Demo sprint acceptee par le Product Owner.


---

## FILE: `docs/prd/features/01-acquisition-catalogue-public.md`

# Feature 01 - Acquisition, landing et catalogue public des sessions

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Presenter le produit, exposer les sessions accessibles et convertir un visiteur vers une inscription sans vocabulaire de pari ni promesse de gain garanti.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Permettre aux visiteurs, joueurs existants et communautes venant de liens partages de comprendre le concept, consulter les sessions disponibles et acceder au bon parcours selon leur etat auth. |
| Target users | visiteurs non connectes, joueurs existants, communautes WhatsApp ou liens partages, admins marketing qui publient une session |
| Business value | Elevee: c est l entree du funnel acquisition, partage, remplissage des sessions et conversion vers inscription. |
| Technical complexity | Moyenne: pages publiques classiques, mais visibilite PUBLIC/UNLISTED/PRIVATE, statuts, capacite et wording legal prudent. |
| Risk level | Moyen: confusion produit, fuite d informations sur sessions privees, wording trop proche du pari ou des jeux d argent. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Landing publique, catalogue des sessions, page detail session, lien partageable et CTA vers auth/inscription.
- Filtrage serveur des sessions PUBLIC; resolution directe par slug/token pour UNLISTED; controle d acces strict pour PRIVATE.
- Calcul serveur des places restantes et statuts affichables; aucune confiance dans des compteurs client.
- Metadata SEO/social sharing et messages publics orientes competition structuree, adresse, strategie et experience sociale.

## Parcours et workflows

1. Visiteur ouvre le catalogue: l API retourne uniquement les sessions PUBLIC en statut publiable/inscriptible.
2. Visiteur ouvre un lien UNLISTED: le slug/token est resolu sans l ajouter aux listings publics.
3. Visiteur ouvre une session PRIVATE: invitation, allowlist ou code d acces est requis; sinon erreur non bavarde.
4. CTA session: utilisateur non connecte va vers register/login; utilisateur connecte va vers intention d inscription.

## Logiques metier et invariants

- Les sessions PUBLIC doivent etre listables.
- Les sessions UNLISTED ne doivent pas apparaitre dans le catalogue mais restent accessibles par lien valide.
- Les sessions PRIVATE exigent invitation, approbation, code ou allowlist.
- La page detail affiche prix, date, places restantes, statut, regles essentielles, politique no-show/remboursement et avertissements.
- placesRemaining = max(0, maxPlayers - activeRegistrationsCount), calcule cote serveur.
- activeRegistrationsCount exclut CANCELLED/REFUNDED et inclut PAYMENT_PENDING valides et PAID selon politique de reservation.
- Le wording public evite pari, mise, jackpot, gain garanti et toute promesse assimilable a un jeu d argent.

## Donnees principales

- `GameSession.visibility`
- `GameSession.status`
- `SessionCapacitySnapshot`
- `ShareLink ou SessionInvite`
- `PublicSessionCard`
- `SessionAccessCode optionnel`

## API et contrats

- `GET /v1/public/sessions`
- `GET /v1/public/sessions/:slug`
- `POST /v1/public/sessions/:slug/access-code`
- `GET /v1/share/:token`
- `POST /v1/sessions/:id/intent`

Erreurs et cas limites a normaliser :

- `404_SESSION_NOT_VISIBLE`
- `410_SESSION_CLOSED`
- `423_ACCESS_CODE_REQUIRED`
- `409_REGISTRATION_CLOSED`

## Evenements et jobs

- `session.published`
- `session.unlisted-link-created`
- `catalogue.capacity-updated`
- `share.link-opened`
- `cta.register-clicked`

## Securite, conformite et audit

- Ne jamais exposer les details d une session PRIVATE sans autorisation.
- Calculer statuts/capacite cote serveur.
- Limiter les informations d erreur pour ne pas confirmer l existence d une session privee.
- Valider le wording public avant publication commerciale.

## Criteres d acceptation

- PUBLIC listable, UNLISTED absent du listing mais accessible par lien, PRIVATE inaccessible sans autorisation.
- Calcul placesRemaining avec registrations PAYING/PAID/CANCELLED/REFUNDED.
- CTA selon etat auth.
- Metadata et social sharing.
- Absence de vocabulaire interdit dans les textes publics.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `catalogue_page_view`
- `session_detail_view`
- `cta_register_click`
- `share_link_open_rate`
- `public_sessions_error_rate`
- `private_access_denied_count`

## Dependances fonctionnelles

- Feature 02 Authentification pour CTA conditionnel
- Feature 04 Configuration session pour publication/visibilite
- Feature 05 Inscription pour intention
- Feature 14 Notifications/partage communautaire

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- Next.js metadata/pages publiques
- Prisma/PostgreSQL lecture sessions et capacite
- Hono API publique
- PRD_PHASE_1.md risque legal wording
- BRAINSTORMING.md visibilite et liens WhatsApp

References officielles techniques :

- Next.js App Router, Authentication, Data Security, Metadata: https://nextjs.org/docs/llms.txt
- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt
- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt
- PostgreSQL transaction isolation and retry expectations: https://www.postgresql.org/docs/current/transaction-iso.html

## Questions ouvertes

- Vocabulaire public final: session, tournoi, partie ou autre.
- Afficher ou non les montants de gains estimes avant paiement.
- Mecanisme PRIVATE final: code, invitation admin, allowlist ou combinaison.


---

## FILE: `docs/prd/features/02-authentification-compte.md`

# Feature 02 - Authentification et gestion de compte

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Creer et proteger les comptes joueurs/admins, les sessions serveur, les roles et l acces aux operations sensibles.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Permettre aux joueurs et admins de creer un compte, se connecter, gerer leur session serveur et proteger paiement, wallet, live, support et back-office. |
| Target users | joueurs, admins, support, finance, super admin |
| Business value | Elevee: auth obligatoire pour payer, jouer, tracer les actions, gerer le wallet et prevenir les abus. |
| Technical complexity | Moyenne a elevee: Hono, Prisma, sessions serveur, cookies securises, RBAC, audit, reset password et possible 2FA admin. |
| Risk level | Eleve: usurpation de compte, fixation de session, acces admin non autorise, multi-compte et fuite de donnees. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Registration joueur avec mot de passe choisi.
- Login/logout, reset password, session serveur en base et cookie securise.
- RBAC pour PLAYER, SUPPORT, FINANCE, ADMIN, SUPER_ADMIN.
- Audit des changements critiques et revocation de sessions.

## Parcours et workflows

1. Register: validation identifiant -> hash password -> creation User + PlayerProfile + AuthSession.
2. Login: verifier credentials -> regenerer session -> emettre cookie HttpOnly/Secure/SameSite.
3. Privilege change/reset: invalider ou regenerer sessions concernees.
4. Admin access: verifier role exact sur chaque endpoint, pas seulement dans UI.

## Logiques metier et invariants

- Le joueur choisit son mot de passe.
- Identifiant email ou telephone selon decision produit finale; admins email + mot de passe.
- Les sessions navigateur sont serveur-side avec cookie securise.
- Les roles distinguent joueur, support, finance, admin, super admin.
- Tout changement critique de compte produit un AuditLog.
- Regeneration de session apres login et changement de privilege.
- Deny by default sur endpoints sensibles.

## Donnees principales

- `User`
- `PlayerProfile`
- `AuthSession`
- `PasswordResetToken`
- `RoleAssignment`
- `AuditLog`

## API et contrats

- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/logout`
- `POST /v1/auth/password/request-reset`
- `POST /v1/auth/password/reset`
- `GET /v1/me`

Erreurs et cas limites a normaliser :

- `409_EMAIL_ALREADY_USED`
- `409_PHONE_ALREADY_USED`
- `401_INVALID_CREDENTIALS`
- `403_ACCOUNT_DISABLED`
- `403_ROLE_REQUIRED`
- `429_LOGIN_RATE_LIMITED`

## Evenements et jobs

- `auth.user-created`
- `auth.login-succeeded`
- `auth.login-failed`
- `auth.session-revoked`
- `account.critical-change`
- `role.changed`

## Securite, conformite et audit

- Hash passwords with a slow password hashing function; never store plaintext.
- Cookie HttpOnly, Secure, SameSite, expiration and rotation.
- Protect against session fixation and replay.
- Rate limit login/reset endpoints.
- Store only minimal personal data and avoid secrets in logs.

## Criteres d acceptation

- Register duplicate email/phone.
- Login invalid password and rate limiting.
- Cookie attributes.
- Session rotation after login/role change.
- Admin endpoint denied for PLAYER/SUPPORT if role insufficient.
- Reset token expired/used twice.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `login_success_rate`
- `login_failed_rate`
- `password_reset_request_rate`
- `invalid_session_rate`
- `authorization_denied_rate`
- `admin_login_count`

## Dependances fonctionnelles

- Feature 03 PlayerProfile
- Feature 05 inscription requires auth
- Feature 13 admin dashboard RBAC
- Feature 15 security/compliance

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- OWASP Session Management and Authorization
- Next.js Authentication/Data Security
- Hono cookies/middleware
- Prisma transactions for User + PlayerProfile + AuthSession

References officielles techniques :

- Next.js App Router, Authentication, Data Security, Metadata: https://nextjs.org/docs/llms.txt
- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt
- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt
- PostgreSQL transaction isolation and retry expectations: https://www.postgresql.org/docs/current/transaction-iso.html
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP Authorization / API Security / Business Logic / Logging guidance: https://cheatsheetseries.owasp.org/

## Questions ouvertes

- Email, telephone or both for player identity.
- 2FA admin in V1 or post-MVP.
- Email/phone verification timing.
- Anti multi-compte policy.


---

## FILE: `docs/prd/features/03-profil-joueur-historique.md`

# Feature 03 - Profil joueur et historique

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Donner au joueur une identite de jeu, un historique, des statistiques derivees et une vue lisible de ses sessions.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Permettre au joueur de consulter et modifier son profil, voir ses sessions futures/en cours/passees, et comprendre ses statistiques sans exposer ses donnees sensibles. |
| Target users | joueurs, admins support, autres joueurs si profil public active |
| Business value | Moyenne: retention, confiance, progression et support; non critique au premier paiement mais important pour la boucle long terme. |
| Technical complexity | Faible a moyenne: profil et historique classiques, mais stats doivent etre derivees des resultats officiels et du ledger. |
| Risk level | Moyen: fuite de donnees privees, statistiques incoherentes, exposition financiere ou confusion entre badges et preuves de paiement. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Profil prive complet joueur.
- Profil public minimal optionnel.
- Historique sessions futures, en cours, terminees, annulees, no-show.
- Statistiques derivees des resultats officiels et ledger.

## Parcours et workflows

1. Joueur consulte /me: profil, sessions a venir, wallet resume si autorise.
2. Joueur modifie pseudo/avatar: validation unicite/format puis audit leger.
3. Stats recomputees apres finalisation session/resultats.
4. Profil public masque email, telephone, wallet, ledger et details financiers.

## Logiques metier et invariants

- Un profil joueur est rattache a un User unique.
- Les statistiques sont derivees des resultats officiels, jamais saisies manuellement.
- Le profil public ne doit pas exposer donnees financieres, telephone, email ou details sensibles.
- L historique distingue sessions futures, live, terminees, annulees et no-show.
- Badges/achievements ne valent pas preuve financiere.
- Credits gagnes visibles derives du ledger, pas d un champ decoratif.

## Donnees principales

- `PlayerProfile`
- `AvatarAsset`
- `PlayerStatsSnapshot`
- `SessionRegistration`
- `GameResult`
- `RoundResult`
- `Wallet/LedgerEntry pour credits affichables`

## API et contrats

- `GET /v1/players/me`
- `PATCH /v1/players/me`
- `GET /v1/players/me/history`
- `GET /v1/players/me/stats`
- `GET /v1/players/:publicId`

Erreurs et cas limites a normaliser :

- `400_INVALID_NICKNAME`
- `409_NICKNAME_TAKEN`
- `403_PROFILE_PRIVATE`
- `404_PLAYER_NOT_FOUND`

## Evenements et jobs

- `profile.updated`
- `stats.recomputed`
- `avatar.changed`
- `profile.visibility-changed`

## Securite, conformite et audit

- Distinguer profil prive et public.
- Verifier ownership sur toutes les routes /me.
- Ne jamais exposer wallet/ledger d un autre joueur.
- Limiter upload avatar si active.

## Criteres d acceptation

- Stats recalculables depuis resultats persistants.
- Sessions annulees/remboursees exclues ou affichees separement.
- Profil public masque donnees privees.
- Un joueur ne lit pas historique prive d un autre.
- PATCH pseudo/avatar valide formats et unicite.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `profile_view_count`
- `profile_update_count`
- `stats_recompute_duration_ms`
- `stats_mismatch_detected`
- `avatar_upload_failure_rate`

## Dependances fonctionnelles

- Feature 02 Authentification
- Feature 07 Wallet/ledger
- Feature 10 Game engine
- Feature 12 Resultats

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- BRAINSTORMING.md PlayerProfile/historique/statistiques
- deep-research-report.md stats derivees
- Next.js Data Security
- Prisma queries/transactions

References officielles techniques :

- Next.js App Router, Authentication, Data Security, Metadata: https://nextjs.org/docs/llms.txt
- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt
- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt

## Questions ouvertes

- Activer profil public en V1 ou plus tard.
- Politique avatar: upload, preset, ou externe.
- Liste exacte des stats publiques.


---

## FILE: `docs/prd/features/04-configuration-sessions-admin.md`

# Feature 04 - Creation et configuration des sessions admin

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Permettre a l admin de creer une GameSession autonome, rentable, controlee, auditee et publiable.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Configurer prix, capacite, visibilite, planning, nombre de gagnants, repartition, commission, rounds et statut de publication. |
| Target users | admins, organisateurs internes, futurs organisateurs externes si marketplace ulterieure |
| Business value | Tres elevee: coeur de la monetisation, chaque session doit etre rentable independamment. |
| Technical complexity | Elevee: modele economique, regles de jeu, statuts, paiement, planning, audit et simulation financiere. |
| Risk level | Eleve: session non rentable, injuste, juridiquement risquee, impossible a executer ou modifiee apres paiements. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- CRUD admin GameSession en DRAFT.
- Configuration economique, capacite, visibilite et rounds.
- Simulation rentabilite avant publication.
- Publication/cancel avec audit et blocage des mutations sensibles apres paiement.

## Parcours et workflows

1. Admin cree DRAFT avec champs minimaux.
2. Admin configure rounds et gains; systeme valide invariants.
3. Simulation affiche collecte brute, frais, net, prize pool et commission.
4. Publication refusee si incoherence; apres inscriptions payees, changements sensibles bloques ou versionnes.

## Logiques metier et invariants

- Une session commence en DRAFT puis peut etre publiee et ouverte aux inscriptions.
- minPlayers >= 2 et maxPlayers >= minPlayers.
- entryFeeXaf >= minimum provider/payment amount.
- 0 <= prizePoolBps <= 10000 et sum(winnerSplitBps) = 10000.
- startsAt > now et registrationClosesAt <= startsAt.
- Toute modification sensible doit etre auditee.
- Une session publiee avec joueurs payes ne doit pas etre modifiee librement.

## Donnees principales

- `GameSession`
- `SessionConfig`
- `PrizeConfig`
- `RoundConfig`
- `MiniGameDefinition`
- `AuditLog`
- `configVersion`

## API et contrats

- `POST /v1/admin/sessions`
- `PATCH /v1/admin/sessions/:id`
- `POST /v1/admin/sessions/:id/publish`
- `POST /v1/admin/sessions/:id/open-registration`
- `POST /v1/admin/sessions/:id/cancel`
- `GET /v1/admin/sessions/:id/simulation`

Erreurs et cas limites a normaliser :

- `400_INVALID_CAPACITY`
- `400_INVALID_PRIZE_SPLIT`
- `409_CONFIG_VERSION_CONFLICT`
- `409_PAID_REGISTRATIONS_EXIST`
- `403_ADMIN_ROLE_REQUIRED`

## Evenements et jobs

- `session.draft-created`
- `session.config-updated`
- `session.published`
- `session.registration-opened`
- `session.cancelled`

## Securite, conformite et audit

- Admin RBAC strict.
- Audit before/after/reason pour champs sensibles.
- OCC via configVersion ou transaction Serializable.
- Ne pas publier si marge negative ou hasard/regle non validee.

## Criteres d acceptation

- Publication refusee si prix/capacite/repartition invalides.
- Simulation financiere correcte en XAF entiers et bps.
- Modification concurrente avec configVersion.
- Modification sensible bloquee apres inscription PAID.
- Audit obligatoire sur publish/cancel/economic changes.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `admin_session_created_count`
- `session_publish_failure_count`
- `negative_margin_blocked_count`
- `config_conflict_rate`
- `admin_change_without_reason_blocked`

## Dependances fonctionnelles

- Feature 01 catalogue public
- Feature 05 inscription
- Feature 10 game engine
- Feature 11 mini-jeux
- Feature 13 dashboard admin

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- deep-research-report.md invariants financiers XAF/bps
- BRAINSTORMING.md GameSession et statuts
- Prisma OCC/transactions
- PostgreSQL isolation

References officielles techniques :

- Next.js App Router, Authentication, Data Security, Metadata: https://nextjs.org/docs/llms.txt
- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt
- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt
- PostgreSQL transaction isolation and retry expectations: https://www.postgresql.org/docs/current/transaction-iso.html
- OWASP Authorization / API Security / Business Logic / Logging guidance: https://cheatsheetseries.owasp.org/

## Questions ouvertes

- Valeurs par defaut prix/commission/gagnants.
- Politique exacte de modification apres publication.
- Session templates necessaires en V1 ou post-MVP.


---

## FILE: `docs/prd/features/05-inscription-session.md`

# Feature 05 - Inscription joueur a une session

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Permettre a un joueur connecte de reserver une place, declencher le paiement et suivre son statut d inscription.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Transformer une intention de participation en inscription suivable, sans depasser la capacite ni permettre double inscription ou place bloquee indefiniment. |
| Target users | joueurs connectes, support |
| Business value | Tres elevee: principal point de conversion entre intention et revenu. |
| Technical complexity | Moyenne a elevee: capacite, expiration, concurrence, statut d inscription, paiement Fapshi ou wallet. |
| Risk level | Eleve: double paiement, place bloquee, session pleine, paiement tardif, incoherence d inscription. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Creation SessionRegistration.
- Reservation temporaire ou directe selon politique paiement.
- Prevention double inscription et depassement maxPlayers.
- Paiement via Fapshi ou wallet.
- Annulation/expiration selon policy.

## Parcours et workflows

1. Joueur clique register: API verifie auth, session ouverte, capacite, absence d inscription active.
2. Registration creee en CREATED/PAYMENT_PENDING avec paymentDeadlineAt si reservation pre-paiement.
3. Paiement Fapshi ou wallet valide fait passer PAID.
4. Worker expire registration/payment pending et libere place selon politique.

## Logiques metier et invariants

- Un joueur s inscrit a une session precise, pas a un tournoi global.
- Une inscription ne devient active qu apres paiement confirme ou paiement wallet valide.
- La capacite maximale est protegee contre les doubles reservations concurrentes.
- Session fermee, annulee, complete ou non publiee refuse inscription.
- Un joueur ne peut pas detenir deux inscriptions actives dans la meme session.
- La politique no-show/remboursement est visible avant paiement.

## Donnees principales

- `SessionRegistration`
- `RegistrationStatus`
- `PaymentIntent`
- `CapacityReservation`
- `AuditLog`
- `paymentDeadlineAt`

## API et contrats

- `POST /v1/sessions/:id/register`
- `GET /v1/sessions/:id/registration`
- `POST /v1/registrations/:id/cancel`
- `POST /v1/registrations/:id/pay-with-wallet`

Erreurs et cas limites a normaliser :

- `409_ALREADY_REGISTERED`
- `409_SESSION_FULL`
- `423_REGISTRATION_CLOSED`
- `410_SESSION_CANCELLED`
- `409_PAYMENT_PENDING_EXISTS`

## Evenements et jobs

- `registration.created`
- `registration.awaiting-payment`
- `registration.paid`
- `registration.cancelled`
- `registration.expired`

## Securite, conformite et audit

- Transaction Serializable ou OCC sur capacite.
- Unique active registration par user/session.
- Idempotency key pour double clic.
- Aucune confiance dans placesRemaining client.
- Audit support cancellations.

## Criteres d acceptation

- Deux requetes simultanees ne depassent pas maxPlayers.
- Double clic register cree une seule registration active.
- Inscription impossible si session non ouverte.
- Expiration worker libere place.
- Paiement tardif apres expiration applique politique explicite.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `registration_create_success`
- `seat_contention_rate`
- `duplicate_registration_blocked_count`
- `payment_pending_timeout_count`
- `registration_expired_count`

## Dependances fonctionnelles

- Feature 02 Authentification
- Feature 04 session config
- Feature 06 Fapshi
- Feature 07 wallet
- Feature 08 lobby

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- BRAINSTORMING.md SessionRegistrationStatus
- deep-research-report.md workflow inscription et contention
- Prisma/PostgreSQL transactions
- BullMQ expiration

References officielles techniques :

- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt
- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt
- PostgreSQL transaction isolation and retry expectations: https://www.postgresql.org/docs/current/transaction-iso.html
- BullMQ jobs, delayed jobs, retries and jobId deduplication: https://docs.bullmq.io/readme.md
- OWASP Authorization / API Security / Business Logic / Logging guidance: https://cheatsheetseries.owasp.org/

## Questions ouvertes

- Reserve-t-on une place avant paiement ou seulement apres paiement.
- Duree paymentDeadlineAt.
- Politique annulation joueur avant paiement/apres paiement.


---

## FILE: `docs/prd/features/06-paiement-fapshi.md`

# Feature 06 - Paiement Fapshi et validation transactionnelle

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Collecter les paiements via Fapshi, recevoir les webhooks, verifier les statuts et marquer les inscriptions payees de facon idempotente.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Transformer une intention d inscription en paiement confirme, verifie, auditable et reconciliable. |
| Target users | joueurs, support, finance |
| Business value | Critique: sans paiement fiable, pas de revenu, pas de confiance et pas de session valide. |
| Technical complexity | Elevee: webhooks, secrets, idempotence, reconciliation, sandbox/live, limites polling et transactions DB. |
| Risk level | Tres eleve: faux positif paiement, double confirmation, webhook replay, paiement non associe, expiration ou contradiction provider. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Initiation Fapshi hosted checkout.
- Stockage providerTransId/externalId.
- Webhook-first avec verification x-wh-secret.
- Idempotence payment -> registration PAID -> ledger si applicable.
- Reconciliation worker pour webhook manque.

## Parcours et workflows

1. API cree Payment PENDING et appelle Fapshi initiate-pay.
2. Fapshi retourne link et transId; API les persiste et renvoie checkoutUrl.
3. Webhook Fapshi arrive: verifier x-wh-secret, dedupliquer evenement, traiter transition en transaction courte.
4. Worker reconcile verifie les paiements ambigus en respectant les limites provider.

## Logiques metier et invariants

- L API cree la transaction Fapshi, pas Colyseus.
- Fapshi retourne link et transId pour paiement hosted checkout.
- Webhook source principale de changement de statut.
- Webhook verifie par x-wh-secret.
- Traitement webhook idempotent.
- Polling uniquement en secours/reconciliation avec rate limit.
- Montants stockes en entiers XAF.

## Donnees principales

- `PaymentTransaction`
- `FapshiTransaction`
- `WebhookEvent`
- `SessionRegistration`
- `AuditLog`
- `IdempotencyKey`

## API et contrats

- `POST /v1/payments/fapshi/initiate`
- `POST /v1/webhooks/fapshi`
- `GET /v1/payments/:id/status`
- `POST /v1/admin/payments/:id/reconcile`

Erreurs et cas limites a normaliser :

- `401_INVALID_WEBHOOK_SECRET`
- `409_PAYMENT_ALREADY_PROCESSED`
- `404_PAYMENT_NOT_FOUND`
- `409_REGISTRATION_EXPIRED`
- `502_PROVIDER_UNAVAILABLE`

## Evenements et jobs

- `payment.initiated`
- `payment.webhook-received`
- `payment.successful`
- `payment.failed`
- `payment.expired`
- `payment.reconciled`

## Securite, conformite et audit

- Secrets Fapshi en infrastructure, jamais client.
- Verification x-wh-secret pour webhook.
- providerTransId unique et idempotent.
- Reponse webhook rapide 200 apres validation minimale.
- Audit des reconciliations manuelles.
- Aucun paiement decide par game-server.

## Criteres d acceptation

- Webhook sans x-wh-secret valide rejete.
- Webhook repete ne double pas paiement, registration PAID ou ledger.
- Paiement confirme marque inscription PAID dans la meme transaction logique.
- Webhook pour payment inconnu ou tardif applique politique.
- Polling respecte limites provider.
- Sandbox/live credentials separes.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `payment_initiated_count`
- `payment_success_rate`
- `webhook_signature_failures`
- `webhook_delay_seconds`
- `payment_reconciliation_count`
- `payment_duplicate_prevented_count`

## Dependances fonctionnelles

- Feature 05 inscription
- Feature 07 wallet/ledger
- Feature 13 admin finance
- Feature 15 security

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- Fapshi initiate-pay/webhook/payment-status
- PRD_PHASE_1.md recherche Fapshi
- deep-research-report.md sequence paiement
- Hono webhook route
- Prisma/PostgreSQL idempotence
- BullMQ reconciliation

References officielles techniques :

- Fapshi initiate-pay, payment status, webhook, sandbox/live and x-wh-secret: https://docs.fapshi.com/llms.txt
- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt
- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt
- PostgreSQL transaction isolation and retry expectations: https://www.postgresql.org/docs/current/transaction-iso.html
- BullMQ jobs, delayed jobs, retries and jobId deduplication: https://docs.bullmq.io/readme.md
- OWASP Authorization / API Security / Business Logic / Logging guidance: https://cheatsheetseries.owasp.org/

## Questions ouvertes

- Hosted checkout uniquement ou direct-pay aussi.
- Politique paiement reussi mais session pleine/annulee.
- Validation manuelle: roles, preuves, delais et audit.


---

## FILE: `docs/prd/features/07-wallet-ledger-credits.md`

# Feature 07 - Wallet interne, ledger et credits

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Gerer les credits internes non retirables en V1, tracer tous les mouvements financiers et payer de futures sessions via wallet.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Garantir un historique financier auditables, des soldes coherents et une reutilisation interne des gains sans retrait argent reel non valide juridiquement. |
| Target users | joueurs, support, finance |
| Business value | Tres elevee: retention, reutilisation des gains et confiance financiere. |
| Technical complexity | Tres elevee: toute mutation de solde doit etre transactionnelle, idempotente, auditable et reconstructible depuis le ledger. |
| Risk level | Tres eleve: erreurs de solde, fraude, litiges, qualification juridique wallet/retraits. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Wallet balance comme cache controle.
- LedgerEntry comme source d historique financier.
- Paiement inscription par wallet.
- Credit de gains internes.
- Ajustement admin avec reason/audit.
- Retrait argent reel bloque en V1.

## Parcours et workflows

1. Credit prize: resultats finalises -> distribution idempotente -> LedgerEntry CREDIT + wallet.balance update.
2. Pay registration: read balance -> verify >= amount -> LedgerEntry DEBIT + inscription PAID dans transaction.
3. Admin adjustment: role finance/admin + reason -> before/after -> audit.
4. Recompute: verifier wallet.balance = somme credits - debits posted.

## Logiques metier et invariants

- Aucun solde ne change sans LedgerEntry.
- balanceXaf n est qu un cache, pas l historique.
- Mouvements financiers transactionnels.
- Wallet V1 = credit interne utilisable pour payer d autres sessions.
- Retraits argent reel exclus ou bloques tant que non valides juridiquement.
- Ajustements admin avec reason, before, after et AuditLog.
- Solde jamais negatif.

## Donnees principales

- `Wallet`
- `LedgerEntry`
- `WalletHold`
- `WalletTransaction`
- `AdminAdjustment`
- `AuditLog`
- `idempotencyKey`

## API et contrats

- `GET /v1/wallet/me`
- `GET /v1/wallet/me/ledger`
- `POST /v1/registrations/:id/pay-with-wallet`
- `POST /v1/admin/wallets/:userId/adjust`

Erreurs et cas limites a normaliser :

- `409_INSUFFICIENT_FUNDS`
- `409_WALLET_FROZEN`
- `409_LEDGER_DUPLICATE`
- `403_WITHDRAWALS_DISABLED`
- `403_FINANCE_ROLE_REQUIRED`

## Evenements et jobs

- `wallet.credited`
- `wallet.debited`
- `wallet.hold-created`
- `wallet.hold-released`
- `wallet.adjusted`

## Securite, conformite et audit

- Interactive transaction + Serializable/OCC pour debit.
- Idempotency key obligatoire pour credits/debits.
- Pas de mutation directe de balance sans ledger.
- Audit admin obligatoire.
- Retraits argent reel desactives en V1.

## Criteres d acceptation

- Aucune mutation balance sans LedgerEntry.
- Double debit concurrent impossible.
- Debit wallet et inscription PAID atomiques.
- Balance recomputee depuis ledger egale cache.
- Adjustment admin sans reason refuse.
- Withdrawal endpoint absent ou retourne WITHDRAWALS_DISABLED.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `wallet_credit_count`
- `wallet_debit_count`
- `ledger_mismatch_count`
- `negative_balance_attempt_count`
- `admin_adjustment_count`
- `duplicate_ledger_prevented_count`

## Dependances fonctionnelles

- Feature 06 paiement
- Feature 05 inscription
- Feature 12 resultats/distribution
- Feature 13 finance/admin
- Feature 15 conformite

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- BRAINSTORMING.md WalletTransactionType et ledger obligatoire
- PRD_PHASE_1.md retrait bloque sans avis legal
- deep-research-report.md wallet interne non retirable
- Prisma interactive transactions
- PostgreSQL isolation

References officielles techniques :

- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt
- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt
- PostgreSQL transaction isolation and retry expectations: https://www.postgresql.org/docs/current/transaction-iso.html
- OWASP Authorization / API Security / Business Logic / Logging guidance: https://cheatsheetseries.owasp.org/

## Questions ouvertes

- Qualification juridique exacte du credit interne.
- Nom public du wallet.
- Politique refund/credit si session annulee.
- Retraits argent reel post-V1: conditions legales.


---

## FILE: `docs/prd/features/08-lobby-check-in.md`

# Feature 08 - Lobby, check-in et preparation de session

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Rassembler les joueurs payes avant le debut, verifier leur presence, afficher les regles et preparer l entree live.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Reduire absences, retards, litiges et echecs de demarrage en transformant des joueurs PAID en joueurs CHECKED_IN/IN_ROOM. |
| Target users | joueurs payes, admins live |
| Business value | Elevee: protege l experience de demarrage et limite les sessions ratees. |
| Technical complexity | Moyenne: presence, check-in, compte a rebours, statuts, join token et transition Colyseus. |
| Risk level | Moyen a eleve: absents, retards, deconnexions, minimum joueurs non atteint, remboursements/no-show. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Lobby accessible seulement aux registrations PAID.
- Check-in et presence courte.
- Affichage regles critiques/no-show/remboursement.
- Start authorization admin/systeme.
- Join token live court et non reutilisable.

## Parcours et workflows

1. Joueur PAID ouvre lobby; API verifie registration et session status.
2. Joueur check-in: PAID -> CHECKED_IN avec timestamp.
3. Deadline check-in atteinte: worker applique politique no-show/remboursement/report.
4. Start: admin/systeme verifie minPlayers selon paid ou checked-in puis genere join tokens.

## Logiques metier et invariants

- Seuls les joueurs PAID accedent au lobby.
- Le check-in transforme l inscription en CHECKED_IN.
- Le lancement exige un minimum de joueurs check-in ou payes selon regle finale.
- Absents exclus, remplaces, rembourses ou marques no-show selon politique.
- Le lobby affiche les regles critiques avant entree live.
- Join token court, non reutilisable et lie a une registration.

## Donnees principales

- `LobbyPresence`
- `CheckIn`
- `SessionRegistration`
- `GameSession`
- `StartPolicy`
- `JoinToken`

## API et contrats

- `GET /v1/sessions/:id/lobby`
- `POST /v1/sessions/:id/check-in`
- `POST /v1/admin/sessions/:id/start`
- `GET /v1/sessions/:id/join-token`

Erreurs et cas limites a normaliser :

- `403_NOT_PAID`
- `409_CHECKIN_CLOSED`
- `409_MIN_PLAYERS_NOT_REACHED`
- `410_SESSION_CANCELLED`
- `409_JOIN_TOKEN_EXPIRED`

## Evenements et jobs

- `lobby.joined`
- `player.checked-in`
- `checkin.deadline-reached`
- `session.start-authorized`
- `join-token.issued`

## Securite, conformite et audit

- Persist official check-in in DB; Redis presence is not source of truth.
- Join token single-use and short TTL.
- Audit admin start/override.
- No-show policy visible before payment/lobby.

## Criteres d acceptation

- Seuls PAID accedent au lobby.
- CHECKED_IN requis selon politique.
- Late check-in et grace period.
- MinPlayers non atteint applique policy.
- Join token expire/non reutilisable.
- Presence Redis incoherente ne modifie pas DB seule.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `lobby_join_rate`
- `checkin_success_rate`
- `no_show_rate`
- `start_delay_seconds`
- `join_token_reuse_blocked_count`

## Dependances fonctionnelles

- Feature 05 inscription
- Feature 06 paiement
- Feature 09 live Colyseus
- Feature 14 notifications rappels

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- BRAINSTORMING.md SessionRegistrationStatus
- deep-research-report.md Redis Presence + PostgreSQL deadline + BullMQ
- Colyseus reserve/reconnection
- BullMQ delayed jobs

References officielles techniques :

- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt
- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt
- PostgreSQL transaction isolation and retry expectations: https://www.postgresql.org/docs/current/transaction-iso.html
- Redis data structures, presence/cache/pubsub patterns: https://redis.io/docs/latest/develop/index.html.md
- BullMQ jobs, delayed jobs, retries and jobId deduplication: https://docs.bullmq.io/readme.md
- Colyseus rooms, schema, presence, clock/timers, reconnection, matchmaking: https://docs.colyseus.io/llms.txt

## Questions ouvertes

- Start policy: minPlayers PAID ou CHECKED_IN.
- Delai check-in et grace period.
- No-show: refund, credit partiel, exclusion ou remplacement.


---

## FILE: `docs/prd/features/09-session-live-temps-reel.md`

# Feature 09 - GameSession live et orchestration temps reel

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Orchestrer la session live: rooms, phases, timers, reconnexion, pause/reprise, joueurs actifs/elimines et etat synchronise.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Fournir l experience centrale temps reel tout en gardant la verite critique cote serveur et base durable. |
| Target users | joueurs actifs, joueurs elimines, admins live, game-server |
| Business value | Critique: experience coeur du produit. |
| Technical complexity | Tres elevee: Colyseus, state sync, timers serveur, reconnexion, crash recovery, coherence DB/live. |
| Risk level | Tres eleve: desync, session bloquee, resolution incorrecte, latence, deconnexion, crash game-server. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Une room Colyseus par GameSession en V1.
- Phases live LOBBY/BRIEFING/ROUND_ACTIVE/RESOLVING/RESULTS/PAUSED.
- Timers ressentis via Colyseus clock, deadlines officielles en DB.
- Actions joueurs validees serveur et routees vers game-engine.
- Pause/reprise admin auditee et recovery worker.

## Parcours et workflows

1. Reservation live verifie auth + CHECKED_IN + session WAITING_START/LIVE.
2. Room creee, charge state depuis DB et annonce briefing.
3. Round start: DB RoundDeadline + event + timer Colyseus + BullMQ safety job.
4. Input joueur: action nonce + validation etat/round/deadline -> stockage ou rejet.
5. Reconnexion: allowReconnection restaure state sans rejouer action deja soumise.

## Logiques metier et invariants

- Colyseus gere le live mais ne decide pas des paiements.
- Le client affiche, le serveur decide.
- Deadline officielle de round en DB.
- Colyseus diffuse timer ressenti; BullMQ filet de securite.
- Reconnexion restaure etat joueur si possible.
- Pause admin auditee.
- Le client ne calcule jamais score, elimination ou gain officiel.

## Donnees principales

- `LiveRoomState`
- `RoundInstance`
- `RoundDeadline`
- `PlayerConnection`
- `AdminPauseEvent`
- `PlayerAction`

## API et contrats

- `WS /game/:sessionId`
- `POST /v1/live/sessions/:id/reservation`
- `POST /v1/admin/live/:sessionId/pause`
- `POST /v1/admin/live/:sessionId/resume`
- `GET /v1/live/:sessionId/state`

Erreurs et cas limites a normaliser :

- `403_NOT_CHECKED_IN`
- `409_SESSION_NOT_LIVE`
- `409_RECONNECT_WINDOW_EXPIRED`
- `410_ROUND_ALREADY_CLOSED`
- `409_ACTION_ALREADY_SUBMITTED`

## Evenements et jobs

- `live.room-created`
- `round.started`
- `round.deadline-set`
- `player.disconnected`
- `player.reconnected`
- `session.paused`

## Securite, conformite et audit

- Authoritative server.
- Action nonce/deduplication.
- Rate limit action submit.
- No sensitive answers in client state before resolution.
- Admin pause/restart audited.
- Restrict matchmaker so clients cannot create arbitrary rooms.

## Criteres d acceptation

- Timer officiel stocke cote serveur/DB.
- Reconnexion restaure etat sans replay action.
- Pause admin auditee.
- Crash game-server recuperable via DB/jobs.
- Late input apres deadline rejete.
- Room state divergence detectee/reparee.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `room_active_count`
- `reconnect_success_rate`
- `drop_rate`
- `round_close_lag_ms`
- `desync_repair_count`
- `late_input_rejected_count`

## Dependances fonctionnelles

- Feature 08 lobby/check-in
- Feature 10 game-engine
- Feature 11 mini-jeux
- Feature 13 admin live
- Feature 15 anti-triche

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- BRAINSTORMING.md apps/game-server et RoundStatus
- deep-research-report.md Colyseus room authoritative
- Colyseus rooms/presence/clock/reconnection
- BullMQ safety jobs
- PostgreSQL deadlines

References officielles techniques :

- Colyseus rooms, schema, presence, clock/timers, reconnection, matchmaking: https://docs.colyseus.io/llms.txt
- Redis data structures, presence/cache/pubsub patterns: https://redis.io/docs/latest/develop/index.html.md
- BullMQ jobs, delayed jobs, retries and jobId deduplication: https://docs.bullmq.io/readme.md
- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt
- PostgreSQL transaction isolation and retry expectations: https://www.postgresql.org/docs/current/transaction-iso.html
- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt

## Questions ouvertes

- Duree fenetre reconnexion.
- Room par session ou par round apres V1.
- Politique pause/reprise et compensation joueurs.


---

## FILE: `docs/prd/features/10-game-engine-resolution-rounds.md`

# Feature 10 - Game engine et resolution des rounds

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Isoler les regles de jeu dans un moteur deterministe, testable, rejouable et auditable.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Centraliser eligibilite, scoring, classement, qualifications, eliminations, winnersCount, transitions et resultats hors Colyseus. |
| Target users | developpeurs, game-server, admins indirectement via configuration |
| Business value | Tres elevee: permet d ajouter des mini-jeux sans casser le live et protege gains/eliminations. |
| Technical complexity | Tres elevee: modelisation generique de familles de mini-jeux, determinisme, replay, tests et audit. |
| Risk level | Tres eleve: erreur de resolution impacte eliminations, resultats, gains et litiges. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Package separe packages/game-engine.
- Resolvers purs par famille/mini-jeu.
- Inputs valides, config, seedLog et evidence.
- Ranking/statuts produits par mini-jeu; session applique winnersCount/elimination policy.
- Replay technique pour litige.

## Parcours et workflows

1. Round active collecte inputs valides.
2. Deadline close: game-server/worker appelle resolver avec snapshot officiel.
3. Resolver retourne scores, ranks, qualifiedIds, eliminatedIds, tieGroups, evidence, seedLog.
4. Transaction persiste RoundResult, Elimination/Qualification et outbox events.
5. Replay compare output attendu avec resultat officiel.

## Logiques metier et invariants

- Colyseus orchestre le live; game-engine resout les regles.
- Un mini-jeu produit score/classement/statuts; la session applique qualification/elimination.
- Resolvers deterministes et auditables.
- Resultats persistables et rejouables pour litige.
- Tests game-engine prioritaires.
- Meme input + meme config + meme seedLog = meme output.
- Colyseus ne contient pas la logique financiere.

## Donnees principales

- `GameEngineResolver`
- `RoundResult`
- `Elimination`
- `Qualification`
- `ResolutionLog`
- `GameEvent/OutboxEvent`

## API et contrats

- `internal: resolveRound(input)`
- `internal: computeRanking(result)`
- `internal: applyWinnersCount(ranking, config)`
- `internal: finalizeRound(roundId)`
- `POST /internal/rounds/:id/replay`

Erreurs et cas limites a normaliser :

- `409_ROUND_NOT_LOCKED`
- `409_RESOLUTION_ALREADY_DONE`
- `422_INVALID_ROUND_INPUT`
- `500_RESOLVER_FAILED`

## Evenements et jobs

- `round.resolution-requested`
- `round.resolved`
- `player.eliminated`
- `player.qualified`
- `round.replay-requested`

## Securite, conformite et audit

- Reject late/double inputs.
- Server-side RNG and seedLog.
- Do not expose answer keys before resolution.
- Evidence stored for dispute.
- Transaction boundary around finalizeRound.

## Criteres d acceptation

- Resolvers pure functions tested by fixtures.
- Property tests ranking invariants.
- Same input gives same output.
- RNG replay stable.
- Timer close racing with last input.
- Result persisted and replayable for dispute.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `round_resolve_duration_ms`
- `tie_rate`
- `replay_mismatch_count`
- `late_input_rejected_count`
- `resolver_exception_count`

## Dependances fonctionnelles

- Feature 09 live orchestration
- Feature 11 mini-jeux
- Feature 12 resultats/gains
- Feature 15 anti-triche

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- BRAINSTORMING.md packages/game-engine
- catalogue-mini-jeux.md resolver/winnersCount convention
- deep-research-report.md deterministic resolution
- Prisma/PostgreSQL finalisation transactionnelle

References officielles techniques :

- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt
- PostgreSQL transaction isolation and retry expectations: https://www.postgresql.org/docs/current/transaction-iso.html
- Colyseus rooms, schema, presence, clock/timers, reconnection, matchmaking: https://docs.colyseus.io/llms.txt
- OWASP Authorization / API Security / Business Logic / Logging guidance: https://cheatsheetseries.owasp.org/

## Questions ouvertes

- Tie-break policies par famille.
- Format evidence minimal pour support/litige.
- Nombre de mini-jeux MVP couverts par resolvers generiques.


---

## FILE: `docs/prd/features/11-catalogue-mini-jeux-configurables.md`

# Feature 11 - Catalogue de mini-jeux configurables

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Transformer le catalogue de 120 idees en definitions parametrables par familles, exploitables par game-engine et Colyseus.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Eviter 120 implementations isolees en normalisant chaque jeu par family, schema de config, actions, resolver et anti-cheat policy. |
| Target users | joueurs, admins configurant les rounds, developpeurs gameplay |
| Business value | Elevee: contenu rejouable et differenciation produit. |
| Technical complexity | Tres elevee pour 120 jeux; moyenne a elevee pour MVP limite a quelques familles. |
| Risk level | Eleve: sur-scope, triche, bugs, hasard dominant, mauvaise comprehension joueur. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Catalogue technique MiniGameDefinition.
- Familles: Solo, Duel 1v1, Alliance forcee, Equipe libre, Survie collective, Role cache.
- Config schemas, allowedActions, stateFactory, resolver, antiCheatPolicy.
- MVP 3 a 5 jeux a faible hasard et auditables.

## Parcours et workflows

1. Admin selectionne mini-jeu active et config validee.
2. Game-server charge definition/version et initialise state.
3. Client affiche uniquement state autorise; actions passent par validateMiniGameAction.
4. Resolver produit ranking/status; session applique winnersCount.

## Logiques metier et invariants

- Chaque mini-jeu declare family, playerMode, configSchema, allowedActions, resolver, antiCheatPolicy.
- Tous les timers sont serveur-side.
- Reponses sensibles non envoyees avant resolution.
- RNG serveur-side et loguee si elle influence le resultat.
- MVP priorise jeux a faible hasard, faciles a expliquer et verifier.
- winnersCount reste parametre externe applique par la couche session.

## Donnees principales

- `MiniGameDefinition`
- `MiniGameVersion`
- `MiniGameFamily`
- `ConfigSchema`
- `AllowedAction`
- `AntiCheatPolicy`
- `RngSeedLog`
- `Round.configJson`

## API et contrats

- `GET /v1/admin/minigames`
- `POST /v1/admin/minigames/:id/enable`
- `POST /v1/admin/minigames/validate-config`
- `GET /v1/minigames/:id/schema`
- `internal: validateMiniGameAction(action)`

Erreurs et cas limites a normaliser :

- `400_INVALID_MINIGAME_CONFIG`
- `409_MINIGAME_DISABLED`
- `422_ACTION_NOT_ALLOWED`
- `409_ACTION_TOO_LATE`

## Evenements et jobs

- `minigame.enabled`
- `minigame.config-validated`
- `minigame.action-accepted`
- `minigame.action-rejected`
- `minigame.runtime-exception`

## Securite, conformite et audit

- No answer leak in state/schema.
- Server-side validation of every action.
- Action rate caps per game.
- RNG seedLog if any randomness.
- Exclude hasard-dominant games until legal review.

## Criteres d acceptation

- Every game exposes schema/config/actions/resolver.
- Config validation rejects invalid params.
- Sensitive answers never sent before resolution.
- RNG server logged and replayable.
- Auto-click/double submit blocked.
- MVP games explainable by UI copy.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `minigame_runtime_exception`
- `answer_leak_detected`
- `abnormal_client_action_rate`
- `rng_family_usage_count`
- `invalid_action_count`

## Dependances fonctionnelles

- Feature 04 session config
- Feature 09 live
- Feature 10 game engine
- Feature 15 anti-cheat/legal

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- catalogue-mini-jeux.md 120 jeux et conventions communes
- BRAINSTORMING.md Mini-jeux catalogue existant sans recopier la liste
- deep-research-report.md familles techniques parametrables
- Colyseus Schema/state sync

References officielles techniques :

- Colyseus rooms, schema, presence, clock/timers, reconnection, matchmaking: https://docs.colyseus.io/llms.txt
- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt
- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt
- OWASP Authorization / API Security / Business Logic / Logging guidance: https://cheatsheetseries.owasp.org/

## Questions ouvertes

- Liste exacte des 3 a 5 jeux MVP.
- Politique de hasard acceptable.
- Assets audio/visuels minimum.
- Versioning des definitions de jeux.


---

## FILE: `docs/prd/features/12-resultats-gains-distribution.md`

# Feature 12 - Resultats, gains et distribution

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Enregistrer les resultats officiels, determiner les gagnants, calculer les credits internes et publier le recap.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Cloturer une session avec un point officiel unique et une distribution idempotente, comprehensible et auditable. |
| Target users | joueurs, gagnants, admins, support, finance |
| Business value | Critique: moment de confiance ou joueurs comprennent victoire, defaite, elimination et credits. |
| Technical complexity | Tres elevee: calcul financier, ledger, audit, idempotence, litiges, correction post-session. |
| Risk level | Tres eleve: mauvais calcul, double credit, distribution prematuree, litige financier/legal. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Finalisation officielle session.
- Calcul GameResult et PrizeDistribution.
- Credit wallet interne via ledger.
- Publication resultats joueur/admin.
- Correction post-session via workflow audite.

## Parcours et workflows

1. Game-engine finalise derniers rounds et produit classement officiel.
2. Admin/systeme appelle finalize: session FINISHED, results computed, outbox distribution.
3. Worker credite chaque gagnant avec idempotencyKey session:winner:prize.
4. Publication recap apres distribution ou statut contestable selon policy.
5. Correction demande role + raison + audit; pas de modification silencieuse.

## Logiques metier et invariants

- Resultats calcules par game-engine puis persistés.
- Gains credites seulement apres finalisation officielle.
- Credit wallet et ledger atomiques.
- Commission organisation tracee.
- Distribution idempotente.
- Correction post-session via audit/support.
- Aucun cash-out V1.
- winnerSplitBps somme 10000; reliquat de division entiere selon politique documentee.

## Donnees principales

- `GameResult`
- `RoundResult`
- `PrizeDistribution`
- `LedgerEntry`
- `Wallet`
- `CommissionRecord`
- `DisputeWindow`
- `AuditLog`

## API et contrats

- `POST /v1/admin/sessions/:id/finalize`
- `GET /v1/sessions/:id/results`
- `GET /v1/admin/sessions/:id/results`
- `POST /v1/admin/sessions/:id/correction-request`

Erreurs et cas limites a normaliser :

- `409_SESSION_NOT_READY_TO_FINALIZE`
- `409_RESULTS_ALREADY_FINALIZED`
- `409_DISTRIBUTION_ALREADY_DONE`
- `422_TIE_POLICY_REQUIRED`
- `403_CORRECTION_ROLE_REQUIRED`

## Evenements et jobs

- `session.finished`
- `results.computed`
- `credits.distribution-started`
- `credits.distributed`
- `results.published`

## Securite, conformite et audit

- Idempotency per distribution.
- Ledger required for every credit.
- Finalized results immutable except correction workflow.
- Audit corrections and admin actions.
- Cash-out disabled in V1.

## Criteres d acceptation

- Distribution repetee ne double pas credits.
- Resultats figes apres finalisation.
- Correction necessite role + raison + audit.
- Rounding remainder policy stable.
- Worker crash entre gagnants reprend sans double credit.
- No cash-out V1.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `session_finalize_ms`
- `prize_credit_jobs`
- `ledger_entries_per_finalize`
- `credit_retry_count`
- `duplicate_prize_prevented_count`
- `result_dispute_count`

## Dependances fonctionnelles

- Feature 10 game engine
- Feature 07 wallet/ledger
- Feature 13 admin/support
- Feature 15 compliance

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- deep-research-report.md formulas XAF/bps and distribution
- BRAINSTORMING.md PrizeDistribution/GameResult
- Prisma/PostgreSQL transactions
- BullMQ jobId deduplication

References officielles techniques :

- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt
- PostgreSQL transaction isolation and retry expectations: https://www.postgresql.org/docs/current/transaction-iso.html
- BullMQ jobs, delayed jobs, retries and jobId deduplication: https://docs.bullmq.io/readme.md
- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt
- OWASP Authorization / API Security / Business Logic / Logging guidance: https://cheatsheetseries.owasp.org/

## Questions ouvertes

- Tie-break default.
- Dispute window duration.
- Rounding remainder allocation.
- When to publish if distribution partially delayed.


---

## FILE: `docs/prd/features/13-dashboard-admin-audit-support.md`

# Feature 13 - Dashboard admin live, audit et support operations

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Permettre aux admins/support/finance de surveiller, auditer et operer sans casser l integrite financiere ou gameplay.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Donner les vues et actions minimales pour exploiter sessions, paiements, joueurs, incidents, resultats, wallet et audit. |
| Target users | admins, support, operations, finance, super admin |
| Business value | Tres elevee: indispensable pour paiements, litiges, live et operations. |
| Technical complexity | Elevee: nombreux etats, roles, filtres, actions sensibles et journaux. |
| Risk level | Eleve: abus de privileges, erreurs support, action admin non tracee, fuite de secrets provider. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Dashboard sessions/live/paiements/registrations/wallet/resultats.
- Recherche utilisateur/support.
- AuditLog consultable.
- Actions sensibles avec role + reason + audit.
- Workflow approval pour operations critiques.

## Parcours et workflows

1. Support lit profil, registrations, paiements sans secrets provider.
2. Finance reconcilie paiement/refund selon workflow audite.
3. Admin publie/cancel/pause session avec reason.
4. Super admin execute corrections exceptionnelles avec before/after et approval si necessaire.

## Logiques metier et invariants

- Actions sensibles exigent role, raison et audit.
- Admins voient sessions, inscrits, paiements, statuts, resultats, rentabilite.
- Operations manuelles limitees et tracees.
- Resultats/gains non modifiables sans workflow correction.
- Vues support suffisantes sans fuite de secrets.
- Finance voit paiements/ledger mais pas controle gameplay.

## Donnees principales

- `AdminView`
- `AuditLog`
- `SupportCase`
- `PaymentTransaction`
- `WalletLedgerView`
- `IncidentLog`
- `AdminActionApproval`

## API et contrats

- `GET /v1/admin/dashboard`
- `GET /v1/admin/audit-logs`
- `GET /v1/admin/support/users/:id`
- `POST /v1/admin/incidents`
- `POST /v1/admin/actions/:id/approve`
- `POST /v1/admin/payments/:id/reconcile`

Erreurs et cas limites a normaliser :

- `403_ROLE_REQUIRED`
- `400_REASON_REQUIRED`
- `409_ACTION_NOT_APPROVABLE`
- `403_SECRET_NOT_VISIBLE`
- `409_RESULT_FINALIZED`

## Evenements et jobs

- `admin.action-requested`
- `admin.action-approved`
- `support.case-created`
- `audit.log-written`
- `incident.created`

## Securite, conformite et audit

- Least privilege and deny by default.
- Per-action authorization server-side.
- Audit includes actor/action/target/before/after/reason/IP/user-agent/requestId.
- Never expose api keys, webhook secrets or provider raw secrets.
- No direct balance overwrite.

## Criteres d acceptation

- Role matrix positive/negative.
- Every sensitive action writes AuditLog.
- Support cannot see provider secrets.
- Finance cannot pause gameplay unless role allows.
- Audit search by target/requestId.
- Repeated admin action idempotent or rejected.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `admin_mutation_count_by_role`
- `manual_reconciliation_count`
- `refund_volume_xaf`
- `audit_write_failure`
- `support_case_count`
- `admin_action_denied_count`

## Dependances fonctionnelles

- Feature 02 RBAC
- Feature 04 admin sessions
- Feature 06 payments
- Feature 07 wallet
- Feature 09 live
- Feature 12 results
- Feature 15 compliance

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- OWASP least privilege/authorization/logging
- Hono requestId middleware
- Next.js server-only data access
- deep-research-report.md admin operations

References officielles techniques :

- Next.js App Router, Authentication, Data Security, Metadata: https://nextjs.org/docs/llms.txt
- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt
- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt
- PostgreSQL transaction isolation and retry expectations: https://www.postgresql.org/docs/current/transaction-iso.html
- OWASP Authorization / API Security / Business Logic / Logging guidance: https://cheatsheetseries.owasp.org/

## Questions ouvertes

- Exact role matrix V1.
- Which actions require approval vs direct execution.
- Support SLA and incident taxonomy.
- Retention duration for audit logs.


---

## FILE: `docs/prd/features/14-notifications-whatsapp.md`

# Feature 14 - Notifications et diffusion communautaire WhatsApp

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Informer et rappeler les joueurs sans rendre WhatsApp critique pour paiement, lobby ou live.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Supporter acquisition, retention, rappels et partage communautaire par canaux web/in-app et WhatsApp optionnel. |
| Target users | joueurs, communautes WhatsApp, admins marketing, support |
| Business value | Moyenne a elevee: utile pour acquisition et retention, non critique au gameplay V1. |
| Technical complexity | Moyenne: liens partageables et notifications internes simples; WhatsApp gateway ajoute opt-in, templates et webhooks. |
| Risk level | Moyen: spam, dependance WhatsApp, message au mauvais moment, confidentialite, consentement absent. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Liens partageables manuels V1.
- Notifications in-app critiques.
- Rappels programmes via worker.
- Gateway WhatsApp optionnelle/separee.
- Preferences et consentement communication.

## Parcours et workflows

1. Session publiee: admin genere lien partageable.
2. Registration/payment/check-in/result event enqueue notification.
3. Worker envoie rappel avant check-in/start avec jobId unique.
4. WhatsApp webhook optionnel met a jour DeliveryLog; echec n impacte pas coeur produit.

## Logiques metier et invariants

- V1 peut commencer par liens partageables manuels.
- Notifications critiques aussi visibles dans web app.
- WhatsApp gateway optionnel et separable.
- Messages sortants respectent opt-in, templates et limites.
- Rappels programmes via worker.
- Echec WhatsApp ne bloque pas paiement/lobby/live.

## Donnees principales

- `NotificationPreference`
- `MessageTemplate`
- `NotificationJob`
- `DeliveryLog`
- `ConsentRecord`
- `OutboundMessage`

## API et contrats

- `POST /v1/admin/notifications/session/:id/share`
- `POST /v1/webhooks/whatsapp`
- `GET /v1/me/notification-preferences`
- `PATCH /v1/me/notification-preferences`
- `POST /internal/notifications/send`

Erreurs et cas limites a normaliser :

- `403_OPT_IN_REQUIRED`
- `409_DUPLICATE_NOTIFICATION`
- `422_TEMPLATE_NOT_APPROVED`
- `502_WHATSAPP_UNAVAILABLE`

## Evenements et jobs

- `notification.queued`
- `notification.sent`
- `notification.failed`
- `whatsapp.webhook-received`
- `share.link-created`

## Securite, conformite et audit

- Opt-in required for non-transactional outbound messages.
- Do not leak private results to groups.
- Templates reviewed before use.
- Deduplicate reminders with jobId.
- WhatsApp credentials isolated in gateway.

## Criteres d acceptation

- Rappels critiques visibles in-app.
- Opt-in/out respected.
- Duplicate reminder prevented.
- WhatsApp failure non-blocking.
- Webhook signature/validation if implemented.
- No private data in share preview.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `notification_send_rate`
- `delivery_failure_rate`
- `duplicate_message_prevented`
- `time_to_reminder_before_start`
- `share_link_created_count`

## Dependances fonctionnelles

- Feature 01 share links
- Feature 05 registration
- Feature 06 payment status
- Feature 08 check-in
- Feature 12 results

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- BRAINSTORMING.md apps/whatsapp-gateway optionnel
- deep-research-report.md WhatsApp not critical
- BullMQ delayed jobs/jobId
- Meta WhatsApp Business Platform

References officielles techniques :

- BullMQ jobs, delayed jobs, retries and jobId deduplication: https://docs.bullmq.io/readme.md
- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt
- Meta WhatsApp Business Platform / Cloud API: https://developers.facebook.com/docs/whatsapp/cloud-api/
- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt

## Questions ouvertes

- WhatsApp automatise en V1 ou liens manuels seulement.
- Canaux alternatifs: email/SMS/in-app.
- Opt-in wording et consentement.
- Couts et limites WhatsApp.


---

## FILE: `docs/prd/features/15-securite-anti-triche-conformite.md`

# Feature 15 - Securite, anti-triche, conformite et moderation

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Proteger equite, argent, donnees, workflows, moderation et qualification juridique du produit.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Reduire fraude, triche, abus, multi-compte, manipulation client, litiges, erreurs financieres et risques reglementaires. |
| Target users | tous les joueurs, admins, support, finance, legal/compliance |
| Business value | Critique: la confiance est indispensable pour une competition payante. |
| Technical complexity | Tres elevee: transversal a auth, paiement, wallet, live, logs, moderation, data privacy et legal. |
| Risk level | Tres eleve: principal risque transversal du produit. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Securite web/API/session.
- Anti-cheat gameplay.
- Anti-fraude paiement/wallet/multi-compte.
- Moderation et litiges.
- Compliance gates legal/wallet/hasard/retrait.
- Audit et observabilite metier.

## Parcours et workflows

1. Chaque endpoint sensible verifie authz server-side et loggue requestId.
2. Chaque action gameplay utilise actionNonce/deadline/rate cap et validation serveur.
3. Fraud/anti-cheat signals alimentent revue support ou blocage compliance.
4. ComplianceGate bloque retrait argent reel et hasard dominant tant que non valide.
5. Moderation action exige role + reason + audit.

## Logiques metier et invariants

- Le client n est jamais source de verite critique.
- Timers, RNG, scores, paiements, eliminations et gains sont serveur-side.
- Actions sensibles auditees.
- Cookies/session suivent OWASP.
- Endpoints limites, valides et proteges.
- Mini-jeux detectent double soumission, auto-click, latence abusive, multi-compte, collusion.
- Qualification legale competition payante/gains/wallet validee avant lancement public.
- Retraits argent reel bloques en V1.

## Donnees principales

- `RiskSignal`
- `AntiCheatEvent`
- `ModerationAction`
- `RateLimitBucket`
- `ComplianceGate`
- `AuditLog`
- `FraudSignal`
- `DeviceFingerprintHash`
- `AbuseCaseLog`

## API et contrats

- `GET /v1/security/session/:id/risk`
- `POST /v1/admin/moderation/actions`
- `POST /internal/anticheat/signal`
- `GET /v1/admin/compliance/gates`
- `POST /v1/support/disputes`

Erreurs et cas limites a normaliser :

- `403_COMPLIANCE_GATE_BLOCKED`
- `429_RATE_LIMITED`
- `409_DOUBLE_SUBMIT_DETECTED`
- `403_MODERATION_ROLE_REQUIRED`
- `422_UNSUPPORTED_GAME_RISK`

## Evenements et jobs

- `security.risk-detected`
- `anticheat.signal-raised`
- `moderation.action-applied`
- `compliance.gate-blocked`
- `dispute.created`

## Securite, conformite et audit

- HttpOnly/Secure/SameSite cookies and session rotation.
- BOLA tests for ID-based endpoints.
- CSRF/body limit/secure headers/requestId middleware.
- Webhook x-wh-secret and idempotence.
- Server-side RNG/timers/resolution.
- Audit logs useful without leaking secrets.
- Data minimization and retention rules.

## Criteres d acceptation

- Double submission detected.
- Auto-click/rate anomalies signaled.
- BOLA tested on all ID endpoints.
- Webhook signature failures rejected.
- Parallel tab race and skip-step attacks.
- Double payout prevented.
- Compliance blocks withdrawals and hasard-dominant games until validated.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `fraud_signal_count`
- `multi_account_suspect_rate`
- `webhook_signature_failures`
- `authorization_denied_rate`
- `business_rule_violation_rate`
- `round_replay_disagreement`
- `rate_limit_block_count`

## Dependances fonctionnelles

- All features 01-14

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- PRD_PHASE_1.md legal and data risk
- BRAINSTORMING.md anti-triche/server-side source of truth
- catalogue-mini-jeux.md server timers/RNG/anti-cheat notes
- deep-research-report.md OWASP and business logic security
- OWASP Session/Authz/API/Business Logic/Logging

References officielles techniques :

- Next.js App Router, Authentication, Data Security, Metadata: https://nextjs.org/docs/llms.txt
- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt
- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt
- PostgreSQL transaction isolation and retry expectations: https://www.postgresql.org/docs/current/transaction-iso.html
- Colyseus rooms, schema, presence, clock/timers, reconnection, matchmaking: https://docs.colyseus.io/llms.txt
- BullMQ jobs, delayed jobs, retries and jobId deduplication: https://docs.bullmq.io/readme.md
- Redis data structures, presence/cache/pubsub patterns: https://redis.io/docs/latest/develop/index.html.md
- Fapshi initiate-pay, payment status, webhook, sandbox/live and x-wh-secret: https://docs.fapshi.com/llms.txt
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP Authorization / API Security / Business Logic / Logging guidance: https://cheatsheetseries.owasp.org/

## Questions ouvertes

- Politique anti multi-compte.
- Verification age/identite.
- Mini-jeux exclus pour hasard dominant.
- Processus litige/appel.
- Retention des logs et donnees sensibles.


---

## FILE: `docs/prd/features/README.md`

# PRD Features - Index

Date : 2026-07-07
Statut : implementation PRD complete par feature

Objectif :

Chaque fichier numerote de ce dossier correspond a une branche fonctionnelle du PRD. Les fiches ont ete consolidees en specifications d implementation completes a partir des documents internes et du cahier technique.

Chaque fiche contient :

- Feature overview.
- Mapping implementation.
- Scope de livraison.
- Parcours et workflows.
- Logiques metier et invariants.
- Donnees principales.
- API et contrats.
- Evenements et jobs.
- Securite, conformite et audit.
- Criteres d acceptation.
- Strategie de tests.
- Observabilite et operations.
- Dependances fonctionnelles.
- References internes, specifiques et officielles.
- Questions ouvertes.

Sources internes consolidees :

- `BRAINSTORMING.md`
- `catalogue-mini-jeux.md`
- `PRD_PHASE_1.md`
- `PRD_PHASE_2.md`
- `cahier_des_charges_technique_plateforme_sessions_jeu.md`
- `deep-research-report.md`

Sources de recherche principales :

- Next.js docs : https://nextjs.org/docs/llms.txt
- Hono docs : https://hono.dev/llms.txt
- Prisma docs : https://www.prisma.io/docs/llms.txt
- Colyseus docs : https://docs.colyseus.io/llms.txt
- Fapshi docs : https://docs.fapshi.com/llms.txt
- BullMQ docs : https://docs.bullmq.io/readme.md
- Redis docs : https://redis.io/docs/latest/develop/index.html.md
- PostgreSQL transaction isolation : https://www.postgresql.org/docs/current/transaction-iso.html
- Docker Compose docs : https://docs.docker.com/compose.md
- OWASP Session Management Cheat Sheet : https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- WhatsApp Business Platform docs : https://developers.facebook.com/docs/whatsapp/cloud-api/

Fichiers :

1. `01-acquisition-catalogue-public.md`
2. `02-authentification-compte.md`
3. `03-profil-joueur-historique.md`
4. `04-configuration-sessions-admin.md`
5. `05-inscription-session.md`
6. `06-paiement-fapshi.md`
7. `07-wallet-ledger-credits.md`
8. `08-lobby-check-in.md`
9. `09-session-live-temps-reel.md`
10. `10-game-engine-resolution-rounds.md`
11. `11-catalogue-mini-jeux-configurables.md`
12. `12-resultats-gains-distribution.md`
13. `13-dashboard-admin-audit-support.md`
14. `14-notifications-whatsapp.md`
15. `15-securite-anti-triche-conformite.md`

Note :

Ces fichiers constituent la base de specification Phase 4 par feature. Les references provider et framework doivent etre reverifiees au moment de l implementation finale si leurs documentations changent.


---

## FILE: `docs/PRD_PHASE_1.md`

# PRD - Phase 1 : Product Understanding

Version : 0.1
Date : 2026-07-07
Statut : Phase 1 uniquement

Sources internes :
- `BRAINSTORMING.md`
- `catalogue-mini-jeux.md`

Sources externes consultees :
- Fapshi Documentation : https://docs.fapshi.com/en
- Fapshi API index / llms.txt : https://docs.fapshi.com/llms.txt
- Fapshi website : https://www.fapshi.com/en
- Recherche web sur la reglementation des jeux d'argent / jeux de hasard au Cameroun et en ligne

Note importante : cette phase ne constitue pas un avis juridique. Les elements legaux identifies servent uniquement a qualifier les risques produit et les recherches a mener avant exploitation publique.

---

## 1. Synthese du produit

Le produit est une plateforme web de sessions de jeu multijoueur temps reel.

Ce n'est pas une simple application web, ni un jeu WhatsApp, ni un tournoi global avec finale unique. Le modele retenu repose sur des sessions payantes autonomes, chacune avec ses propres inscriptions, son paiement, ses rounds, ses gagnants, sa distribution de gains et sa commission organisation.

La vision produit est la suivante :

Plateforme web dediee ou des joueurs creent un compte, rejoignent une session payante autonome, participent a plusieurs rounds de mini-jeux sociaux et strategiques en temps reel, sont progressivement qualifies ou elimines, puis recoivent eventuellement des gains credites dans un wallet interne.

L'experience recherchee repose sur la tension sociale :
- choix sous pression ;
- alliances ;
- trahison ;
- duels ;
- votes ;
- roles caches ;
- survie collective ;
- elimination progressive.

Le produit peut s'inspirer de mecaniques de type Squid Game, Among Us, duels, epreuves solo, votes et roles caches, mais il ne doit pas etre modelise comme un pari.

Principe fondamental :

Competition payante structuree ne doit pas devenir pari, mise aleatoire ou jeu d'argent non encadre.

---

## 2. Informations confirmees

Les decisions suivantes sont considerees comme confirmees a ce stade :

- Le modele central est `GameSession`, pas un grand tournoi global.
- Chaque session est independante et doit etre rentable seule.
- Les joueurs creent un compte gratuitement.
- Les joueurs paient uniquement pour rejoindre une session precise.
- Les gains eventuels sont credites dans un wallet interne.
- Le wallet peut servir a payer une future session.
- Les retraits en argent reel ne sont pas valides pour la V1.
- Le provider de paiement retenu est Fapshi.
- WhatsApp sert a l'acquisition, aux rappels et a la diffusion, pas au gameplay.
- Le jeu se deroule dans une web app dediee.
- L'admin peut creer, configurer, publier, lancer, annuler et suivre les sessions.
- Toute action sensible doit etre auditee.
- Le catalogue de 120 mini-jeux sert de base gameplay.
- Les mini-jeux doivent etre modelises par familles configurables, pas codes comme 120 systemes isoles.
- Le client affiche, mais le serveur decide.
- Les timers, scores, paiements, eliminations, classements et gains ne doivent jamais dependre du client.

---

## 3. Utilisateurs cibles

### Joueurs competitifs

Ils veulent participer a des sessions payantes, gagner, progresser, se mesurer aux autres joueurs et vivre une experience sociale intense.

### Groupes communautaires

Ils viennent potentiellement de WhatsApp ou d'une communaute fermee. Les sessions `UNLISTED` ou `PRIVATE` sont importantes pour eux.

### Admins / organisateurs

Ils creent et pilotent les sessions, definissent les prix, les regles economiques, le nombre de joueurs, les rounds, les gagnants et les regles de distribution.

### Support / operateurs

Ils gerent les paiements problematiques, remboursements, exclusions, litiges, validations manuelles et ajustements wallet.

### Spectateurs potentiels

Le role spectateur est mentionne comme piste gameplay, mais il n'est pas confirme pour la V1.

---

## 4. Business model compris

Le modele economique repose sur une commission prise sur chaque session.

Formule de base :

- Collecte brute = nombre de joueurs payants x prix d'inscription
- Frais paiement = collecte brute x taux provider
- Collecte nette = collecte brute - frais paiement
- Prize pool = collecte nette x pourcentage reserve aux gagnants
- Commission organisation = collecte nette - prize pool

Chaque session doit pouvoir afficher avant publication :

- collecte brute estimee ;
- frais paiement estimes ;
- collecte nette ;
- gain estime du ou des gagnants ;
- commission organisation ;
- seuil de rentabilite ;
- revenu minimum si le minimum de joueurs est atteint ;
- revenu maximum si la session est pleine.

Point critique : la logique financiere est au coeur du produit, mais elle expose un risque legal fort. Toute redistribution, gain, retrait ou mecanique proche du jeu d'argent devra etre validee juridiquement avant exploitation publique.

---

## 5. Recherche en ligne - impact sur la Phase 1

### 5.1 Fapshi

La documentation officielle Fapshi confirme que Fapshi propose une API pour collecter des paiements et effectuer des disbursements au Cameroun, avec support Mobile Money / Orange Money.

Elements utiles pour le PRD :

- Fapshi propose une API pour collecter des paiements et envoyer des fonds.
- L'API utilise des environnements sandbox et live distincts.
- L'authentification API passe par des headers `apiuser` et `apikey`.
- Les requetes doivent etre en JSON.
- Les webhooks sont recommandes pour suivre les evenements de paiement.
- Le polling du statut de paiement est limite ; l'index officiel recommande de preferer les webhooks.
- Les webhooks peuvent etre securises via un secret transmis dans le header `x-wh-secret`.
- L'IP whitelisting s'applique aux creations de transaction.

Impact produit :

- La validation paiement doit etre webhook-first.
- Le systeme doit prevoir une reconciliation en worker pour les cas de webhook manquant, en respectant les limites de polling.
- La configuration Fapshi doit separer sandbox et production.
- Les secrets API et webhook doivent etre geres comme secrets d'infrastructure.
- Les paiements et payouts doivent rester dans l'API plateforme, pas dans Colyseus.

Source :
- https://docs.fapshi.com/llms.txt
- https://docs.fapshi.com/en/api-reference/getting-started
- https://www.fapshi.com/en

### 5.2 Cadre legal jeux payants / gains

La recherche web n'a pas permis de confirmer proprement, depuis une source officielle unique, le cadre exact applicable au Cameroun pour une plateforme en ligne de competition payante avec gains et wallet interne.

Conclusion de Phase 1 :

- Le risque legal reste eleve.
- Il ne faut pas supposer que le produit est autorise parce qu'il repose sur de l'adresse, du social ou du temps reel.
- Le fait de demander un paiement d'entree et d'offrir une esperance de gain peut etre sensible selon la qualification juridique locale.
- La V1 doit eviter les retraits argent reel tant qu'un avis juridique local n'a pas valide le modele.
- Les mecanismes de hasard dans certains mini-jeux doivent etre limites, controles ou remplaces par des mecaniques d'adresse si necessaire.

Decision PRD provisoire :

Pour la V1, le wallet doit etre traite comme credit interne utilisable pour de nouvelles sessions, sauf validation juridique explicite des retraits argent reel.

### 5.3 Donnees personnelles, securite et paiements

Le produit collecte au minimum :

- identifiant utilisateur ;
- email ou telephone ;
- mot de passe hashe ;
- profil joueur ;
- historique de sessions ;
- historique de paiements ;
- wallet et ledger ;
- logs d'audit ;
- adresse IP et user agent pour securite/audit.

Impact produit :

- Une politique de confidentialite sera necessaire.
- La minimisation des donnees doit etre appliquee des la V1.
- Les logs d'audit doivent etre utiles sans exposer inutilement de donnees sensibles.
- Les secrets, tokens, mots de passe et informations de paiement ne doivent jamais etre stockes en clair.
- Les donnees financieres et d'audit doivent avoir des regles de retention explicites.

---

## 6. Contexte technique confirme

Stack retenue :

- Next.js pour l'interface web joueur/admin ;
- Hono pour l'API plateforme ;
- Colyseus pour le temps reel ;
- PostgreSQL comme source de verite durable ;
- Prisma pour l'acces DB et les transactions ;
- Redis pour presence, cache court, coordination et BullMQ ;
- BullMQ pour jobs, timers persistants, clotures automatiques, reconciliation et notifications ;
- Fapshi pour les paiements ;
- Docker / Docker Compose pour le deploiement initial.

Architecture retenue :

- monorepo ;
- separation par services ;
- pas de microservices extremes ;
- logique de jeu isolee dans `packages/game-engine` ;
- mutations critiques dans `packages/db/src/transactions` ;
- Colyseus orchestre le live mais ne possede pas toute la logique metier.

---

## 7. Objets metier centraux

Les objets metier deja identifies sont :

- `User`
- `PlayerProfile`
- `GameSession`
- `SessionRegistration`
- `Payment`
- `Wallet`
- `LedgerEntry`
- `Round`
- `MiniGame`
- `RoundResult`
- `Elimination`
- `PrizeDistribution`
- `GameResult`
- `AuditLog`

Ces objets devront devenir la base du futur modele de donnees PRD, mais le detail du schema ne doit pas encore etre redige en Phase 1.

---

## 8. Contraintes produit

Contraintes fortes :

- Une session doit etre rentable independamment.
- Le paiement doit etre valide par API + PostgreSQL, jamais par Colyseus.
- Aucun mouvement wallet sans `LedgerEntry`.
- Aucune modification financiere sans transaction.
- Aucune action admin sensible sans audit.
- WhatsApp ne doit jamais etre critique pour le fonctionnement.
- Les mini-jeux doivent rester configurables et generalisables.
- Le vocabulaire public peut dire "tournoi", mais le vocabulaire technique doit rester `GameSession`.
- Le produit doit eviter toute perception ou qualification non maitrisee de pari ou jeu d'argent.

---

## 9. Contraintes gameplay

Le catalogue contient 6 familles :

- Solo
- Duel 1v1
- Alliance forcee
- Equipe libre
- Survie collective
- Role cache

Contraintes communes :

- timers serveur ;
- RNG serveur ;
- validation serveur ;
- anti-triche ;
- correction de latence quand necessaire ;
- etat de room Colyseus ;
- resolution produisant classement, qualifies, elimines ou statuts ;
- application finale par la couche session selon `winnersCount`, eliminations et regles configurees.

Point important : certains mini-jeux du catalogue utilisent des termes de "gains" internes a l'epreuve. Il faudra clarifier si ces gains sont uniquement des points/avantages de jeu ou s'ils peuvent influencer une distribution financiere. Par prudence, ils doivent etre traites comme des resultats gameplay tant que le cadre legal n'est pas valide.

---

## 10. Risques majeurs

### Risques juridiques

- Competition payante avec gains financiers.
- Wallet interne assimilable a valeur monetaire.
- Retraits argent reel non clarifies.
- Redistribution des gains pouvant rapprocher le produit d'un jeu d'argent.
- Besoin de CGU, regles de jeu, politique de remboursement et gestion litiges.
- Besoin probable d'un avis juridique local avant lancement public.

### Risques techniques

- Synchronisation temps reel a grande echelle.
- Crash game-server pendant une session live.
- Reconnexion joueur pendant un round.
- Coherence entre Colyseus, PostgreSQL et BullMQ.
- Transactions critiques paiement/wallet/gains.
- Anti-triche sur client web.
- Multi-compte et collusion.
- Latence reseau impactant les mini-jeux de reflexe.

### Risques produit / UX

- Joueurs absents au demarrage.
- Deconnexion pendant round.
- Frustration liee aux eliminations.
- Comprehension des regles de chaque mini-jeu.
- Transparence sur les gains, frais et commissions.
- Confiance dans l'equite du systeme.
- Gestion des joueurs elimines : spectateur, sortie, resume, prochaine session.

### Risques operationnels

- Support paiement Fapshi.
- Remboursements.
- Annulation de session.
- Minimum de joueurs non atteint.
- Litiges sur resultats.
- Validation manuelle de paiements.
- Ajustements wallet.
- Moderation des communications entre joueurs.

---

## 11. Resultats attendus

Les resultats attendus du produit sont :

- Permettre a un joueur de decouvrir, payer et rejoindre une session sans friction excessive.
- Permettre a un admin de creer et rentabiliser des sessions rapidement.
- Offrir une experience temps reel intense, equitable et verifiable.
- Generer des revenus par commission sur sessions.
- Construire une boucle de retention via wallet interne et nouvelles sessions.
- Utiliser WhatsApp comme levier communautaire sans dependance critique.
- Poser une architecture robuste pour supporter paiements, audit, temps reel et futures evolutions.

---

## 12. Hypotheses actuelles

Hypotheses raisonnables pour continuer le PRD :

- La V1 ne permettra pas de retrait d'argent reel sans validation juridique.
- Le wallet V1 sera d'abord un credit interne utilisable pour de nouvelles sessions.
- Le MVP doit se concentrer sur un nombre limite de familles de mini-jeux, pas les 120 jeux.
- Les sessions privees/unlisted sont importantes pour l'acquisition via communautes WhatsApp.
- L'admin initial peut etre un role interne, pas encore une marketplace d'organisateurs externes.
- La 2D immersive n'est pas obligatoire pour la V1.
- Le produit doit privilegier la robustesse paiement/wallet/session avant l'ambition visuelle.
- Les communications joueur devront etre limitees/moderees pour reduire abus et collusion.
- Les gains internes de mini-jeux doivent etre consideres comme points ou avantages gameplay, pas comme argent directement distribuable, sauf validation ulterieure.

---

## 13. Points flous a clarifier plus tard

Les points suivants restent ouverts et devront etre traites dans les prochaines phases :

- Nom final du produit.
- Vocabulaire public exact : session, tournoi, partie, manche.
- Pays cible de lancement et cadre legal applicable.
- Age minimum des joueurs.
- Retraits wallet : exclus V1 ou simplement non priorises ?
- Prix standard par session.
- Commission standard.
- Nombre de gagnants par defaut.
- Regles si minimum de joueurs non atteint.
- Politique de remboursement.
- Politique d'abandon, absence et deconnexion.
- Regles anti-multi-compte.
- Regles de litige.
- Niveau de moderation necessaire.
- Nombre de mini-jeux MVP.
- Nombre de rounds par session.
- Ordre des familles de rounds.
- Experience des joueurs elimines.
- Besoin ou non d'un mode spectateur.
- Role exact de WhatsApp en V1.
- Niveau d'admin live requis au lancement.

---

## 14. Questions de clarification necessaires

Aucune question ne bloque la Phase 2.

Les deux questions les plus importantes a trancher avant les sections financieres et legales du PRD seront :

1. Le lancement cible est-il limite a un pays precis, par exemple le Cameroun, ou pense directement multi-pays ?
2. Pour la V1, confirme-t-on que les gains restent uniquement dans le wallet interne sans retrait argent reel ?

---

## 15. Statut Phase 1

Phase 1 terminee.

La comprehension produit est suffisante pour passer a la Phase 2 : cartographie des branches fonctionnelles.

La Phase 2 ne devra pas encore rediger les specifications detaillees de chaque feature. Elle devra uniquement decomposer le produit en branches fonctionnelles avec purpose, utilisateurs cibles, valeur business, complexite technique, dependances, niveau de risque et profondeur de recherche requise.


---

## FILE: `docs/PRD_PHASE_2.md`

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


---

## FILE: `docs/prompts/feature-01-strict.md`

# Prompt strict - Feature 01

Utilise ce prompt pour le prochain agent. Il est volontairement prescriptif pour eviter les interpretations.

```text
Tu dois corriger et finaliser la Feature 01 : Acquisition, landing et catalogue public.

Avant toute modification :
1. Lire entierement `/home/afreeserv/anonymous/AGENTS.md`.
2. Lire entierement :
   - `/home/afreeserv/anonymous/docs/plan/01-acquisition-catalogue-public.md`
   - `/home/afreeserv/anonymous/docs/prd/features/01-acquisition-catalogue-public.md`
   - `/home/afreeserv/anonymous/docs/BRAINSTORMING.md`
   - `/home/afreeserv/anonymous/docs/PRD_PHASE_1.md`
   - `/home/afreeserv/anonymous/docs/PRD_PHASE_2.md`
   - `/home/afreeserv/anonymous/docs/cahier_des_charges_technique_plateforme_sessions_jeu.md`
   - `/home/afreeserv/anonymous/docs/deep-research-report.md`
3. Inspecter le repo avec :
   - `pwd`
   - `git status --short`
   - `cat package.json`
   - `rg --files`
   - `pnpm list --depth 1`
4. Executer le gate documentaire Context7 :
   - Next.js App Router, metadata, server data loading, build sans reseau externe.
   - Hono routing, zValidator, route grouping, redirects.
   - Prisma schema, migrations, filtered relation count, pagination.

Tu dois corriger les problemes suivants si presents :
1. Si `schema.prisma` contient `visibility`, une migration doit creer l enum/colonne `visibility`. Il est interdit de laisser une migration qui cree seulement `isPublic`.
2. `PUBLIC` est listable.
3. `UNLISTED` est absent du catalogue mais accessible par detail/lien direct autorise.
4. `PRIVATE` est inaccessible via catalogue, detail public et lien partageable generique.
5. Un lien partageable ne doit pas utiliser simplement `GameSession.code` si cela permet d atteindre `PRIVATE`.
6. `placesRemaining` est calcule cote serveur.
7. Le CTA detail ne doit pas etre `href="#"`.
8. L UI ne doit pas afficher `Prize pool`.
9. L UI ne doit pas contenir `pari`, `mise`, `jackpot`, `gain garanti`, ni promesse financiere comme `les meilleurs joueurs remportent les gains`.
10. Le layout ne doit pas garder `Create Next App`.
11. Le build ne doit pas dependre de Google Fonts si l environnement n a pas acces reseau.
12. Les fautes visibles doivent etre corrigees : `auditablesv`, `auditableset`, `progressionnez`.

Tests obligatoires a ajouter ou corriger :
1. Unit test `placesRemaining`.
2. Integration API : PUBLIC visible, UNLISTED absent du catalogue, PRIVATE absent/refuse.
3. Integration API detail : PUBLIC OK, UNLISTED OK, PRIVATE refuse.
4. Integration API share : token invalide 404, token PRIVATE refuse, session annulee/fermee geree.
5. Test migration/schema : DB migree depuis zero possede `visibility`.
6. Test contenu UI : termes interdits et formulations de promesse financiere absents.
7. Test UI ou E2E : landing -> catalogue -> detail -> CTA.

Commandes finales obligatoires :
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test -- --force`
- `pnpm build`
- `pnpm format:check`

Tu ne peux pas declarer la feature terminee si une de ces commandes echoue.

Reponse finale obligatoire :
- docs locales lues ;
- library IDs Context7 utilises ;
- fichiers modifies ;
- migrations creees/modifiees ;
- tests ajoutes ;
- commandes executees et resultats ;
- risques restants.
```



---

## FILE: `docs/recette/final-release-report.md`

# Rapport final de recette V1

Date: 2026-07-08
Branche: `feature/16-finalisation-recette-lancement`
Perimetre: recette finale, stabilisation et lancement controle V1.

## Decision go/no-go

- Lancement controle sandbox: GO, sous reserve d'executer les parcours manuels sur environnement recette avec donnees seedees.
- Lancement live public: NO-GO tant que les gates externes ne sont pas approuves.
- Cash-out argent reel: bloque en V1.
- Jeux a hasard dominant: bloque par gate de conformite.

## Gates documentaires

| Technologie | Version verifiee | Source | Reference | Decision |
| --- | --- | --- | --- | --- |
| Hono | 4.12.28 | Context7 | `/websites/hono_dev` | OK |
| Next.js | 16.2.10 | Context7 | `/vercel/next.js/v16.2.9` | OK |
| Prisma | 6.19.3 | Context7 | `/prisma/web` | OK |
| Colyseus | 0.17.10 | Context7 | `/colyseus/colyseus` | OK |
| BullMQ | 5.79.3 | Context7 | `/websites/bullmq_io` | OK |
| Redis | Redis 7 compose image / ioredis 5.10.1 | Context7 | `/redis/docs` | OK |
| Docker Compose | compose format 3.8 | Context7 | `/docker/compose` | OK |
| Fapshi | HTTP API | Documentation officielle | `https://docs.fapshi.com/llms.txt` | OK |
| WhatsApp Cloud API | Graph API v23 docs | Context7 | `/websites/developers_facebook_business-messaging_whatsapp_v4` | OK |

Notes de verification:
- Fapshi sandbox/live utilisent des credentials et base URLs separes.
- Fapshi requiert `apiuser` et `apikey` en headers.
- Fapshi webhooks envoient `x-wh-secret` si un secret est configure.
- Le polling Fapshi est limite; les webhooks restent le flux principal.
- Docker Compose healthchecks et `--wait` sont disponibles pour attendre les services sains.
- Redis doit etre persistant pour les queues; le compose local active AOF.

## Parcours de recette obligatoires

| Parcours | Evidence automatisee | Evidence manuelle restante | Statut |
| --- | --- | --- | --- |
| Decouverte et inscription | Playwright catalogue public, auth API, registrations API | Parcours navigateur complet sur environnement recette | MANUAL |
| Paiement et lobby | paiements API, lobby API, reconciliation worker | Fapshi sandbox happy path avec credentials sandbox | MANUAL |
| Live et resolution | live API, game-server session store, round deadline worker, round resolution | Smoke test deux clients reconnectables | MANUAL |
| Resultats et credits | admin results, results service, credits distribution worker, wallet routes | Revue ledger sur donnees de recette | MANUAL |
| Support et audit | admin operations, admin payments, security/support routes | Demo support/finance/admin avec comptes distincts | MANUAL |

## Tests finaux a executer

Commandes executees pendant Feature 16:

- `pnpm --filter @session-jeu/db exec prisma format` - PASS
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/session_jeu?schema=public pnpm --filter @session-jeu/db exec prisma validate` - PASS
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/session_jeu?schema=public pnpm --filter @session-jeu/db db:generate` - PASS
- `pnpm typecheck` - PASS
- `pnpm lint` - PASS
- `pnpm test` - PASS
- `pnpm build` - PASS
- `E2E_BASE_URL=http://localhost:3002 pnpm --filter @session-jeu/web test:e2e` - PASS, 4 tests on `next start --port 3002`

Note: `pnpm --filter @session-jeu/db exec prisma validate` sans `DATABASE_URL` explicite echoue dans ce shell parce que Prisma CLI ne charge pas le `.env` racine depuis le package `packages/db`.

## Gates pre-lancement live

| Gate | Statut | Bloque live | Note |
| --- | --- | --- | --- |
| Environnement production configure | MANUAL | Oui | A verifier dans l'infrastructure cible. |
| Secrets production separes | MANUAL | Oui | Le repo ne contient que des placeholders; verifier le secret manager/deploiement. |
| Fapshi live valide | MANUAL | Oui | Activer compte, credentials live et IP whitelist. |
| Backups PostgreSQL actifs | MANUAL | Oui | Depend du provider de base de donnees. |
| Monitoring et alertes actifs | MANUAL | Oui | Connecter logs requestId, workers, paiements et erreurs API a l'outil d'alerte. |
| Politique confidentialite et CGU pretes | BLOCKED | Oui | Documents legaux absents du repo. |
| Avis legal ou lancement limite sans cash-out | PASS | Non | V1 bloque le cash-out; avis juridique requis pour public/live. |
| Plan support incident pret | MANUAL | Oui | Definir astreinte, SLA, escalade et scripts de communication. |
| Rollback plan documente | MANUAL | Oui | A lier au pipeline de deploiement final. |

## Anomalies restantes

- Aucun blocker code connu apres les validations locales.
- Le lancement live public reste bloque par des validations externes non automatisables dans le repo.
- Le fichier `session-ses_0bfa.md` est un contexte local de reprise et ne fait pas partie de la recette.


