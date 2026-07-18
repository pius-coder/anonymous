# Realtime Layer

Responsabilite: diffusion live, snapshots, events, reconnexion.
Possede: state views par audience, connection lifecycle.
Ne contient jamais: paiement, wallet, publication resultats.
Entrees/sorties: domain events -> realtime events.
Contrats publics: events Protobuf.
Dependances autorisees: contracts, domain, application.
Dependances interdites: UI directe.
Donnees: RealtimeConnection, StateView.
Securite: filtrage par participation/role.
Ajout: definir audience et replay/reconnect.
Modification: verifier compatibilite events.
Suppression: reserver event fields.
Tests: reconnexion, filtrage, no leak.
Observabilite: reconnect success, lag, desync.
Validation: aucun secret mini-jeu diffuse.

