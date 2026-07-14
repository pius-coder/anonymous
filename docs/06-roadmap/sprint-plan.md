# Plan de reconstruction par sprints

Ce plan decrit l'ordre d'implementation cible pour `v0.1`.
Il ne contient pas d'estimation de duree et ne valide pas le code legacy comme architecture cible.

Chaque sprint doit produire un increment verifiable, avec documentation, contrats, tests et gates
d'acceptation. Une feature ne commence jamais par une table, un endpoint ou un composant UI.

## Sources analysees

Documentation v0.1 :

- `docs/README.md`
- `docs/00-audit/head-forensic-audit.md`
- `docs/00-audit/current-system.md`
- `docs/00-audit/current-routes-and-flows.md`
- `docs/00-audit/feature-implementation-matrix.md`
- `docs/00-audit/keep-rewrite-delete.md`
- `docs/01-product/*`
- `docs/02-ux/*`
- `docs/03-architecture/*`
- `docs/04-layers/*`
- `docs/05-workflows/*`
- `docs/06-roadmap/*`

Preuves legacy HEAD consultees ou synthetisees :

- `HEAD:apps/api/src/index.ts`
- `HEAD:apps/api/src/auth/session.ts`
- `HEAD:apps/api/src/routes/admin/sessions.ts`
- `HEAD:apps/api/src/live/live.ts`
- `HEAD:apps/api/src/results/results.ts`
- `HEAD:apps/api/src/minigames/catalogue.ts`
- `HEAD:apps/api/src/payments/fapshi.ts`
- `HEAD:apps/api/src/wallet/wallet.ts`
- `HEAD:apps/game-server/src/rooms/GameSessionRoom.ts`
- `HEAD:apps/game-server/src/live/sessionStore.ts`
- `HEAD:apps/web/src/hooks/useGameRoom.ts`
- `HEAD:apps/web/src/components/live/LiveRoomShell.tsx`
- `HEAD:packages/db/prisma/schema.prisma`
- `HEAD:docs/analysis-live-connection-flow.md`
- `HEAD:docs/audit-rapport-incoherences.md`
- `HEAD:docs/audit-ui-api-trace.md`
- `HEAD:docs/admin-arbitrage/05-diagrammes.md`

## Regles globales

- Le serveur reste autoritaire pour scores, timers, etats de manche, abandon, reconnexion et anti-triche.
- Le timer peut ouvrir une preparation ou declencher des rappels, mais ne demarre jamais une partie active.
- Les scores provisoires ne sont visibles que par les admins autorises jusqu'a publication explicite.
- L'observation lecture seule utilise snapshots et evenements filtres, jamais prise de controle ni video v0.1.
- Les contrats reseau cible sont Protobuf ; aucun endpoint public nouveau sans contrat documente.
- Les DTO JSON, schemas Prisma, types React et schemas Colyseus ne sont pas la source de verite reseau.
- `SessionRegistration` legacy ne doit pas redevenir le fourre-tout paiement/check-in/in-room.
- Le game server peut utiliser Colyseus, mais la room doit rester mince et delegatee par handlers.
- Les workflows financiers doivent produire une trace unique et auditable, provider externe ou wallet.
- Chaque implementation qui touche une librairie doit relire la documentation courante via `ctx7`.
- Chaque sprint important suit `docs/05-workflows/feature-delivery.md` et le workflow Apex local.

## Gates communs a tous les sprints

- Gate produit : acteur, preconditions, transitions et criteres d'acceptation documentes.
- Gate couches : chaque couche touchee remplit `docs/05-workflows/layer-change-canvas.md`.
- Gate contrats : Protobuf versionne ou decision explicite d'attendre le sprint contrats.
- Gate securite : RBAC, participation, validation d'entrees et absence de fuite de donnees sensibles.
- Gate realtime : audience, reconnexion, replay et erreurs explicites quand du live est touche.
- Gate publication : score publie seulement apres verification et commande admin.
- Gate qualite : `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.

## Vue d'ensemble

| Sprint | Theme | Acteur principal | Depend de | Sortie verifiable |
|---|---|---|---|---|
| 0 | Socle v0.1 et hygiene | Equipe technique | Aucun | Worktree cadrable, docs source de verite, validations de base |
| 1 | Modele produit et domaine | Tous | 0 | Types/etats purs partie, participation, lobby, round, score |
| 2 | Contrats Protobuf v1 | Tous | 1 | Packages proto commands, queries, events, errors |
| 3 | Persistence minimale | API, worker, game-server | 1, 2 | Schema Prisma par domaines, migrations DB vide |
| 4 | Identity, auth et RBAC | Public, joueur, admin | 2, 3 | Session utilisateur, roles, guards, revocation |
| 5 | Acquisition et planification | Public, admin | 4 | Catalogue public, detail partie, creation/config admin |
| 6 | Participation et admission | Joueur, admin | 5 | Participation explicite, inscription, capacite, statuts |
| 7 | Paiements, wallet, ledger | Joueur, finance | 6 | Provider/wallet traces, reconciliation, ledger idempotent |
| 8 | Preparation lobby | Joueur, admin | 6, 7 | Presence, pret, annonces, confirmation lancement |
| 9 | Realtime core | Joueur, observer, admin | 2, 6, 8 | Handshake court, room mince, reconnect, snapshots |
| 10 | Round orchestration | Admin, game-server | 9 | Start/close round, deadlines, state views contractees |
| 11 | Experience joueur live | Joueur | 9, 10 | Etats UI explicites sans fallback vague |
| 12 | Admin command center | Admin, support | 9, 10 | Supervision, commandes, timeline, vues individuelles |
| 13 | Scoring et publication | Admin, joueur | 10, 12 | Provisoire, review, correction, publication idempotente |
| 14 | Framework mini-jeux | Game-server, joueur | 2, 10, 13 | Manifest, runtime, no-leak, premier mini-jeu complet |
| 15 | Lot pilote mini-jeux | Joueur, observer | 14 | Reprise controlee des jeux HEAD prouvables |
| 16 | Observer, carte et social utile | Observer, joueur | 9, 14 | Snapshot readonly, social/carte seulement si usage valide |
| 17 | Notifications et workers | Admin, joueur, systeme | 8, 13 | Annonces, rappels, delivery logs, jobs idempotents |
| 18 | Compliance, support, audit, anti-cheat | Admin, support | 4, 13, 14 | Gates, incidents, risk signals, audit exploitable |
| 19 | Migration legacy controlee | Equipe technique | 0-18 | Manifeste applique, dettes supprimees, validations vertes |

## Sprint 0 - Socle v0.1 et hygiene

Objectif :

- Stabiliser la base de reconstruction avant toute feature produit.
- Rendre clair ce qui est conserve, reecrit, supprime ou inconnu.

Preuves legacy :

- `docs/00-audit/head-file-index.md`
- `docs/00-audit/head-forensic-audit.md`
- `docs/00-audit/deletion-manifest.md`
- `docs/00-audit/keep-rewrite-delete.md`

Implementation :

- Verifier que les workspaces restent : `apps/web`, `apps/api`, `apps/game-server`, `apps/worker`, `apps/whatsapp-gateway`, `packages/db`, `packages/game-engine`, `packages/shared`.
- Conserver lockfiles, configs, scripts racine et tests de socle.
- Supprimer ou archiver seulement les artefacts valides par manifeste.
- Ajouter les guides `ARCHITECTURE.md` par workspace si manquants.
- Mettre en place une convention de changelog sprint dans `docs/06-roadmap/`.

Artefacts :

- Documentation source de verite complete.
- Manifeste de suppression et risques ouverts.
- Rapport de validation initial.

Tests attendus :

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

Definition de termine :

- Le socle compile ou chaque echec est documente avec fichier, cause et sprint de correction.
- Aucune modification utilisateur existante n'est masquee ou ecrasee.

Risques :

- Confondre nettoyage et suppression de decisions produit valables.
- Reintroduire des fichiers legacy entiers au lieu d'extraire leurs regles.

## Sprint 1 - Modele produit et domaine

Objectif :

- Stabiliser le vocabulaire et les invariants : partie, participation, preparation, manche, mini-jeu, score provisoire, score publie.

Preuves legacy :

- `SessionRegistration` portait paiement, check-in et entree room.
- `GameSessionStatus`, `LivePhase`, `RoundStatus` avaient des transitions concurrentes.
- Les docs admin-arbitrage decrivaient des etats plus fins que le code.

Implementation :

- Definir les types purs dans `packages/game-engine` ou un futur package domaine.
- Modeliser les transitions autorisees de `docs/01-product/session-lifecycle.md`.
- Formaliser `PartyParticipation` comme pivot joueur-partie.
- Definir erreurs domaine stables : participation absente, phase invalide, role interdit, score non publiable.
- Documenter les transitions interdites et les evenements domaine.

Contrats et data :

- Aucun endpoint.
- Aucun modele Prisma expose.
- Les futurs messages Protobuf sont identifies mais pas encore generes.

Tests attendus :

- Tests unitaires exhaustifs transitions partie.
- Tests unitaires participation et permissions metier.
- Tests cas limites : no-show, abandon, reconnect, participant elimine.

Definition de termine :

- Aucune dependance Next.js, Hono, Prisma ou Colyseus dans le domaine.
- Le domaine refuse `SCHEDULED -> ACTIVE_ROUND` par timer.

Risques :

- Renommer `SessionRegistration` sans casser le fourre-tout conceptuel.
- Oublier les roles admin/support/finance deja presents dans HEAD.

## Sprint 2 - Contrats Protobuf v1

Objectif :

- Creer la source de verite reseau avant les nouveaux endpoints et messages live.

Preuves legacy :

- Contrats disperses entre Prisma, Zod, React types, Colyseus schema et JSON mini-jeux.
- `round.resolved` diffusait des scores sans separation visible provisoire/publication.

Implementation :

- Creer `packages/contracts` ou l'emplacement cible valide.
- Ajouter les packages proto initiaux :
  - `common/v1`
  - `identity/v1`
  - `session/v1`
  - `participation/v1`
  - `preparation/v1`
  - `realtime/v1`
  - `round/v1`
  - `minigame/v1`
  - `scoring/v1`
  - `admin/v1`
  - `notification/v1`
  - `payment/v1`
- Definir commands, queries, events et errors separement.
- Ajouter conventions : enum `UNSPECIFIED = 0`, champs reserves, correlation ids, audience.
- Creer fixtures contractuelles manuelles sans generation automatique si le tooling n'est pas decide.

Contrats prioritaires :

- `CreateParty`, `ScheduleParty`, `OpenPreparation`, `AttachParticipation`.
- `MarkReady`, `SendPreparationAnnouncement`, `ConfirmStart`.
- `StartRound`, `SubmitPlayerCommand`, `CloseRound`.
- `ProvisionalScoreReady`, `CorrectProvisionalScore`, `PublishResults`.
- `GetPlayerState`, `GetAdminGameState`, `GetReadonlySnapshot`.

Tests attendus :

- Verification syntaxique proto si un outil est ajoute.
- Golden fixtures pour messages critiques.
- Tests de non exposition de champs sensibles par audience.

Definition de termine :

- Aucun nouveau contrat ne recopie une entite Prisma brute.
- Tous les futurs endpoints du sprint 3+ pointent vers un message ou une exception documentee.

Risques :

- Introduire une generation prematuree non decidee.
- Creer des messages trop larges qui figent le schema avant implementation.

## Sprint 3 - Persistence minimale et migrations

Objectif :

- Recomposer le schema durable par domaines valides au lieu de restaurer le schema massif HEAD.

Preuves legacy :

- `packages/db/prisma/schema.prisma` couvrait identity, sessions, live, rounds, results, payments, wallet, notifications, support, audit, compliance et anti-cheat.
- Le probleme principal etait le melange de concepts, pas l'ambition du modele.

Implementation :

- Definir schema minimal par modules :
  - identity : `User`, `AuthSession`, `RoleAssignment`.
  - game planning : `Party`, programme de manches, visibilite.
  - participation : `PartyParticipation`, readiness, admission.
  - realtime : `RealtimeConnection`, state reference minimal.
  - rounds : `Round`, `RoundParticipant`, deadline.
  - scoring : `ProvisionalScore`, `PublishedScore`, `ScoreReview`.
  - audit : `AuditLog`.
  - notifications : `Announcement`, `NotificationJob`, `DeliveryLog`.
  - payments : `PaymentTransaction`, `Wallet`, `LedgerEntry`.
- Ajouter ports repositories dans `packages/db/src` sans exposer Prisma aux contrats.
- Ajouter migrations depuis DB vide.
- Adapter seeds a des donnees minimales non destructives par defaut.

Tests attendus :

- Migration DB vide.
- Tests integration repositories.
- Tests contraintes uniques et index critiques.
- Tests seeds sans paiement orphelin ni ledger incoherent.

Definition de termine :

- `packages/db/prisma/schema.prisma` ne contient pas de contrats reseau publics.
- Aucune migration Prisma n'est modifiee sans test et justification.

Risques :

- Refaire tout le schema HEAD sans priorisation.
- Perdre les concepts utiles : audit, compliance, support, ledger, anti-cheat.

## Sprint 4 - Identity, auth et RBAC

Objectif :

- Rebatir une authentification modulaire avec autorisations serveur.

Preuves legacy :

- `HEAD:apps/api/src/auth/session.ts` utilisait un cookie opaque `__Host-session`, token hash, revocation et `sessionVersion`.
- Roles HEAD : `PLAYER`, `SUPPORT`, `FINANCE`, `ADMIN`, `SUPER_ADMIN`.

Implementation :

- Valider ou remplacer explicitement l'hypothese cookie opaque.
- Ajouter routes/use cases : register, login, logout, current user, revoke session, reset password si scope confirme.
- Ajouter middleware Hono d'auth et RBAC mince.
- Ajouter guards web pour layouts admin/joueur.
- Ajouter rate limit auth et security logs.
- Standardiser les erreurs auth dans contrats.

Tests attendus :

- Register/login/logout/session courante.
- Revocation et sessionVersion.
- Role refuse sur routes admin/finance/support.
- Cookies securises et mode local explicite.
- Rate limit et logs sans secrets.

Definition de termine :

- Toutes les routes protegees refusent les roles incorrects cote serveur.
- Aucun composant web ne devient source d'autorisation finale.

Risques :

- Choisir JWT/OAuth/provider externe sans decision.
- Reprendre les types de role front comme source de verite.

## Sprint 5 - Acquisition publique et planification partie

Objectif :

- Reconstruire l'acquisition publique et la configuration admin sans demarrer le live.

Preuves legacy :

- Routes publiques : `/v1/public/sessions`, `/session/[code]`, catalogue.
- Routes admin sessions trop chargees : creation, publication, ouverture, simulation, lancement.
- Compliance gates pouvaient bloquer toute publication publique sans workflow complet.

Implementation :

- Public :
  - lister parties visibles ;
  - detail par code ;
  - CTA selon etat de participation ;
  - loading, empty, error, inaccessible.
- Admin :
  - creer brouillon ;
  - configurer capacite, prix, visibilite, programme de manches ;
  - valider configuration ;
  - publier si gates compliance satisfaits ;
  - ouvrir preparation sans demarrage auto.
- API :
  - use cases minces ;
  - read models publics separes des read models admin ;
  - audit pour actions sensibles.

Contrats :

- `ListPublicParties`
- `GetPublicParty`
- `CreatePartyDraft`
- `ValidatePartyConfig`
- `PublishParty`
- `ScheduleParty`

Tests attendus :

- Public catalogue/detail.
- Admin creation/publication.
- Compliance bloque avec message exploitable.
- Route code/id resolue sans confusion.

Definition de termine :

- Le joueur peut decouvrir une partie publiee.
- L'admin peut planifier sans lancer une manche active.

Risques :

- Reintroduire `GameSessionStatus` legacy sans les etats v0.1.
- Hardcoder des champs admin comme `durationMs: 0` ou `policy: null`.

## Sprint 6 - Participation et admission joueur

Objectif :

- Replacer l'inscription autour d'une participation explicite et verifiable.

Preuves legacy :

- `SessionRegistrationStatus` melangeait `CREATED`, `PAYMENT_PENDING`, `PAID`, `CHECKED_IN`, `IN_ROOM`, `NO_SHOW`.
- Les flows code/id etaient fragiles dans lobby et live.

Implementation :

- Creer ou formaliser `PartyParticipation`.
- Gerer inscription, annulation, expiration, capacite, statut de paiement attendu.
- Distinguer :
  - droit de participer ;
  - paiement ;
  - presence preparation ;
  - admission round ;
  - connexion realtime.
- Exposer lecture joueur `GetMyParticipation`.
- Exposer lecture admin `ListParticipations`.
- Ajouter idempotence sur commandes sensibles.

Contrats :

- `RegisterForParty`
- `CancelParticipation`
- `GetMyParticipation`
- `ListPartyParticipations`
- `ParticipationStatusChanged`

Tests attendus :

- Capacite min/max.
- Deja inscrit.
- Expiration.
- Annulation.
- Participation requise pour toute entree live.
- Code/id resolves de maniere stable.

Definition de termine :

- Un joueur ne peut pas entrer dans le live sans participation active.
- Aucun statut paiement ne signifie implicitement "connecte a la room".

Risques :

- Reproduire `SessionRegistration` sous un nouveau nom.
- Laisser les compteurs admin et joueur utiliser des filtres differents.

## Sprint 7 - Paiements, wallet et ledger

Objectif :

- Reconstruire le paiement d'acces et les mouvements wallet avec trace uniforme.

Preuves legacy :

- Fapshi existait avec initiate/webhook/reconcile.
- Wallet et ledger existaient.
- Les audits ont identifie le risque de paiements wallet non visibles comme transactions.

Implementation :

- Ports provider paiement.
- Paiement provider externe avec webhook idempotent.
- Paiement wallet avec `PaymentTransaction` provider `WALLET`.
- Ledger debit/credit avec cle idempotence.
- Reconciliation worker.
- Admin finance read models.
- Audit pour ajustements finance.

Contrats :

- `InitiatePayment`
- `GetPaymentStatus`
- `PayWithWallet`
- `ListWalletLedger`
- `ReconcilePayment`
- `PaymentStatusChanged`

Tests attendus :

- Webhook replay.
- Montant verifie.
- Ledger balance alignee.
- Wallet frozen.
- Paiement deja fait.
- Reconciliation idempotente.

Definition de termine :

- Toute entree payee est reliee a une transaction et, si wallet, a un ledger.
- Aucun score, round ou resultat ne depend directement du provider paiement.

Risques :

- Coupler finance et gameplay.
- Publier gains sans modele de resultat confirme.

## Sprint 8 - Preparation lobby et annonces

Objectif :

- Construire l'avant-match admin/joueur avant toute manche active.

Preuves legacy :

- Lobby/check-in existait mais lie a join-token/live reservation.
- Les notifications d'annonce et les statuts de presence etaient disperses.

Implementation :

- Etats participant : invite, paye, present, pret, sans reponse, absent.
- Commandes joueur : mark present, mark ready, leave preparation si autorise.
- Commandes admin : open preparation, send announcement, confirm start with absents.
- Announcements visibles dans une zone dediee, pas dans le mini-jeu actif.
- Worker rappels autorise uniquement pour notifications/preparation.

Contrats :

- `OpenPreparation`
- `MarkPresent`
- `MarkReady`
- `SendPreparationAnnouncement`
- `ConfirmStart`
- `PreparationStateUpdated`

Tests attendus :

- Readiness.
- Absents et override admin explicite.
- Announcement + notification event.
- Timer rappel ne demarre pas la partie active.

Definition de termine :

- Aucune transition automatique de preparation vers `ACTIVE_ROUND`.
- L'admin voit qui est pret avant de lancer.

Risques :

- Melanger annonce preparation et briefing mini-jeu.
- Reintroduire `IN_ROOM` comme statut de preparation.

## Sprint 9 - Realtime core et reconnexion

Objectif :

- Refaire le noyau live avec handshake court, source de verite unique et state views filtrees.

Preuves legacy :

- Flow legacy : join-token -> reservation -> Colyseus `onAuth`.
- Deux transactions Serializable et conflits P2034.
- `GameSessionRoom.ts` gerait auth, rounds, chat, groupes, mini-jeux, resultats.

Implementation :

- Choisir handshake cible :
  - session HTTP + short live token ;
  - ou autre mecanisme documente.
- Supprimer le besoin conceptuel `JoinToken` + `LiveReservation` legacy.
- Room Colyseus mince :
  - auth live ;
  - join/leave/drop/reconnect ;
  - dispatch commandes ;
  - emission state views.
- Separer handlers : connection, round, chat/social, minigame, readonly.
- Definir snapshots par audience : player, admin, observer.
- Ajouter observabilite : connect, reconnect, reject, desync, lag.

Contrats :

- `CreateLiveAccess`
- `JoinLive`
- `ReconnectLive`
- `LiveStateView`
- `ReadonlySnapshot`
- `LiveCommandRejected`

Tests attendus :

- Connexion.
- Reconnexion sans rejouer les inputs.
- Refus participant absent.
- Refus role interdit.
- No leak de state prive.
- Concurrence double connexion.

Definition de termine :

- Aucune commande joueur acceptee hors participation et phase valide.
- L'API REST et le game-server ne modifient plus le meme etat live en double.

Risques :

- Garder la reservation legacy sous un autre nom.
- Laisser les messages Colyseus dicter directement les composants UI.

## Sprint 10 - Round orchestration

Objectif :

- Reconstruire le cycle de manche autoritaire avant les mini-jeux complets.

Preuves legacy :

- `sessionStore.ts` portait start round, finalisation, persistence, deadlines et recette games.
- `BRIEFING_DURATION_MS` et `RESULTS_DURATION_MS` imposaient des transitions automatiques peu compatibles avec l'admin explicite.

Implementation :

- Use cases admin :
  - configure next round ;
  - start round ;
  - pause/resume if allowed ;
  - close round ;
  - enter verification.
- Game-server :
  - start runtime ;
  - enforce deadline ;
  - collect inputs ;
  - close round.
- Worker :
  - deadline de fermeture round si regle validee.
- Persistence :
  - `Round`, `RoundParticipant`, `PlayerAction`, `RoundDeadline`.

Contrats :

- `ConfigureRound`
- `StartRound`
- `PauseRound`
- `CloseRound`
- `RoundStarted`
- `PlayerFinishedRound`
- `RoundClosed`

Tests attendus :

- Start par admin seulement.
- Deadline close autorisee.
- Pause/reprise.
- Input tardif refuse.
- No-show par admission lock.

Definition de termine :

- Le cycle round atteint `ROUND_VERIFICATION` sans publier de scores joueur.
- Les transitions interdites du lifecycle sont impossibles.

Risques :

- Reprendre `round.resolved` comme evenement public.
- Cacher les regles de start dans callbacks Colyseus.

## Sprint 11 - Experience joueur live

Objectif :

- Remplacer le fallback vague par des etats joueur explicites et testables.

Preuves legacy :

- `/session/[code]/live` absorbait briefing, mini-jeu, attente, spectateur, chat, carte, fin de round.
- L'ecran "En attente du serveur" masquait plusieurs causes.

Implementation :

- Routes ou vues joueur selon l'architecture d'information validee.
- Etats UI :
  - preparation waiting ;
  - round briefing ;
  - round active ;
  - round finished waiting review ;
  - waiting next round ;
  - results published ;
  - eliminated observing ;
  - reconnecting ;
  - recoverable error ;
  - blocking error.
- Client realtime contracte.
- Error translation et messages actionnables.
- Responsive et accessibilite pour chaque etat.

Contrats :

- `GetPlayerState`
- `PlayerStateView`
- `SubmitPlayerCommand`
- `PlayerCommandAccepted`
- `PlayerCommandRejected`

Tests attendus :

- Rendu de chaque etat.
- Fin de manche avant publication.
- Reconnexion.
- Erreurs traduites.
- Mobile sans overlap.

Definition de termine :

- Aucun score non publie n'est visible par joueur.
- Aucun "attente serveur" non qualifie ne masque une phase connue.

Risques :

- Refaire `LiveRoomShell` monolithique.
- Mettre des regles competitives dans React.

## Sprint 12 - Admin command center

Objectif :

- Remplacer les surfaces admin fragmentees par un centre de controle separe du parcours joueur.

Preuves legacy :

- `admin/sessions.ts`, `admin/live.ts`, `admin/results.ts`, `admin/operations.ts` etaient separes mais couples.
- `docs/admin-arbitrage/05-diagrammes.md` decrivait Admin A, Admin B, Support, leases et decisions.

Implementation :

- Vue globale partie :
  - lifecycle ;
  - participants ;
  - connexions ;
  - readiness ;
  - manche courante ;
  - incidents ;
  - timeline.
- Commandes admin :
  - open preparation ;
  - confirm start ;
  - start/close/pause round ;
  - enter review ;
  - publish results.
- Lecture seule individuelle via snapshots autorises.
- Audit de chaque commande.
- Option future de control lease si roles multiples confirmes.

Contrats :

- `GetAdminGameState`
- `ListAdminEvents`
- `AcquireAdminControlLease`
- `ExecuteAdminCommand`
- `GetPlayerReadonlySnapshot`

Tests attendus :

- RBAC admin/support/finance.
- Commande refusee sans role.
- Timeline alimentee.
- Observer individuel sans controle client.
- Audit log cree.

Definition de termine :

- Supervision, decision et publication ont des contrats separes.
- L'admin ne controle jamais directement le client joueur.

Risques :

- Refaire un composant admin live unique et massif.
- Donner au support des commandes de publication sans decision RBAC.

## Sprint 13 - Scoring, verification et publication

Objectif :

- Formaliser score provisoire, verification admin, correction et publication explicite.

Preuves legacy :

- `apps/api/src/results/results.ts` melangeait resultats, distribution et disputes.
- `handleRoundResolved` diffusait scores/ranks trop tot.
- Les docs exigent verification et publication explicite.

Implementation :

- Domaine scoring :
  - provisional score ;
  - evidence ;
  - anomaly ;
  - correction ;
  - published score/version.
- Admin review :
  - liste scores provisoires ;
  - anomalies ;
  - correction avec raison ;
  - publication idempotente.
- Joueur :
  - attente verification ;
  - resultats visibles seulement apres publication.
- Persistence :
  - `ProvisionalScore`, `ScoreReview`, `PublishedScore`, `ResultVersion`.

Contrats :

- `ProvisionalScoreReady`
- `ListProvisionalScores`
- `CorrectProvisionalScore`
- `PublishResults`
- `ResultsPublished`
- `GetPublishedResults`

Tests attendus :

- Score provisoire invisible joueur.
- Correction auditee.
- Publication idempotente.
- Re-publication versionnee ou refusee selon decision.
- Resultats joueur apres publication seulement.

Definition de termine :

- `ROUND_VERIFICATION -> RESULTS_PUBLISHED` passe uniquement par commande admin autorisee.
- Les gains ne sont pas distribues avant publication valide.

Risques :

- Confondre finalisation technique de round et resultat officiel.
- Publier des rangs depuis le game-server sans couche review.

## Sprint 14 - Framework d'integration mini-jeux

Objectif :

- Creer le cadre robuste avant de reintegrer les 120 titres produit.

Preuves legacy :

- 120 titres produit.
- 36 definitions API.
- 6 jeux de recette live.
- 3 runtimes dedies : `memory-sequence`, `rapid-calculation`, `pure-reaction-duel`.

Implementation :

- Manifest de mini-jeu versionne :
  - key ;
  - family ;
  - player mode ;
  - config ;
  - commands ;
  - public state ;
  - private state ;
  - events ;
  - scoring ;
  - anti-cheat ;
  - readonly rendering.
- Runtime server-side pur dans `packages/game-engine`.
- Adapter game-server.
- Adapter UI joueur.
- Adapter readonly snapshot.
- Test harness commun.
- Choisir un premier mini-jeu seulement apres fiche validee.

Contrats :

- `MiniGameManifest`
- `MiniGameConfig`
- `MiniGameCommand`
- `MiniGamePublicState`
- `MiniGamePrivateState`
- `MiniGameServerEvent`
- `MiniGameScoreEvidence`

Tests attendus :

- Validation config.
- Command validation.
- Runtime deterministic avec clock/random injectes.
- No private state leak.
- Reconnection.
- Scoring provisoire.

Definition de termine :

- Un mini-jeu est "complete" uniquement avec manifest, runtime, UI, readonly, scoring, anti-cheat et tests.

Risques :

- Implementer un mini-jeu depuis son titre.
- Transformer les 36 definitions JSON/Zod HEAD en source de verite durable.

## Sprint 15 - Lot pilote mini-jeux

Objectif :

- Reprendre un petit lot prouvable depuis HEAD pour valider le framework.

Lot candidat :

- Priorite 1 : `memory-sequence`, car runtime dedie HEAD et regles solo simples.
- Priorite 2 : `pure-reaction-duel`, car runtime dedie HEAD et contraintes temps/reaction.
- Priorite 3 : `rapid-calculation`, car runtime dedie HEAD et scoring serveur.
- Priorite recette optionnelle : `trust-bridge`, `team-relay`, `danger-sweep`, `silent-vote` seulement apres fiches completes.

Implementation :

- Pour chaque jeu :
  - fiche produit ;
  - manifest ;
  - contrats ;
  - runtime ;
  - UI ;
  - readonly ;
  - evidence scoring ;
  - anti-cheat ;
  - tests ;
  - documentation d'extension.

Tests attendus :

- Unit runtime.
- Integration game-server.
- UI etats joueur.
- Observer no-leak.
- Reconnect mid-round.
- Inputs tardifs/dupliques.

Definition de termine :

- Le lot pilote peut etre joue de bout en bout jusqu'a publication des resultats.
- Le catalogue 120 reste inventaire produit, pas promesse d'implementation.

Risques :

- Presenter 36 definitions comme jouables.
- Ne pas documenter les informations cachees des familles role cache.

## Sprint 16 - Observer, carte et social utile

Objectif :

- Definir ce qui releve de l'observation lecture seule et ce qui releve d'un usage social ou carte.

Preuves legacy :

- `LiveRoomShell` et `GameSessionRoom` contenaient carte sociale, chat, groupes, pings, invitations.
- Le produit v0.1 valide l'observer par snapshots/evenements, pas une video.

Implementation :

- Readonly observer :
  - snapshot global ;
  - snapshot individuel ;
  - filtrage par role ;
  - no input possible ;
  - aucune capture stockee.
- Carte/social :
  - conserver uniquement les interactions qui servent un use case valide ;
  - separer chat, groupes, pings des rounds competitifs ;
  - bloquer ou filtrer selon phase.
- UI :
  - vue observer ;
  - etats stale/reconnect/error ;
  - responsive.

Contrats :

- `GetReadonlySnapshot`
- `ReadonlyEvent`
- `ObserverConnected`
- `SocialCommand` si social valide.

Tests attendus :

- Observer ne peut pas envoyer input.
- Etat prive non visible.
- Snapshot filtre par audience.
- Carte non decorative si implementee.
- Chat/social respecte les locks de phase.

Definition de termine :

- Toute interaction carte/social correspond a un use case documente.
- Observer est separe du joueur elimine et de l'admin decideur.

Risques :

- Reproduire `SocialMapCanvas` sans utilite produit.
- Fuite de roles caches via observer ou chat.

## Sprint 17 - Notifications et workers

Objectif :

- Refaire annonces, rappels, delivery status et jobs idempotents.

Preuves legacy :

- `NotificationJob`, `DeliveryLog`, `OutboundMessage` existaient.
- Worker gerait check-in deadline, expiration, payment reconciliation, credits, notifications, round deadline.
- WhatsApp gateway existait mais le provider final reste ouvert.

Implementation :

- Ports notifications :
  - in-app ;
  - WhatsApp/push/SMS selon decision provider.
- Announcement -> notification job.
- Delivery log et status mapping.
- Preferences/consentement si scope confirme.
- Jobs idempotents :
  - preparation reminders ;
  - registration expiration ;
  - payment reconciliation ;
  - round close deadline ;
  - prize distribution seulement apres Sprint 13.
- Observabilite jobs.

Contrats :

- `SendAnnouncement`
- `CreateNotificationJob`
- `NotificationDeliveryUpdated`
- `ListMyNotifications`
- `AcknowledgeNotification`

Tests attendus :

- Enqueue idempotent.
- Retry provider.
- Failure provider.
- Pas de demarrage partie par notification.
- Logs sans secrets.

Definition de termine :

- Une notification ne demarre aucune partie et ne publie aucun score.
- Les statuts livraison sont comprehensibles par admin et joueur.

Risques :

- Confondre rappel systeme et transition metier.
- Bloquer le sprint sur un provider externe non choisi.

## Sprint 18 - Compliance, support, audit et anti-cheat

Objectif :

- Rendre les actions sensibles auditables et exploitables par admin/support.

Preuves legacy :

- Compliance gates pouvaient bloquer toute publication publique.
- `AdminActionApproval`, `IncidentLog`, `SupportCase`, `RiskSignal`, `AntiCheatEvent` existaient.
- Les docs admin-arbitrage prevoyaient incidents, decisions et approvals.

Implementation :

- Compliance :
  - lister gates ;
  - passer/waiver avec evidence ;
  - audit ;
  - blocage publication explicite.
- Support :
  - lire dossier utilisateur/participation ;
  - incidents ;
  - notes ;
  - aucune commande competition sans permission.
- Anti-cheat :
  - evenements normalises ;
  - late input ;
  - duplicate nonce ;
  - suspicious rate ;
  - review flags.
- Audit :
  - conventions action/entity/reason/correlationId ;
  - redaction secrets.

Contrats :

- `ListComplianceGates`
- `DecideComplianceGate`
- `OpenIncident`
- `ListAuditEvents`
- `RecordAntiCheatEvent`
- `ListRiskSignals`

Tests attendus :

- Publication publique bloquee/debloquee par workflow complet.
- Audit obligatoire pour action sensible.
- Support read-only respecte.
- Anti-cheat event n'expose pas donnees privees inutiles.

Definition de termine :

- Les gates compliance ne sont plus des blocages sans issue.
- Les actions sensibles ont trace, acteur, raison et resultat.

Risques :

- Donner une UI d'administration sans garde serveur.
- Stocker des secrets ou reponses cachees dans les logs.

## Sprint 19 - Migration legacy controlee et recette

Objectif :

- Appliquer le manifeste de migration et supprimer la dette legacy uniquement avec preuves.

Preuves legacy :

- `HEAD` contenait des routes, docs, sorties agents, assets et tests utiles mais melanges.
- Les anciens dossiers `docs/plan/` et `docs/prd/features/` ne sont plus source de verite.

Implementation :

- Mapper chaque element HEAD vers :
  - conserve ;
  - reecrit ;
  - supprime ;
  - archive ;
  - inconnu.
- Rejouer ou adapter les tests legacy utiles.
- Supprimer les artefacts generes non source.
- Archiver les decisions historiques restantes dans les docs v0.1.
- Valider E2E critiques :
  - public -> inscription -> paiement -> preparation ;
  - admin -> planification -> preparation -> start round ;
  - joueur -> live -> finish -> waiting review -> results ;
  - admin -> verify -> publish ;
  - observer readonly ;
  - notification reminder ;
  - paiement/wallet/reconciliation.

Tests attendus :

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- E2E parcours critiques.
- Tests migration DB vide.
- Tests no-leak realtime.

Definition de termine :

- Aucun fichier legacy supprime sans preuve et remplacement.
- Aucun parcours critique perdu sans decision explicite.
- Les questions ouvertes restantes sont documentees dans `docs/06-roadmap/risks-and-open-decisions.md`.

Risques :

- Reintroduire dette par compatibilite temporaire non bornee.
- Confondre "recette demo" et produit pret.

## Decoupage vertical recommande

Pour eviter des sprints trop horizontaux, chaque feature importante doit etre livree comme tranche :

1. Produit : acteur, preconditions, etats, transitions.
2. Contrats : commands, queries, events, errors.
3. Domaine : invariants et tests unitaires.
4. Persistence : schema, migration, repository, tests integration.
5. API ou realtime : transport mince, validation, permissions.
6. UI : etats loading/empty/error/reconnect/accessibilite.
7. Observabilite : audit/log/metric sans secret.
8. Validation : typecheck, lint, test, build, E2E si critique.

## Questions ouvertes avant certains sprints

- Roles admin finaux : simple `ADMIN` ou separation Admin A/Admin B/Support/Finance ?
- Provider notification : WhatsApp seul, web push, SMS ou multi-canal ?
- Auth finale : cookie opaque conserve ou federation externe ?
- Premiere priorite mini-jeux : solo uniquement ou lot couvrant plusieurs familles ?
- Gains financiers : inclus immediatement apres publication ou differes apres recette gameplay ?
- Retention observer/live events : duree, anonymisation et profondeur de replay ?
- Carte/social : usage produit exact ou suppression jusqu'a preuve ?

## Ordre strict minimal

Les sprints 0 a 4 sont bloquants pour une reconstruction saine.
Les sprints 5 a 13 construisent le parcours produit de bout en bout.
Les sprints 14 a 16 ajoutent les mini-jeux et l'observation.
Les sprints 17 a 18 durcissent notifications, support, compliance et anti-cheat.
Le sprint 19 ferme la migration et ne doit pas commencer tant que les modules cibles ne sont pas stables.
