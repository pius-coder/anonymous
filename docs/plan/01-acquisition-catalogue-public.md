# Feature 01 - Plan Scrum - Acquisition, landing et catalogue public

## Objectif sprint

Livrer un catalogue public fiable : landing, liste des sessions publiques, detail session, liens partageables et CTA vers auth/inscription.

## Decisions non negociables

- La visibilite de session est un enum `PUBLIC | UNLISTED | PRIVATE`, pas un booleen.
- Toute modification de `schema.prisma` doit avoir une migration Prisma/SQL correspondante et testee depuis une DB vide.
- Les montants sont affiches comme frais d inscription et recompenses internes uniquement si le wording reste prudent.
- Ne pas utiliser les termes publics suivants : `pari`, `mise`, `jackpot`, `gain garanti`.
- Eviter aussi les formulations qui promettent un resultat financier, par exemple `les meilleurs joueurs remportent les gains`.
- L UI ne doit pas afficher `Prize pool` en anglais ; utiliser une formulation prudente comme `Recompenses internes configurees`.
- `PRIVATE` ne doit jamais etre accessible via catalogue, detail public ou lien partageable generique.
- `UNLISTED` ne doit pas apparaitre dans le catalogue, mais peut etre accessible via un lien direct ou un token dedie.
- Le CTA detail ne doit jamais etre `href="#"`. Si Feature 02/05 n est pas prete, pointer vers `/auth/register?next=/session/{code}` ou afficher un bouton desactive avec texte explicite.
- `pnpm typecheck`, `pnpm lint`, `pnpm test` et `pnpm build` doivent passer avant merge.

## Dependances

- Sprint 0 termine.
- Modeles `GameSession` et `SessionRegistration` disponibles.
- Seed avec sessions `PUBLIC`, `UNLISTED`, `PRIVATE`.

## Gate documentaire obligatoire

Avant implementation :

1. Lire via Context7 les docs actuelles de Next.js pour App Router, metadata et chargement serveur.
2. Lire via Context7 Hono pour routing, validation, erreurs et middleware.
3. Lire via Context7 Prisma pour requetes, pagination et calculs de capacite.
4. Noter les imports exacts, patterns de routing et conventions de response avant de coder.
5. Ne pas creer les pages/API tant que le gate documentaire n est pas documente dans les notes de sprint.

## User stories

### Story 1.1 - Landing publique

Etapes :

1. Creer la page landing dans `apps/web`.
2. Ecrire un wording prudent : competition structuree, adresse, strategie, social.
3. Retirer tout vocabulaire : pari, mise, jackpot, gain garanti.
4. Ajouter CTA vers catalogue.
5. Ajouter metadata SEO.
6. Remplacer toute metadata par defaut `Create Next App`.
7. Ne pas utiliser `next/font/google` si le build doit fonctionner sans acces reseau ; utiliser police systeme ou font locale.
8. Relire le contenu avec `rg` pour supprimer les formulations de promesse financiere.

Tests :

- Test snapshot ou component.
- Test anti-wording interdit.
- Test metadata minimale.
- Test build Next.js sans dependance reseau externe.

### Story 1.2 - API catalogue public

Etapes :

1. Verifier le schema Prisma actuel avant toute route.
2. Ajouter/valider enum `SessionVisibility { PUBLIC, UNLISTED, PRIVATE }`.
3. Generer une migration qui ajoute/remplace proprement le champ `GameSession.visibility`.
4. Mettre a jour le seed avec au moins une session `PUBLIC`, une `UNLISTED`, une `PRIVATE`.
5. Creer `GET /v1/public/sessions`.
6. Filtrer uniquement `visibility = PUBLIC`.
7. Filtrer uniquement les statuts publiables/inscriptibles definis dans le schema courant. Si `REGISTRATION_OPEN` n existe pas encore, documenter le mapping temporaire exact.
8. Calculer `placesRemaining` cote serveur.
9. Exclure les inscriptions annulees/remboursees/inactives du compteur actif selon les enums disponibles.
10. Ajouter pagination simple.
11. Ajouter erreurs standard.
12. Ajouter un test integration ou migration qui prouve que la DB migree possede bien `visibility` et plus seulement `isPublic`.

Tests :

- PUBLIC retourne.
- UNLISTED absent.
- PRIVATE absent.
- Calcul places restantes.
- Pagination.
- Migration DB depuis zero.
- Seed DB apres migration.

### Story 1.3 - Page detail session

Etapes :

1. Creer `GET /v1/public/sessions/:slug`.
2. Autoriser `PUBLIC`.
3. Autoriser `UNLISTED` par slug/token direct.
4. Bloquer `PRIVATE` sans autorisation.
5. Retourner prix, date, places, regles essentielles, politique no-show/remboursement.
6. Creer page web detail.
7. Ajouter CTA selon auth : login/register ou intention inscription.
8. Gerer l erreur 404/410 cote UI avec une page ou un etat explicite.
9. Ne pas afficher de libelle anglais comme `Prize pool`.
10. Ne pas afficher de CTA vide ou `href="#"`.
11. Ajouter test qui verifie le CTA final.

Tests :

- Detail PUBLIC OK.
- Detail UNLISTED par lien OK.
- PRIVATE refuse.
- CTA non connecte.
- CTA connecte.
- UI detail affiche les erreurs sans fuite de session private.

### Story 1.4 - Liens partageables

Etapes :

1. Creer modele ou champ `ShareLink`/token si necessaire.
2. Creer resolution `GET /v1/share/:token`.
3. Ne pas utiliser `GameSession.code` comme token de partage si cela donne acces a une session `PRIVATE`.
4. Rediriger vers detail session seulement si le token correspond a une session `PUBLIC` ou `UNLISTED` partageable.
5. Refuser `PRIVATE` sans invitation/allowlist/code d acces.
6. Journaliser `share.link-opened`.
7. Ajouter test qui prouve qu un lien vers `PRIVATE` ne fuite pas.

Tests :

- Token valide redirige.
- Token invalide renvoie 404.
- Session annulee renvoie statut ferme.
- Token/session PRIVATE refuse sans autorisation.

## Definition of Done

- Criteres de tests a valider :
  - Test unitaires du calcul `placesRemaining`.
  - Tests integration API pour `PUBLIC`, `UNLISTED`, `PRIVATE`.
  - Tests UI catalogue et detail session.
  - Test E2E visiteur : landing -> catalogue -> detail -> CTA.
  - Test securite : session `PRIVATE` ne fuite pas.
  - Test contenu : aucun wording interdit.
  - Test migration DB : `schema.prisma` et migrations sont coherents.
  - Test build : `pnpm build` passe.
  - Test lint : `pnpm lint` passe.
- Landing, catalogue et detail utilisables.
- Les visibilites `PUBLIC`, `UNLISTED`, `PRIVATE` sont respectees.
- Les tests API et UI passent.
- L E2E obligatoire existe et passe.
- Aucun texte public ne promet un gain garanti.
- Demo : ouvrir catalogue, detail public, lien unlisted, private bloque.
