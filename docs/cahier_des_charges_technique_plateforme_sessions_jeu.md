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
