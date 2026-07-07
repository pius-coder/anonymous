# Feature 01 - Plan Scrum - Acquisition, landing et catalogue public

## Objectif sprint

Livrer un catalogue public fiable : landing, liste des sessions publiques, detail session, liens partageables et CTA vers auth/inscription.

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

Tests :

- Test snapshot ou component.
- Test anti-wording interdit.
- Test metadata minimale.

### Story 1.2 - API catalogue public

Etapes :

1. Creer `GET /v1/public/sessions`.
2. Filtrer uniquement `visibility = PUBLIC`.
3. Filtrer les statuts visibles : `PUBLISHED`, `REGISTRATION_OPEN`, selon regle finale.
4. Calculer `placesRemaining` cote serveur.
5. Exclure `CANCELLED`, `REFUNDED` du compteur actif.
6. Ajouter pagination simple.
7. Ajouter erreurs standard.

Tests :

- PUBLIC retourne.
- UNLISTED absent.
- PRIVATE absent.
- Calcul places restantes.
- Pagination.

### Story 1.3 - Page detail session

Etapes :

1. Creer `GET /v1/public/sessions/:slug`.
2. Autoriser `PUBLIC`.
3. Autoriser `UNLISTED` par slug/token direct.
4. Bloquer `PRIVATE` sans autorisation.
5. Retourner prix, date, places, regles essentielles, politique no-show/remboursement.
6. Creer page web detail.
7. Ajouter CTA selon auth : login/register ou intention inscription.

Tests :

- Detail PUBLIC OK.
- Detail UNLISTED par lien OK.
- PRIVATE refuse.
- CTA non connecte.
- CTA connecte.

### Story 1.4 - Liens partageables

Etapes :

1. Creer modele ou champ `ShareLink`/token si necessaire.
2. Creer resolution `GET /v1/share/:token`.
3. Rediriger vers detail session.
4. Journaliser `share.link-opened`.

Tests :

- Token valide redirige.
- Token invalide renvoie 404.
- Session annulee renvoie statut ferme.

## Definition of Done

- Criteres de tests a valider :
  - Test unitaires du calcul `placesRemaining`.
  - Tests integration API pour `PUBLIC`, `UNLISTED`, `PRIVATE`.
  - Tests UI catalogue et detail session.
  - Test E2E visiteur : landing -> catalogue -> detail -> CTA.
  - Test securite : session `PRIVATE` ne fuite pas.
  - Test contenu : aucun wording interdit.
- Landing, catalogue et detail utilisables.
- Les visibilites `PUBLIC`, `UNLISTED`, `PRIVATE` sont respectees.
- Les tests API et UI passent.
- Aucun texte public ne promet un gain garanti.
- Demo : ouvrir catalogue, detail public, lien unlisted, private bloque.
