# Notifications Layer

Responsabilite: annonces, push, delivery status.
Possede: templates, jobs, logs livraison.
Ne contient jamais: demarrage partie.
Entrees/sorties: announcement command -> notification events.
Contrats publics: notification commands/events.
Dependances autorisees: providers, worker.
Dependances interdites: mini-game runtime.
Donnees: Announcement, NotificationJob, DeliveryLog.
Securite: consentement, minimisation.
Ajout: template + audience + opt-out.
Modification: migration provider.
Suppression: archive template.
Tests: idempotence, retry.
Observabilite: delivered/opened/confirmed/failed.
Validation: annonce pre-match non affichee en mini-jeu.

