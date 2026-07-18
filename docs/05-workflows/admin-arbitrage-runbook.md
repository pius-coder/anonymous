# Runbook — Arbitrage & command center admin (P-A-ADMIN)

## Principes

- **Aucun job/timer ne démarre une partie active.** `schedule` fixe seulement l’horaire; `publish` passe DRAFT → SCHEDULED; le worker `roundDeadline` ferme les manches dues vers vérification uniquement.
- **Lease de contrôle** exclusif par partie (`POST /v1/admin/parties/:id/control-lease`).
- **Version optimiste** : `expectedUpdatedAt` / `expectedConfigVersion` sur mutations sensibles → `STALE_STATE` (409).

## Acquérir / libérer le lease

```bash
# Acquérir (TTL défaut 120s)
curl -X POST "$API/v1/admin/parties/$PARTY_ID/control-lease" \
  -H "Cookie: …" -H "Content-Type: application/json" \
  -d '{"ttlSeconds":120}'

# Statut
curl "$API/v1/admin/parties/$PARTY_ID/control-lease" -H "Cookie: …"

# Libérer
curl -X DELETE "$API/v1/admin/parties/$PARTY_ID/control-lease" -H "Cookie: …"
```

### Conflit multi-admin

| Code | Signification | Action |
|------|---------------|--------|
| `LEASE_HELD_BY_OTHER` | Un autre admin détient le lease | Attendre expiration TTL ou coordination humaine |
| `ADMIN_LEASE_REQUIRED` | Commande sensible sans lease | Acquérir le lease |
| `STALE_STATE` | Snapshot / configVersion obsolète | Recharger la partie puis rejouer |
| `FORBIDDEN` / 403 | Rôle insuffisant | Ne pas contourner côté client |

Backend lease : Redis si `REDIS_URL`, sinon mémoire process (dégradé multi-instance).

## Commandes sensibles (lease requis)

- Publish, cancel, complete
- Preparation `confirm-start`
- Round start / pause / resume / close

## Supervision

- Monitor UI lecture seule (`/admin/parties/:id/monitor`)
- Timeline audit (`GET /v1/admin/parties/:id/audit`)
- AdminService Connect (export `adminService`) : `GetGameState`, `ListParties`, `GetReadonlySnapshot`, `GetSystemReadiness` — montage central SEQ, pas ce lot

## Récupération lease bloqué

1. Vérifier `expiresAt` (TTL).
2. Si process crash sans Redis : redémarrer l’API (mémoire perdue = lease libre).
3. Si Redis : `DEL admin:lease:{partyId}` **uniquement** après validation ops.

## Hors périmètre

- Finance / wallets / publication scores (lots dédiés)
- Contrôle direct du client joueur
- Modification des contrats Protobuf / migrations DB
