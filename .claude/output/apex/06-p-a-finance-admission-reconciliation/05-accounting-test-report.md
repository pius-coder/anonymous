# Rapport comptable de test — P-A-FINANCE

**Date:** 2026-07-17  
**Branche:** apex/p-a-finance  
**Worktree:** /home/afreeserv/worktrees/anonymous/p-a-finance  

## Scénarios unitaires couverts

| Scénario | Résultat |
|----------|----------|
| Dual credentials COLLECTION ≠ PAYOUT | PASS (fapshi-client) |
| Strict prod exige FAPSHI_PAYOUT_* dédiés | PASS |
| Webhook ACCESS_FEE → inbox + applyWebhookSettlement (PAID) | PASS |
| Webhook TOP_UP → settle wallet once | PASS |
| Terminal SUCCESSFUL no re-settle | PASS |
| Signature webhook invalide | PASS |
| Maker compensation sans payout | PASS |
| Checker = maker refusé | PASS |
| Payout gains si scoresPublished=false | PASS (403) |
| Step-up manquant sur expire | PASS (403) |
| ADMIN/SUPPORT 403 list payments & payout | PASS |
| FINANCE 200 list payments | PASS |
| Worker expire stale PENDING | PASS |
| Worker DLQ + mismatch on status poll fail | PASS |
| Config payout env vars strict | PASS |

## Invariants vérifiés (code)

1. Solde jamais modifié hors ledger (`createCompensationLedgerEntry`, wallet debit atomic).
2. Pas de double crédit webhook (inbox DUPLICATE / APPLIED + settle idempotent).
3. Pas de refund par suppression — compensation COMPENSATION ledger + payout optionnel.
4. Pas de SUCCESS inventé par worker (provider SUCCESSFUL → MISMATCH awaiting settlement).
5. Collecte et payout : env keys séparées, serviceKind PAYOUT sur createPayoutTransfer.

## Non exécuté (sandbox / L5)

- Appels HTTP réels sandbox Fapshi (credentials absents en CI).
- E2E navigateur joueur → finance.
- L3 DB integration (infra worktree non démarrée dans cette session).

## Commandes

```
pnpm --filter @session-jeu/shared test
pnpm --filter @session-jeu/config test
pnpm --filter @session-jeu/api typecheck
pnpm --filter @session-jeu/api exec vitest run src/use-cases/payment src/routes/__tests__/admin-payment
pnpm --filter @session-jeu/worker exec vitest run src/__tests__/paymentReconciliation.test.ts
```
