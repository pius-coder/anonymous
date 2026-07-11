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

Source transverse ajoutee pour les features live/game-engine/catalogue/resultats/admin/securite :

- `docs/admin-arbitrage/README.md`
- `docs/admin-arbitrage/01-reglement-arbitrage.md`
- `docs/admin-arbitrage/02-user-stories-dashboard.md`
- `docs/admin-arbitrage/03-edge-cases.md`
- `docs/admin-arbitrage/04-ui-jeux-dashboard.md`
- `docs/admin-arbitrage/05-diagrammes.md`
- `docs/admin-arbitrage/06-plan-apex-implementation.md`

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
