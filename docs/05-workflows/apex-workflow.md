# Apex Workflow Strict

Apex est le workflow obligatoire pour toute implementation ou correction importante. Il ne remplace pas
le pipeline produit; il l'execute dans l'ordre.

## Gates obligatoires

1. Doc gate:
   - lire `docs/README.md`;
   - lire la fiche sprint concernee dans `docs/06-roadmap/sprints/`;
   - lire les docs produit, UX, architecture/UML, couches et tests referencees par la fiche.
2. Context7 gate:
   - utiliser `ctx7` avant toute decision impliquant bibliotheque, framework, SDK, API, CLI ou service cloud;
   - noter l'ID Context7 utilise dans la reponse finale.
3. Product brief gate:
   - confirmer les user stories produit;
   - confirmer les scenarios d'acceptation atomiques `Given / When / Then`;
   - ne pas commencer si l'action utilisateur concrete est inconnue.
4. UML impact gate:
   - identifier les diagrammes lus;
   - modifier les diagrammes si une transition, permission, sequence, data flow ou audience change.
5. Contract plan gate:
   - definir messages `.proto`, services ConnectRPC futurs, events realtime et erreurs publiques;
   - documenter toute exception avant endpoint Hono.
6. Layer plan gate:
   - remplir le canevas pour web, API/ConnectRPC, game-server, domaine, DB, worker, notifications et observabilite.
7. Tests-first gate:
   - lister les tests par scenario d'acceptation;
   - verifier les refus, no-leak, RBAC, idempotence, erreurs et regressions.
8. Implementation gate:
   - coder par couche en respectant les dependances autorisees;
   - ne pas ecraser les changements utilisateur.
9. Validation gate:
   - executer les commandes adaptees: `pnpm docs:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`;
   - documenter tout echec.
10. Adversarial review gate:
   - relire comme reviewer hostile: fuite de state, autorisation client, transition interdite, test faux positif,
     contrat trop large, endpoint sans proto.

## Interdictions

- Commencer par une table, un endpoint ou un composant.
- Traiter une tache technique comme user story produit.
- Utiliser `Agent`, `API`, `DB` ou `Game-server` comme role de user story.
- Ajouter une route publique sans contrat `.proto` ou exception documentee.
- Declarer termine si la Definition of Done de la fiche sprint n'est pas satisfaite.
