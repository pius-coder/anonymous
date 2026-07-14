# Persistence Layer

Responsabilite: stockage durable et transactions.
Possede: Prisma schema, migrations, repositories.
Ne contient jamais: contrats reseau publics.
Entrees/sorties: records persistants.
Contrats publics: ports repositories.
Dependances autorisees: Prisma/PostgreSQL.
Dependances interdites: React, Colyseus schema public.
Donnees: entites DB.
Securite: contraintes, indexes, audit.
Ajout: migration + test DB vide.
Modification: migration coherente.
Suppression: migration de retrait et backout.
Tests: integration DB.
Observabilite: queries lentes, conflits transaction.
Validation: migration depuis DB vide.

