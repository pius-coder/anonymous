# Feature 01 - Acquisition, landing et catalogue public des sessions

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Presenter le produit, exposer les sessions accessibles et convertir un visiteur vers une inscription sans vocabulaire de pari ni promesse de gain garanti.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Permettre aux visiteurs, joueurs existants et communautes venant de liens partages de comprendre le concept, consulter les sessions disponibles et acceder au bon parcours selon leur etat auth. |
| Target users | visiteurs non connectes, joueurs existants, communautes WhatsApp ou liens partages, admins marketing qui publient une session |
| Business value | Elevee: c est l entree du funnel acquisition, partage, remplissage des sessions et conversion vers inscription. |
| Technical complexity | Moyenne: pages publiques classiques, mais visibilite PUBLIC/UNLISTED/PRIVATE, statuts, capacite et wording legal prudent. |
| Risk level | Moyen: confusion produit, fuite d informations sur sessions privees, wording trop proche du pari ou des jeux d argent. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Landing publique, catalogue des sessions, page detail session, lien partageable et CTA vers auth/inscription.
- Filtrage serveur des sessions PUBLIC; resolution directe par slug/token pour UNLISTED; controle d acces strict pour PRIVATE.
- Calcul serveur des places restantes et statuts affichables; aucune confiance dans des compteurs client.
- Metadata SEO/social sharing et messages publics orientes competition structuree, adresse, strategie et experience sociale.

## Parcours et workflows

1. Visiteur ouvre le catalogue: l API retourne uniquement les sessions PUBLIC en statut publiable/inscriptible.
2. Visiteur ouvre un lien UNLISTED: le slug/token est resolu sans l ajouter aux listings publics.
3. Visiteur ouvre une session PRIVATE: invitation, allowlist ou code d acces est requis; sinon erreur non bavarde.
4. CTA session: utilisateur non connecte va vers register/login; utilisateur connecte va vers intention d inscription.

## Logiques metier et invariants

- Les sessions PUBLIC doivent etre listables.
- Les sessions UNLISTED ne doivent pas apparaitre dans le catalogue mais restent accessibles par lien valide.
- Les sessions PRIVATE exigent invitation, approbation, code ou allowlist.
- La page detail affiche prix, date, places restantes, statut, regles essentielles, politique no-show/remboursement et avertissements.
- placesRemaining = max(0, maxPlayers - activeRegistrationsCount), calcule cote serveur.
- activeRegistrationsCount exclut CANCELLED/REFUNDED et inclut PAYMENT_PENDING valides et PAID selon politique de reservation.
- Le wording public evite pari, mise, jackpot, gain garanti et toute promesse assimilable a un jeu d argent.

## Donnees principales

- `GameSession.visibility`
- `GameSession.status`
- `SessionCapacitySnapshot`
- `ShareLink ou SessionInvite`
- `PublicSessionCard`
- `SessionAccessCode optionnel`

## API et contrats

- `GET /v1/public/sessions`
- `GET /v1/public/sessions/:slug`
- `POST /v1/public/sessions/:slug/access-code`
- `GET /v1/share/:token`
- `POST /v1/sessions/:id/intent`

Erreurs et cas limites a normaliser :

- `404_SESSION_NOT_VISIBLE`
- `410_SESSION_CLOSED`
- `423_ACCESS_CODE_REQUIRED`
- `409_REGISTRATION_CLOSED`

## Evenements et jobs

- `session.published`
- `session.unlisted-link-created`
- `catalogue.capacity-updated`
- `share.link-opened`
- `cta.register-clicked`

## Securite, conformite et audit

- Ne jamais exposer les details d une session PRIVATE sans autorisation.
- Calculer statuts/capacite cote serveur.
- Limiter les informations d erreur pour ne pas confirmer l existence d une session privee.
- Valider le wording public avant publication commerciale.

## Criteres d acceptation

- PUBLIC listable, UNLISTED absent du listing mais accessible par lien, PRIVATE inaccessible sans autorisation.
- Calcul placesRemaining avec registrations PAYING/PAID/CANCELLED/REFUNDED.
- CTA selon etat auth.
- Metadata et social sharing.
- Absence de vocabulaire interdit dans les textes publics.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `catalogue_page_view`
- `session_detail_view`
- `cta_register_click`
- `share_link_open_rate`
- `public_sessions_error_rate`
- `private_access_denied_count`

## Dependances fonctionnelles

- Feature 02 Authentification pour CTA conditionnel
- Feature 04 Configuration session pour publication/visibilite
- Feature 05 Inscription pour intention
- Feature 14 Notifications/partage communautaire

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- Next.js metadata/pages publiques
- Prisma/PostgreSQL lecture sessions et capacite
- Hono API publique
- PRD_PHASE_1.md risque legal wording
- BRAINSTORMING.md visibilite et liens WhatsApp

References officielles techniques :

- Next.js App Router, Authentication, Data Security, Metadata: https://nextjs.org/docs/llms.txt
- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt
- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt
- PostgreSQL transaction isolation and retry expectations: https://www.postgresql.org/docs/current/transaction-iso.html

## Questions ouvertes

- Vocabulaire public final: session, tournoi, partie ou autre.
- Afficher ou non les montants de gains estimes avant paiement.
- Mecanisme PRIVATE final: code, invitation admin, allowlist ou combinaison.
