# Step 07: Tests

**Task:** Full revue du flow creation/configuration/publication de session cote admin et inscription cote client, avec audit UX/copy/accessibilite et corrections des frictions dans le scope
**Started:** 2026-07-10T19:46:23Z

---

## Test Analysis and Creation

- Tests API ajoutes ou ajustes:
  - `registrations.test.ts`: refus d'inscription directe pour session `PRIVATE`.
  - `public-session-detail.test.ts`: `PRIVATE`/`DRAFT` masques, statuts fermes conserves.
  - `public-sessions.test.ts`: filtre `open` limite aux `ACTIVE`.
  - `admin-sessions.test.ts`: `open-registration` refuse une session devenue invalide.
  - `fapshi.test.ts`: mismatch montant et webhook terminal ignore.
  - `admin-payments.test.ts`: mock DB aligne avec le module paiement.
- Tests web ajustes:
  - `pages.test.ts`, `design-system.test.ts`, `live-games.test.ts`: chemins actuels `(arena)`.
- Couverture par risque:
  - securite: visibilite `PRIVATE`, masquage public.
  - integration API: catalogue/detail/inscription/admin actions.
  - paiement/idempotence: retries et webhooks terminaux.
  - UI statique: routes publiques et surfaces live.
