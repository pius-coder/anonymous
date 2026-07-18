# packages/db

## Objectif

Centraliser le modele de persistance, Prisma, migrations et acces donnees.

## Perimetre

- `schema.prisma`.
- Migrations.
- Client de persistance.
- Repositories ou adaptateurs de donnees.
- Seeds techniques documentes.
- Notes de migration expand/contract (`MIGRATION-NOTES.md`).

## Hors perimetre

- Contrats reseau (Protobuf / Connect).
- Regles metier essentielles.
- UI.
- Orchestration temps reel.
- Dechiffrement applicatif des secrets competitifs (stockage ciphertext uniquement).

## Dependances autorisees

- Prisma.
- Types internes de persistance.
- Interfaces de repositories definies par les cas d'utilisation si necessaire.

## Dependances interdites

- Exposer directement les entites Prisma aux clients reseau.
- Modifier `schema.prisma` sans migration correspondante.
- Melanger seed demo et donnees requises sans documentation.
- Importer React, Colyseus schema public, ou packages de contrats.
- Stocker secrets Fapshi, mots de passe en clair, ou tokens live non hashes.

## API publique du module

- Client Prisma (`prisma` / `getPrisma`) pour usages infrastructure internes.
- Repositories namespaces exportes depuis `src/repositories/`.
- Les consumers applicatifs mappent les records vers DTOs / messages reseau **hors** de ce package.

### Repositories (P-SEQ-03)

| Namespace | Modeles / responsabilite |
|-----------|--------------------------|
| `userRepository` / `authRepository` | User, RoleAssignment, AuthSession, PasswordResetToken |
| `partyRepository` / `participationRepository` | Party (fee/currency/version), capacity-safe admission |
| `roundRepository` | Round, RoundParticipant, PlayerAction, RoundDeadline |
| `scoreRepository` | ProvisionalScore, PublishedScore, ScoreReview, publish+gains atomiques |
| `announcementRepository` | Announcement uniquement |
| `notificationRepository` | NotificationJob (claim), DeliveryLog |
| `paymentRepository` | Wallet, PaymentTransaction (enums), Ledger, webhook inbox, collection/payout, compensation |
| `realtimeRepository` | RealtimeConnection |
| `auditRepository` | AuditLog (result/correlation/reason) |
| `encryptionRepository` | EncryptionKey, EncryptedSecret (metadata + ciphertext) |
| `checkpointRepository` | RoundCheckpoint (restart sans cleartext secrets) |
| `complianceRepository` | Incident, ComplianceGate, Consent, Retention, SupportAccess |
| `manifestRepository` | MinigameManifest |
| `assignmentRepository` | TeamAssignment, PairAssignment |

Toute evolution du schema doit etre reliee a une decision et a un test de migration.

## Finance

- Statuts **enumeres** (`PaymentStatus`, `PaymentInternalStatus`, `FapshiWireStatus`) — aucun statut financier libre.
- IDs Fapshi : `providerTransId` / `providerExternalId` avec uniques partiels.
- Inbox webhook idempotente (`ProviderWebhookInbox`).
- Collection et payout : `ProviderServiceKind` + `ProviderCredentialRef` (noms d'env uniquement, jamais le secret).
- Ledger compensatoire via `LedgerType.COMPENSATION` + `compensationOfId`.

## Secrets competitifs

- Roles, votes, sequences, checkpoints, preuves : `EncryptedSecret` / `RoundCheckpoint` / `ScoreEvidence`.
- Classification `DataClassification`.
- Rotation / purge cles : `encryptionRepository.rotateEncryptionKey` / `purgeEncryptionKey`.
- Acces support : `SupportAccessGrant` (ticket, raison, duree, dual-auth hors package).

## Seed deterministe

Fichier : `src/seed.ts` (`runSeed`) + CLI `prisma/seed.ts`.

- Roles : ADMIN, SUPPORT, FINANCE, et deux joueurs PLAYER.
- Partie publiee : code `SEED-PARTY-01`, fee/currency/version, statut `SCHEDULED`.
- Credential refs collection/payout (env key names only).
- Encryption key metadata + checkpoint ciphertext opaque.
- Retention rules + consent versionne.
- Mot de passe demo local uniquement : `SeedPass123!` (documente ici, **jamais imprime par le CLI seed**).
- **Re-run** : upsert par cles uniques.
- **Garde-fou** : `assertSeedAllowed()` refuse `APP_ENV=production|staging` (en plus de `scripts/lib/seed-lock.mjs`).

Commande : `pnpm --filter @session-jeu/db db:seed` (apres `migrate deploy`).

## Migrations

Voir `MIGRATION-NOTES.md` :

- DB vide : chaine complete `migrate deploy`.
- Upgrade baseline : migration `20260717120000_production_data` seule.
- Expand/contract documente ; pas d'edition de migration deja appliquee.

## Tests

| Niveau | Fichiers | Frontiere |
|--------|----------|-----------|
| L1 | `*.test.ts` mockes / export / seed-guard | mocks ou aucun I/O DB |
| L3 | `l3-*.integration.test.ts` | PostgreSQL reel via `TEST_DATABASE_URL` ou `DATABASE_URL` |

Preuves L3 cibles : last-seat capacity, webhook idempotence, job claim, score+gains+audit atomiques,
checkpoint sans cleartext, contraintes migration, seed double.

## Procedure d'extension

1. Lire `docs/05-workflows/database-change.md` et `MIGRATION-NOTES.md`.
2. Definir impact domaine et contrat.
3. Modifier schema et migration ensemble (ne jamais editer une migration deja appliquee).
4. Ajouter tests DB L3.
5. Verifier que les contrats reseau ne copient pas les entites DB.
6. Mettre a jour le seed si le graphe minimal de recette change.
