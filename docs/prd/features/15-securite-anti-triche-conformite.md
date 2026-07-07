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
