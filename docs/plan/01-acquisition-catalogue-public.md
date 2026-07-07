# Feature 01 - Plan Scrum - Acquisition, landing et catalogue public

## Objectif sprint

Livrer un catalogue public fiable : landing, liste des sessions publiques, detail session, liens partageables et CTA vers auth/inscription.

## Dependances

- Sprint 0 termine.
- Modeles `GameSession` et `SessionRegistration` disponibles.
- Seed avec sessions `PUBLIC`, `UNLISTED`, `PRIVATE`.

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

- Landing, catalogue et detail utilisables.
- Les visibilites `PUBLIC`, `UNLISTED`, `PRIVATE` sont respectees.
- Les tests API et UI passent.
- Aucun texte public ne promet un gain garanti.
- Demo : ouvrir catalogue, detail public, lien unlisted, private bloque.

