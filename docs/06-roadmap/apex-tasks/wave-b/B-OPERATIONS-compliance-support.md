# B-OPERATIONS - Compliance, incidents, support et audit

## Mission autonome

Apres SEQ-03 et A-WORKERS/A-SCORING, implementer les use-cases operations valides : gates compliance,
waiver motive, incidents support et timeline d'audit. Support reste en lecture seule sur lancement et score.

## Ownership

Use-cases/transports compliance, incidents, audit timeline; UI admin compliance/audit/incidents et support;
tests correspondants. Consommer les modeles/repositories de SEQ-02.

## Interdit

Contrats, schema/migrations, tooling racine, scoring interne, worker, game-server, finance et routeur central.

## Demarrage obligatoire

Lire AGENTS, sprint 18, arbitrage legacy, permissions UML, couches audit/support et contrats figes.
Context7 : ConnectRPC, TanStack Query et Prisma selon les appels reels.

## AC

- Gate OK/BLOCKED/WAIVED avec raison, acteur, horodatage et audit.
- Partie bloquee ne peut etre publiee/activee sans waiver autorise.
- Incident a cycle de vie explicite, donnees minimales et retention documentee.
- Support observe mais ne lance, ne corrige ni ne publie.
- Timeline filtre correctement les donnees sensibles.

## Tests et sortie

L3 contraintes/audit, L4 RBAC/refus, L5 admin/support multi-role. Validations completes, commit atomique,
rapport AC -> test; composition finale geree par l'integrateur.
