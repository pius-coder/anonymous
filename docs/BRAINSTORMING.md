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
