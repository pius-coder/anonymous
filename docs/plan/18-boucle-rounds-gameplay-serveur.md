# Feature 18 - Boucle de rounds complete et gameplay server-side

## Objectif sprint

Corriger les gaps bloquants : resolution de round non executee, round suivant non lance, et mini-jeux qui acceptent un score fourni par le client.

## Decisions non negociables

- Le client ne soumet jamais un score ; il soumet des inputs.
- Les donnees sensibles ne sont jamais dans le state Colyseus synchronise avant resolution.
- Resolution transactionnelle et idempotente.
- Meme input + meme config + meme seed = meme output.

## Gate documentaire obligatoire

1. Context7 Colyseus : broadcast externe, presence/pubsub Redis, clock.
2. Context7 BullMQ : completion events ou pubsub Redis.
3. Context7 Prisma : transaction de finalisation round.
4. Relire `docs/catalogue-mini-jeux.md` pour les regles serveur des jeux MVP.

## User stories

### Story 18.1 - Service finalizeRound

Creer `finalizeRound(roundId)`, charger round/actions/config, appeler `resolveRound`, persister resultats/evidence/hash en transaction Serializable et publier un event consomme par la room.

### Story 18.2 - Orchestration multi-rounds

La room ecoute `round.resolved`, diffuse les scores/qualifies/elimines, passe en results courte, puis lance le round suivant ou finalise la session.

### Story 18.3 - Runtime mini-jeu server-side

Creer des runtimes server-side pour les jeux MVP. Remplacer `submit-score` par des actions reelles validees serveur.

## Definition of Done

Une session complete multi-rounds se joue en test integration, scores calcules serveur, resultats persistes, distribution declenchee.
