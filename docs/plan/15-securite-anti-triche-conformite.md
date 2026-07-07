# Feature 15 - Plan Scrum - Securite, anti-triche, conformite

## Objectif sprint

Durcir toute la plateforme : session, autorisation, anti-cheat, anti-fraude, moderation, audit et gates de conformite.

## Dependances

- Toutes les features 01 a 14.
- Peut aussi etre travaillee transversalement a chaque sprint.

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

- Securite transversale testee.
- Anti-cheat minimum actif.
- Cash-out bloque.
- Legal/compliance gates visibles.
- Tests adversariaux passent.

