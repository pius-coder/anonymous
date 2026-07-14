# Domain Layer

Responsabilite: etats, transitions, invariants et vocabulaire partie/participation/manche.
Possede: lifecycle, permissions metier, transitions interdites.
Ne contient jamais: UI, Prisma, HTTP, WebSocket.
Entrees/sorties: commandes domaine -> evenements domaine.
Contrats publics: types domaine purs.
Dependances autorisees: aucune infrastructure.
Dependances interdites: Next.js, Hono, Prisma, Colyseus.
Donnees: Party, Participation, Round, Score.
Securite: invariants d'autorisation exprimes en politiques.
Ajout: decrire use case et transition.
Modification: prouver compatibilite avec lifecycle.
Suppression: retirer transition et documenter impact.
Tests: unitaires exhaustifs transitions.
Observabilite: noms d'evenements domaine.
Validation: aucune transition interdite possible.

