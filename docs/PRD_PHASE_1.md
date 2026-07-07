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
