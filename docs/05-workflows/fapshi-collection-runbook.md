# Runbook — Collecte Fapshi (P-A-FAPSHI)

## Périmètre

Service de **collecte** uniquement (checkout joueur, webhook, reconciliation status).
Les credentials **payout** appartiennent à P-A-FINANCE et sont séparés.

## Configuration fail-closed

| Variable | Rôle |
|----------|------|
| `FAPSHI_BASE_URL` | `https://sandbox.fapshi.com` ou `https://live.fapshi.com` uniquement |
| `FAPSHI_API_USER` / `FAPSHI_API_KEY` | Headers serveur `apiuser` / `apikey` |
| `FAPSHI_WEBHOOK_SECRET` | Header webhook `x-wh-secret` (obligatoire) |
| `FAPSHI_COLLECTION_ENABLED` | Kill switch (`0` / `false` = refuse initiate) |
| `APP_PUBLIC_URL` | Base pour `redirectUrl` construit côté serveur |

Interdit : Bearer inventé, `/initiate`, `fapshi-local-*`, secrets dans logs/UI, succès déduit du seul webhook.

## Endpoints officiels

- `POST /initiate-pay` → `link` + `transId`
- `GET /payment-status/{transId}` (max 6 req/min/transId)
- Webhook POST = corps payment-status + `x-wh-secret` — **Fapshi ne retente pas**

## Kill switch

1. Définir `FAPSHI_COLLECTION_ENABLED=0` sur `api` (et redémarrer).
2. Les initiates retournent `COLLECTION_DISABLED` (503).
3. Webhooks déjà reçus peuvent encore être réconciliés via status query.
4. Réactiver : `FAPSHI_COLLECTION_ENABLED=1` + vérif health initiate sandbox.

## Rotation credentials

### API user / key

1. Générer de nouvelles clés sandbox ou live sur le dashboard Fapshi (service **collecte**).
2. Mettre à jour secrets d’environnement (`FAPSHI_API_USER`, `FAPSHI_API_KEY`) sans commit.
3. Redéployer `api` + `worker`.
4. Vérifier un `initiate-pay` sandbox puis un `payment-status`.
5. Révoquer les anciennes clés côté dashboard.

### Webhook secret

1. Définir un nouveau secret sur le dashboard Fapshi (service collecte).
2. Mettre à jour `FAPSHI_WEBHOOK_SECRET` en même temps (fenêtre courte).
3. Redéployer `api`.
4. Envoyer un paiement test ; confirmer inbox + settle après status verify.
5. Documenter l’heure de rotation dans l’outil d’ops (pas dans le dépôt).

## Incident — webhook perdu

Fapshi n’envoie **qu’une** notification par événement.

1. Identifier le paiement (`providerTransId` / `providerExternalId`).
2. Lancer reconciliation job ou commande admin `reconcile` (query `payment-status`).
3. Ne **jamais** marquer SUCCESS sans réponse provider concordante (montant, externalId, transId).
4. Si timeout après `initiate-pay` sans réponse : statut interne RECONCILING — **ne pas** re-POST initiate.

## Incident — clés exposées

1. Kill switch ON.
2. Rotation immédiate apiuser/apikey + webhook secret.
3. Auditer logs (doivent être redacted) ; scanner artifacts pour `apikey`/`apiuser`.
4. Kill switch OFF après validation sandbox.

## Passage live

1. Compte Fapshi activé + service live + IP whitelist si requis.
2. `FAPSHI_ENV=live`, `FAPSHI_BASE_URL=https://live.fapshi.com`.
3. Credentials live distincts du sandbox.
4. Webhook URL publique HTTPS vers `POST /v1/payments/webhook/fapshi`.
5. `APP_PUBLIC_URL` production pour redirect return.
6. Smoke : initiate → checkout → webhook inbox → payment-status settle.
7. Runbook ops + on-call informés.

## Tests de non-régression

- L1 : mapping/erreurs client (`fapshi-client`, shared fapshi)
- L3 : inbox idempotence (`ProviderWebhookInbox`)
- L4 : `FAPSHI_RUN_SANDBOX=1` + credentials sandbox
- L5 : checkout navigateur sans injection DB de statut
