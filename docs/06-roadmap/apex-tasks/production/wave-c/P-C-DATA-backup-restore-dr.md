# P-C-DATA - Backup, restauration et reprise

## Mission autonome

Garantir que PostgreSQL, Redis durable necessaire, artefacts et secrets de configuration peuvent etre
restaures dans les RPO/RTO signes, avec migrations et reconciliations sures.

## Prerequis et lectures

- P-C-PLATFORM merge; P-SEQ-03/06 merges; RPO/RTO approuves.
- Lire persistence, retention, payment, worker, scoring et runbooks.
- Documentation officielle PostgreSQL/Redis et services manages choisis; Context7 Prisma.

## Ownership

Policies/scripts backup/PITR/restore, validation migrations, chiffrement, retention backup, restore
environment et runbooks DR. Pas de use-case metier.

## Interdit

Backup non teste, dump non chiffre, credential statique, restauration sur prod pendant le test,
suppression manuelle de migration ou affirmation RPO/RTO sans mesure.

## Livrables production

- backups automatiques, PITR, retention, chiffrement, controle acces et monitoring;
- copie immuable avec retention lock dans une frontiere de confiance separee/offsite, non supprimable
  par le seul compte production;
- classification de Redis : reconstructible vs etat durable, AOF/replication/noeviction;
- restore vers environnement vierge, checksums, contraintes et smoke applicatif;
- procedure migration expand/contract, backup pre-change et rollback compatible;
- reconciliation post-restore Fapshi/jobs/scores pour eviter doubles effets;
- runbooks perte partielle/totale/region et responsabilites.

## Criteres d'acceptation

- restore drill recupere un snapshot connu dans RPO/RTO et passe les checks metier;
- paiement Fapshi deja regle, gain publie et job envoye ne sont pas doubles apres reprise;
- un backup corrompu/manquant declenche une alerte testee;
- acces backup et restauration sont audites;
- restauration depuis la copie immuable est testee apres scenario de compromission du compte primaire;
- duree/cout/capacite de retention sont documentes.

## Tests et sortie

PITR/restore sur DB vierge, perte Redis, replay queues, migrations upgrade/rollback et synthetic journey.
Rapport RPO/RTO mesure, gates lot et commit atomique.
