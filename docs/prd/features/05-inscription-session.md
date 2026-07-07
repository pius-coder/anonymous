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
