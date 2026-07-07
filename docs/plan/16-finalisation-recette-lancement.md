# Sprint final - Recette, stabilisation et lancement

## Objectif sprint

Verifier que le produit complet fonctionne de bout en bout, que les risques critiques sont maitrises et que la V1 peut etre lancee en environnement controle.

## Parcours de recette E2E obligatoires

### Parcours 1 - Decouverte et inscription

Etapes :

1. Visiteur ouvre landing.
2. Visiteur consulte catalogue.
3. Visiteur ouvre detail session PUBLIC.
4. Visiteur cree compte.
5. Joueur s inscrit.
6. Joueur initie paiement.

Validation :

- Aucun wording interdit.
- Session visible correcte.
- Compte cree.
- Registration pending.

### Parcours 2 - Paiement et lobby

Etapes :

1. Paiement Fapshi sandbox.
2. Webhook SUCCESS.
3. Registration passe PAID.
4. Joueur entre lobby.
5. Joueur check-in.
6. Join token genere.

Validation :

- Webhook secret verifie.
- Paiement idempotent.
- Lobby refuse non paid.
- Join token single-use.

### Parcours 3 - Live et resolution

Etapes :

1. Admin start session.
2. Joueurs entrent room.
3. Round demarre.
4. Actions soumises.
5. Deadline atteinte.
6. Game-engine resout round.
7. Eliminations/qualifications persistées.

Validation :

- Timer officiel DB.
- Late inputs refuses.
- Reconnexion fonctionne.
- Resolution rejouable.

### Parcours 4 - Resultats et credits

Etapes :

1. Session terminee.
2. Admin/systeme finalise.
3. Gagnants calcules.
4. Worker distribue credits.
5. Wallet et ledger mis a jour.
6. Resultats publies.

Validation :

- Distribution idempotente.
- Aucun double credit.
- Ledger balance coherent.
- Cash-out indisponible.

### Parcours 5 - Support et audit

Etapes :

1. Support cherche utilisateur.
2. Finance consulte paiement.
3. Admin consulte audit.
4. Litige cree.
5. Replay round execute.

Validation :

- RBAC respecte.
- Secrets provider masques.
- Audit complet.
- Replay identique ou mismatch signale.

## Tests finaux

- Unit tests tous packages.
- Integration tests API/DB.
- E2E web critiques.
- Tests concurrence : inscription derniere place, double paiement, double debit wallet, double distribution.
- Tests securite : auth, RBAC, BOLA, rate limit, webhook secret.
- Tests recovery : worker retry, game-server crash, webhook replay.
- Tests observabilite : logs requestId, audit logs, metriques critiques.

## Checklist pre-lancement

- Environnement production configure.
- Secrets production separes.
- Fapshi live valide.
- Backups PostgreSQL actives.
- Monitoring et alertes actives.
- Politique confidentialite et CGU pretes.
- Avis legal sur competition payante/gains/wallet obtenu ou lancement limite sans cash-out.
- Plan support incident pret.
- Rollback plan documente.

## Definition of Done projet

- Tous les parcours E2E critiques passent.
- Aucune faille critique connue.
- Aucune incoherence ledger/wallet.
- Aucun endpoint admin sans RBAC.
- Aucun retrait argent reel en V1.
- Product Owner accepte la demo finale.
- Go/no-go documente.

