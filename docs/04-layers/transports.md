# Transports Layer

Responsabilite: HTTP/Connect, WebSocket, adapters provider.
Possede: mapping protocolaire.
Ne contient jamais: decisions metier.
Entrees/sorties: bytes/messages -> use cases.
Contrats publics: endpoints et topics.
Dependances autorisees: contracts, application.
Dependances interdites: acces DB direct sauf adapter explicite legacy.
Donnees: enveloppes transport.
Securite: auth, rate limit, validation audience.
Ajout: declarer route/topic et erreurs.
Modification: compatibilite clients.
Suppression: deprecier puis retirer.
Tests: integration transport.
Observabilite: latence, status, disconnects.
Validation: aucun endpoint sans use case.

