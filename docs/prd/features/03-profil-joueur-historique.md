# Feature 03 - Profil joueur et historique

Statut : Implementation PRD complet
Date : 2026-07-07
Source : consolidation de BRAINSTORMING.md, catalogue-mini-jeux.md, PRD_PHASE_1.md, PRD_PHASE_2.md, cahier_des_charges_technique_plateforme_sessions_jeu.md et deep-research-report.md.

## Feature Overview

Donner au joueur une identite de jeu, un historique, des statistiques derivees et une vue lisible de ses sessions.

## Mapping implementation

| Dimension | Detail |
|---|---|
| Purpose | Permettre au joueur de consulter et modifier son profil, voir ses sessions futures/en cours/passees, et comprendre ses statistiques sans exposer ses donnees sensibles. |
| Target users | joueurs, admins support, autres joueurs si profil public active |
| Business value | Moyenne: retention, confiance, progression et support; non critique au premier paiement mais important pour la boucle long terme. |
| Technical complexity | Faible a moyenne: profil et historique classiques, mais stats doivent etre derivees des resultats officiels et du ledger. |
| Risk level | Moyen: fuite de donnees privees, statistiques incoherentes, exposition financiere ou confusion entre badges et preuves de paiement. |
| Required research depth | Voir references internes et officielles ci-dessous; revalidation necessaire au moment de l implementation finale si docs provider changent. |

## Scope de livraison

- Profil prive complet joueur.
- Profil public minimal optionnel.
- Historique sessions futures, en cours, terminees, annulees, no-show.
- Statistiques derivees des resultats officiels et ledger.

## Parcours et workflows

1. Joueur consulte /me: profil, sessions a venir, wallet resume si autorise.
2. Joueur modifie pseudo/avatar: validation unicite/format puis audit leger.
3. Stats recomputees apres finalisation session/resultats.
4. Profil public masque email, telephone, wallet, ledger et details financiers.

## Logiques metier et invariants

- Un profil joueur est rattache a un User unique.
- Les statistiques sont derivees des resultats officiels, jamais saisies manuellement.
- Le profil public ne doit pas exposer donnees financieres, telephone, email ou details sensibles.
- L historique distingue sessions futures, live, terminees, annulees et no-show.
- Badges/achievements ne valent pas preuve financiere.
- Credits gagnes visibles derives du ledger, pas d un champ decoratif.

## Donnees principales

- `PlayerProfile`
- `AvatarAsset`
- `PlayerStatsSnapshot`
- `SessionRegistration`
- `GameResult`
- `RoundResult`
- `Wallet/LedgerEntry pour credits affichables`

## API et contrats

- `GET /v1/players/me`
- `PATCH /v1/players/me`
- `GET /v1/players/me/history`
- `GET /v1/players/me/stats`
- `GET /v1/players/:publicId`

Erreurs et cas limites a normaliser :

- `400_INVALID_NICKNAME`
- `409_NICKNAME_TAKEN`
- `403_PROFILE_PRIVATE`
- `404_PLAYER_NOT_FOUND`

## Evenements et jobs

- `profile.updated`
- `stats.recomputed`
- `avatar.changed`
- `profile.visibility-changed`

## Securite, conformite et audit

- Distinguer profil prive et public.
- Verifier ownership sur toutes les routes /me.
- Ne jamais exposer wallet/ledger d un autre joueur.
- Limiter upload avatar si active.

## Criteres d acceptation

- Stats recalculables depuis resultats persistants.
- Sessions annulees/remboursees exclues ou affichees separement.
- Profil public masque donnees privees.
- Un joueur ne lit pas historique prive d un autre.
- PATCH pseudo/avatar valide formats et unicite.

## Strategie de tests

- Tests unitaires pour les invariants metier propres a cette feature.
- Tests d integration API/DB pour les transitions d etat, les erreurs normalisees et l idempotence.
- Tests de concurrence pour les chemins qui mutent capacite, paiement, wallet, resultat ou audit.
- Tests d autorisation pour les donnees personnelles, actions admin et objets identifies par ID.
- Tests de non-regression sur les workflows alternatifs: annulation, expiration, retry, replay, correction ou echec provider selon la feature.

## Observabilite et operations

- `profile_view_count`
- `profile_update_count`
- `stats_recompute_duration_ms`
- `stats_mismatch_detected`
- `avatar_upload_failure_rate`

## Dependances fonctionnelles

- Feature 02 Authentification
- Feature 07 Wallet/ledger
- Feature 10 Game engine
- Feature 12 Resultats

## References par logique metier

References internes projet :

- BRAINSTORMING.md: vision produit, objets metier, services, statuts, transactions critiques, game-engine separe, wallet interne et points ouverts.
- PRD_PHASE_1.md: synthese produit, risques Fapshi, legal, donnees personnelles, stack confirmee.
- PRD_PHASE_2.md: mapping des 15 branches, business value, complexite, dependances, niveau de risque et profondeur de recherche.
- cahier_des_charges_technique_plateforme_sessions_jeu.md: contrats V1, donnees, API, evenements, criteres d acceptation et modele de donnees minimal.
- deep-research-report.md: architecture cible, invariants serveur, patterns transactionnels, observabilite et specification detaillee par feature.

References specifiques :

- BRAINSTORMING.md PlayerProfile/historique/statistiques
- deep-research-report.md stats derivees
- Next.js Data Security
- Prisma queries/transactions

References officielles techniques :

- Next.js App Router, Authentication, Data Security, Metadata: https://nextjs.org/docs/llms.txt
- Hono routing, middleware, cookies, secure headers, validation, request id, body limit: https://hono.dev/llms.txt
- Prisma schema, transactions, interactive transactions, OCC: https://www.prisma.io/docs/llms.txt

## Questions ouvertes

- Activer profil public en V1 ou plus tard.
- Politique avatar: upload, preset, ou externe.
- Liste exacte des stats publiques.
