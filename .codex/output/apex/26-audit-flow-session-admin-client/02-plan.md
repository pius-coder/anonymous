# Step 02: Plan

**Task:** Full revue du flow creation/configuration/publication de session cote admin et inscription cote client, avec audit UX/copy/accessibilite et corrections des frictions dans le scope
**Started:** 2026-07-10T19:46:23Z

---

## Planning Progress

1. Stabiliser les statuts et libelles publics:
   - creer une source UI partagee pour les labels de statut;
   - reserver "Inscriptions ouvertes" aux sessions `ACTIVE`;
   - rendre les raisons de CTA disabled explicites.
2. Fermer les trous API/securite autour de la visibilite:
   - bloquer l'inscription directe aux sessions `PRIVATE`;
   - masquer les details publics des sessions non publiquement visibles;
   - corriger le filtre public `open`;
   - revalider la configuration avant `open-registration`.
3. Reduire la friction client:
   - conserver `next` dans les drawers login/register;
   - rendre le CTA detail deterministe;
   - choisir Fapshi par defaut et wallet seulement si utilisable;
   - clarifier les messages d'inscription et paiement.
4. Reduire la friction admin/copy:
   - rendre les options de visibilite lisibles;
   - afficher les erreurs admin sous forme d'alerte comprehensible;
   - clarifier les libelles financiers en bps sans masquer la notion metier.
5. Renforcer paiement et DB:
   - retry Fapshi sur paiements echoues/expires;
   - ignorer les webhooks qui contredisent un terminal success;
   - refuser les mismatches de montant;
   - etendre l'index unique des inscriptions actives.
6. Ajouter/mettre a jour tests unitaires, integration, securite et regression UI statique.
7. Verifier par CLI:
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm test`
   - `pnpm build`
   - inspection OpenCLI + captures.
