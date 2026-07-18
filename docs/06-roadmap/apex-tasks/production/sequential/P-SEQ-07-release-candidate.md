# P-SEQ-07 - Composition exploitation et release candidate

## Mission autonome

Integrer WAVE-C, produire un artefact de release immuable et le deployer en staging comme un candidat
identique a la production, sans deployer le checkout de developpement.

## Prerequis et lectures

- `P-SEQ-06` merge; les huit lots WAVE-C sont verts, sauf amendement de scope signe avant leur
  lancement.
- Lire tous les rapports ops, ADR hebergement, runbooks, threat model et politique release.
- Context7 : outils de build/deploiement choisis et recommandations self-host Next.js/BullMQ.

## Ownership exclusif

Composition CI/CD, manifest release, versioning, promotion, migrations orchestrees, smoke staging et
matrice de readiness. Corrections de lot retournent au proprietaire.

## Interdit

Rebuild entre staging et production, tag flottant, secret dans artefact/log, migration destructive
non separee, acceptation d'une alerte non testee.

## Livrables production

- artefacts/images signes et identifies par digest/commit/SBOM;
- deploy staging multi-service, readiness, drain, migrations expand/contract et rollback;
- configuration/secrets issus du gestionnaire choisi, aucune valeur locale;
- dashboards, alertes, synthetic checks et runbooks relies a la release;
- rapport P0/P1 sans ambiguite et release notes utilisateur/ops.

## Criteres d'acceptation

- le meme digest passe build, staging et future promotion prod;
- rollback applicatif est chronometre et ne corrompt pas la DB;
- API/web/live/worker/gateway supportent SIGTERM et traffic drain;
- aucune vulnerabilite bloquante ou secret detecte ne reste ouvert;
- les six jeux et Fapshi sandbox passent le smoke staging.

## Tests et sortie

Pipeline complet, deploy/rollback/redeploy staging, migrations et synthetic journey. Commit/tag candidat
sans promotion production. Conserver digests, SBOM, preuves et ecarts.
