# Agentic Feature Pipeline

Ce pipeline transforme une intention produit en implementation verifiable. Chaque sortie devient l'entree
de l'etape suivante. Si une sortie manque, l'agent s'arrete et clarifie.

## Pipeline sequentiel

1. User story produit:
   - role produit/app uniquement: Joueur, Admin, Observateur, Support, Finance, Worker/Systeme;
   - format: `En tant que <role>, je veux <capacite>, afin de <valeur observable>`.
2. Scenarios d'acceptation atomiques:
   - `Given`: etat initial exact;
   - `When`: bouton, lien, champ, menu, toggle, commande utilisateur ou evenement systeme;
   - `Then`: resultat visible, transition, erreur ou absence de fuite;
   - couvrir happy path, permission refusee, transition interdite, idempotence et no-leak si pertinent.
3. Sources locales:
   - produit, UX, architecture/UML, couches, workflows, tests;
   - preuves legacy HEAD si le domaine existait.
4. UML impact:
   - contexte, domaines, state machines, sequences, permissions, data flow, realtime flow, scoring/publication;
   - modifier avant code si une interaction change.
5. Contrats:
   - messages `.proto`, services ConnectRPC futurs, events realtime, erreurs publiques;
   - aucun endpoint Hono nouveau sans contrat ou exception.
6. Couches:
   - web, API/ConnectRPC, game-server, domaine, DB, worker, notifications, observabilite;
   - chaque couche change seulement pour sa responsabilite.
7. Data:
   - modeles durables, migrations, seeds, retention, audit;
   - Prisma ne devient jamais contrat reseau.
8. Permissions:
   - RBAC serveur, participation, audience, support/finance/admin;
   - verifier bouton absent/disabled et refus serveur.
9. Erreurs et reconnexion:
   - erreurs publiques stables;
   - state stale, reconnect, duplicate submit, timeout, forbidden.
10. Tests:
   - un test ou preuve par scenario d'acceptation;
   - unit domaine, contracts/golden, integration API/DB, realtime, UI states, RBAC, no-leak.
11. Implementation Apex:
   - executer `apex-workflow.md`;
   - garder les changements scopes a la fiche sprint;
   - si plusieurs taches sont lancees, appliquer `apex-parallel-worktrees.md` et declarer ownership,
     chemins interdits, commit de base et ressources isolees.
12. Integration:
   - ne pas confondre test unitaire mocke, test de composant, test d'integration et E2E;
   - prouver PostgreSQL, transport Connect/Hono, Colyseus, Redis/worker et navigateur quand ces couches
     appartiennent au scenario;
   - merger les worktrees un par un puis relancer les gates affectes.
13. Validation et documentation:
   - lancer validations;
   - mettre a jour decisions, UML, traceability, matrice AC -> test et risques.

## Execution parallele

Le pipeline produit reste sequentiel a l'interieur d'une feature. Seules des features dont les contrats,
donnees, fichiers partages et dependances sont deja figes peuvent etre executees en parallele. Le plan
de reference v0.1 est `docs/06-roadmap/apex-parallel-execution-plan.md`.

## Interdiction principale

Aucune fonctionnalite ne commence par un composant, une table ou un endpoint. Elle commence par une user
story produit et des scenarios d'acceptation atomiques.
