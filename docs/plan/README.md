# Plan d implementation Scrum - Plateforme de sessions de jeu

Date : 2026-07-07
Statut : plan de developpement executable

## Objectif

Ce dossier transforme les PRD de `prd/features/` en plan de developpement Scrum. Il donne l ordre de construction depuis l initialisation technique jusqu aux derniers tests de recette.

## Methode Scrum retenue

- Sprint court de 1 a 2 semaines.
- Chaque feature est livree comme un increment vertical testable.
- Chaque sprint commence par refinement + sprint planning.
- Chaque jour : daily courte, blocages, risques.
- Chaque fin de sprint : demo, retrospective, mise a jour du backlog.
- Aucune feature n est consideree terminee sans tests, revue, documentation et criteres d acceptation valides.

## Gate documentaire obligatoire avant implementation

Ce gate bloque le developpement. Aucun agent ne doit installer, importer ou coder une librairie, un framework, un SDK, une API externe ou un service cloud sans avoir lu la documentation actuelle.

Pour chaque story technique :

1. Lister les technologies touchees : Next.js, Hono, Prisma, PostgreSQL, Colyseus, BullMQ, Redis, Fapshi, WhatsApp, Docker, OWASP ou autre.
2. Pour chaque librairie/framework/SDK/API/CLI/cloud service, lancer Context7 :
   - `npx ctx7@latest library <Nom officiel> "<question complete de la story>"`
   - choisir l ID le plus pertinent.
   - `npx ctx7@latest docs <libraryId> "<question complete de la story>"`
3. Noter dans la story :
   - library ID utilise ;
   - version/package installe ou vise ;
   - imports exacts verifies ;
   - exemple officiel ou page officielle utilisee ;
   - peer dependencies ;
   - contraintes TypeScript/config ;
   - decisions prises et risques restants.
4. Si Context7 echoue par quota, stopper la story et demander `npx ctx7@latest login` ou `CONTEXT7_API_KEY`.
5. Si Context7 ne couvre pas un provider, lire uniquement la documentation officielle du provider.
6. Ne jamais coder a partir de memoire, d une ancienne API supposee ou d une reponse LLM non verifiee.
7. Si la version installee ne correspond pas a la documentation lue, resoudre d abord le conflit de version avant de coder.

## Ordre recommande

### Phase 0 — Fondations (features 00-16)

1. `00-initialisation-projet.md`
2. `01-acquisition-catalogue-public.md`
3. `02-authentification-compte.md`
4. `04-configuration-sessions-admin.md`
5. `05-inscription-session.md`
6. `06-paiement-fapshi.md`
7. `07-wallet-ledger-credits.md`
8. `08-lobby-check-in.md`
9. `09-session-live-temps-reel.md`
10. `10-game-engine-resolution-rounds.md`
11. `11-catalogue-mini-jeux-configurables.md`
12. `12-resultats-gains-distribution.md`
13. `03-profil-joueur-historique.md`
14. `13-dashboard-admin-audit-support.md`
15. `14-notifications-whatsapp.md`
16. `15-securite-anti-triche-conformite.md`
17. `16-finalisation-recette-lancement.md`

### Phase 1 — Fondations AAA (17)

18. `17-phase1-fondations.md` — Design system Squid Game, assets (polices Fontsource, 14 SFX, sprite), RetroUI, juice.ts, boucle de rounds serveur completee, runtimes anti-triche, spectateur.

### Phase 2 — Parcours joueur (18)

19. `18-phase2-parcours-joueur.md` — Auth drawer, inscription/paiement, wallet/profil, lobby immersif + useGameRoom, UI des 3 mini-jeux MVP, spectateur, resultats podium.

### Phase 3 — Operateur & lancement (19)

20. `19-phase3-operateur-lancement.md` — Admin RBAC + sidebar, Program Builder avec simulation funnel, controle live, audit/support, PixiJS survie avancee, polish, recette finale 5 parcours Playwright.

### Archive

Les anciens fichiers decoupes (17-22) sont deplaces dans `archive/` pour reference historique.

## Definition of Ready

Une feature peut entrer en sprint seulement si :

- Le PRD feature existe dans `prd/features/`.
- Les dependances precedentes sont livrees ou mockees proprement.
- Les user stories sont decoupees.
- Les criteres d acceptation sont testables.
- Les risques securite, paiement, legal ou data sont identifies.
- Les donnees, API et evenements sont listes.
- Le gate documentaire obligatoire est execute pour toutes les technologies touchees.

## Criteres de tests obligatoires

Avant de marquer une story ou une feature comme terminee, l agent doit valider et documenter les tests suivants selon le perimetre touche :

- Tests unitaires : fonctions metier, calculs, transitions d etat, helpers, resolvers.
- Tests d integration : API + DB, transactions, permissions, erreurs normalisees, jobs.
- Tests E2E : parcours utilisateur critique depuis l UI jusqu a la persistance.
- Tests de concurrence : double clic, derniere place, double paiement, double debit wallet, double distribution.
- Tests de securite : auth, RBAC, BOLA, rate limits, cookies, webhook secret, donnees privees.
- Tests de recovery : retry worker, webhook rejoue, crash game-server, job relance.
- Tests d observabilite : audit log, requestId, evenement metier, metrique critique.
- Tests de non-regression : ancienne erreur reproduite puis bloquee par test.

Regle stricte :

- Une feature financiere, live, auth ou admin ne peut pas etre consideree terminee sans au minimum tests unitaires + integration + securite.
- Une feature exposee a l utilisateur ne peut pas etre consideree terminee sans au minimum un test E2E du parcours principal.
- Une feature qui touche paiement, wallet, capacite ou resultats ne peut pas etre consideree terminee sans test de concurrence/idempotence.
- Si un type de test est impossible, l agent doit expliquer pourquoi dans la fiche sprint et creer une tache technique de rattrapage.

## Definition of Done globale

Une feature est terminee seulement si :

- Schema DB/migrations appliquees.
- Backend implemente et teste.
- Frontend implemente et teste.
- Jobs/events necessaires implementes ou explicitement reportes.
- Validations, erreurs et permissions couvertes.
- Tests unitaires, integration et E2E pertinents passent.
- Les criteres de tests obligatoires de la fiche feature sont valides et documentes.
- Logs, metriques et audit minimum branches.
- Documentation mise a jour.
- Demo sprint acceptee par le Product Owner.
