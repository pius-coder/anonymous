## Adversarial Review Findings

| ID | Severity | Category | Location | Issue |
|----|----------|----------|----------|-------|
| F1 | HIGH | Security/Logic | payment.use-case.ts:199-228 | Race condition: TOCTOU between balance check and atomic debit |
| F2 | MEDIUM | Security | payment.use-case.ts:154-187 | Webhook signature field accepted but never verified |
| F3 | MEDIUM | Security | payment.routes.ts:88-95 | GET /payments/:id/status doesn't verify payment ownership |
| F4 | LOW | Quality | payment.use-case.ts:302-304 | `listAdminWallets` returns transactions, not wallets |
