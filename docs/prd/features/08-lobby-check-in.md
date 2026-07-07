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
