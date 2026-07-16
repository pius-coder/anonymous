# packages/db

## Objectif

Centraliser le modele de persistance, Prisma, migrations et acces donnees.

## Perimetre

- `schema.prisma`.
- Migrations.
- Client de persistance.
- Repositories ou adaptateurs de donnees.
- Seeds techniques documentes.

## Hors perimetre

- Contrats reseau (Protobuf / Connect).
- Regles metier essentielles.
- UI.
- Orchestration temps reel.

## Dependances autorisees

- Prisma.
- Types internes de persistance.
- Interfaces de repositories definies par les cas d'utilisation si necessaire.

## Dependances interdites

- Exposer directement les entites Prisma aux clients reseau.
- Modifier `schema.prisma` sans migration correspondante.
- Melanger seed demo et donnees requises sans documentation.
- Importer React, Colyseus schema public, ou packages de contrats.

## API publique du module

- Client Prisma (`prisma` / `getPrisma`) pour usages infrastructure internes.
- Repositories namespaces exportes depuis `src/repositories/`.
- Les consumers applicatifs mappent les records vers DTOs / messages reseau **hors** de ce package.

### Repositories notables (SEQ-02)

| Namespace | Modeles |
|-----------|---------|
| `userRepository` / `authRepository` | User, RoleAssignment, AuthSession, PasswordResetToken |
| `partyRepository` / `participationRepository` | Party, PartyParticipation |
| `roundRepository` | Round, RoundParticipant, PlayerAction, RoundDeadline |
| `scoreRepository` | ProvisionalScore, PublishedScore, **ScoreReview** |
| `announcementRepository` | **Announcement** uniquement |
| `notificationRepository` | NotificationJob, **DeliveryLog** (pas d'Announcement) |
| `paymentRepository` | Wallet, PaymentTransaction, LedgerEntry |
| `realtimeRepository` | RealtimeConnection |
| `auditRepository` | AuditLog |

Toute evolution du schema doit etre reliee a une decision et a un test de migration.

## Seed deterministe

Fichier : `prisma/seed.ts` (`runSeed`).

- Roles : ADMIN, SUPPORT, FINANCE, et deux joueurs PLAYER.
- Partie publiee catalogue : code `SEED-PARTY-01`, statut `SCHEDULED`, visibility `public`.
- Participations, wallets (credit idempotent), session auth, realtime sample, round/scores, ScoreReview, Announcement, NotificationJob + DeliveryLog, audit.
- Mot de passe demo de tous les comptes seed : `SeedPass123!` (hash scrypt fixe).
- **Re-run** : upsert par cles uniques ; second passage re-affirme le graphe sans doublons de wallet/participation.

Commande : `pnpm --filter @session-jeu/db db:seed` (apres `migrate deploy`).

## Compliance / incidents

Pas de modeles ComplianceGate / Incident / RiskSignal dans le schema v0.1 tant que les use cases
ne figent pas champs et retention (sprint 18). L'audit minimal reste `AuditLog`.

## Tests

| Niveau | Fichiers | Frontiere |
|--------|----------|-----------|
| L1 | `*.test.ts` mockes / export / singleton | mocks ou aucun I/O DB |
| L3 | `l3-*.integration.test.ts` | PostgreSQL reel via `TEST_DATABASE_URL` ou `DATABASE_URL` |

Les suites L3 utilisent `describe.skipIf(!isIntegrationEnv())` pour rester vertes en unit sans PG.

Preuves L3 cibles : contraintes uniques, transactions wallet, idempotence debit, claim concurrent
`claimDueRoundDeadline`, ScoreReview, DeliveryLog, seed double.

## Procedure d'extension

1. Lire `docs/05-workflows/database-change.md`.
2. Definir impact domaine et contrat.
3. Modifier schema et migration ensemble (ne jamais editer une migration deja appliquee).
4. Ajouter tests DB L3.
5. Verifier que les contrats reseau ne copient pas les entites DB.
6. Mettre a jour le seed si le graphe minimal de recette change.
