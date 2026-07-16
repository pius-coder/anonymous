# apps/whatsapp-gateway

## Objectif

Passerelle isolee pour l'envoi de notifications WhatsApp ou fournisseur equivalent.
Expose un **port contractuel** consomme par `apps/worker`, sans regle metier de partie.

## Perimetre

- Interface `NotificationProvider` (`send` → succes / echec retryable).
- `FakeNotificationProvider` injectable (tests, local).
- `ProductionWhatsAppProvider` **fail-closed** : non configure sans token ; SDK non cable meme avec token.
- Redaction logs : tokens, telephones, emails, cles secretes.

## Hors perimetre

- Regles de partie / demarrage / scores.
- Selection des destinataires (use-case amont).
- Schema / migrations.
- Webhook HTTP (hors scope A-WORKERS).

## Dependances autorisees

- Configuration securisee (env).
- Client officiel du fournisseur **apres** decision + Context7 — non present en v0.1.

## API publique

| Export | Role |
|---|---|
| `NotificationProvider` | Port |
| `FakeNotificationProvider` | Fake contractuel |
| `ProductionWhatsAppProvider` / `createProductionProviderFromEnv` | Production non configuree par defaut |
| `redactText` / `redactForLog` / `redactPhone` | Minimisation logs |

## Procedure d'extension

1. Valider le fournisseur et sa doc officielle (Context7 / SDK).
2. Implementer `NotificationProvider` reel derriere feature flag.
3. Garder le fake pour les tests worker L3.
4. Documenter limites, retries et donnees loguees.
