# apps/whatsapp-gateway

## Objectif

Passerelle isolee pour l'envoi de notifications WhatsApp ou fournisseur equivalent.

## Perimetre

- Adaptation vers API externe de notification.
- Mapping statut fournisseur vers statut interne.
- Gestion erreurs fournisseur.

## Hors perimetre

- Regles de partie.
- Selection des destinataires sans cas d'utilisation amont.
- Publication de scores.
- Stockage de secrets en clair.

## Dependances autorisees

- Contrats de notification internes.
- Configuration securisee.
- Client officiel du fournisseur apres decision.

## Dependances interdites

- Acces direct aux composants UI.
- Acces direct aux regles de mini-jeu.
- Logs contenant tokens, numeros complets ou payloads sensibles inutiles.

## API publique du module

Fonctions d'envoi et de lecture de statut, a definir apres choix fournisseur.

## Tests attendus

- Tests de mapping statut.
- Tests erreurs fournisseur.
- Tests de masquage des donnees sensibles.

## Procedure d'extension

1. Valider le fournisseur et sa documentation officielle.
2. Definir contrat d'envoi et statut.
3. Ajouter mocks de tests.
4. Documenter limites, retries et donnees loguees.
