# Agent 04 Report: docs admin product scope

Source documents read:
- `docs/plan/04-configuration-sessions-admin.md`
- `docs/prd/features/04-configuration-sessions-admin.md`
- `docs/plan/13-dashboard-admin-audit-support.md`
- `docs/prd/features/13-dashboard-admin-audit-support.md`
- `docs/plan/19-phase3-operateur-lancement.md`
- `docs/plan/archive/22-ui-admin.md`

---

## 1. Required admin pages and routes

### API routes (Hono backend)

**From Feature 04 (sessions admin):**
| Route | Method | Purpose |
|---|---|---|
| `/v1/admin/sessions` | POST | Create DRAFT session |
| `/v1/admin/sessions/:id` | PATCH | Update session |
| `/v1/admin/sessions/:id/publish` | POST | Publish session with validation |
| `/v1/admin/sessions/:id/open-registration` | POST | Open registration after publish |
| `/v1/admin/sessions/:id/cancel` | POST | Cancel session |
| `/v1/admin/sessions/:id/simulation` | GET | Financial simulation (collecte brute, frais, net, prize pool, commission) |

**From Feature 13 (dashboard/audit/support):**
| Route | Method | Purpose |
|---|---|---|
| `/v1/admin/dashboard` | GET | Dashboard with KPIs |
| `/v1/admin/audit-logs` | GET | Audit log search/filter |
| `/v1/admin/support/users/:id` | GET | User profile for support |
| `/v1/admin/incidents` | POST | Create incident |
| `/v1/admin/actions/:id/approve` | POST | Approve critical action |
| `/v1/admin/payments/:id/reconcile` | POST | Payment reconciliation |

**Additional from Feature 04:**
| Route | Method | Purpose |
|---|---|---|
| `/v1/admin/minigames` | GET | List enabled minigames (referenced in Program Builder) |

**From Phase 3 plan (Sprint 3C):**
| Route | Method | Purpose |
|---|---|---|
| `/v1/live/:sessionId/state` | GET | Live session state for monitor (polling 5s) |

### UI pages (Next.js frontend)

**From Sprint 3A (Phase 3 plan):**
| Page | Layout | Description |
|---|---|---|
| `/admin/layout.tsx` | Layout | Server-side session check, non-admin → 404 (not 403). Sidebar RetroUI with RBAC-filtered entries. |
| `/admin` or `/admin/dashboard` | In layout | Dashboard with KPI cards + sessions DataTable + critical alerts |
| `/admin/sessions` | In layout | Session list (CRUD) |
| `/admin/sessions/[id]` | In layout | Session detail/edit |
| `/admin/sessions/[id]/live` | In layout | Live control (monitor, pause/resume/finalize, incidents) |
| `/admin/sessions/create` | In layout | Program Builder wizard (Sheet, 4 steps) |

**From Sprint 3B (Phase 3 plan):**
- Program Builder wizard (4-step Sheet): General → Economy (with live simulation) → Program (drag-drop rounds) → Review (recap + publish button with reason)

**From Sprint 3C (Phase 3 plan):**
| Page | Description |
|---|---|
| `/admin/audit` | Audit log DataTable with date picker, combobox action filter, input entityId/requestId. Detail Sheet with before/after diff, hashed IP, copyable requestId. No delete. |
| `/admin/users` | User search (Command ⌘K) → Tabs: Profil/Inscriptions/Paiements/Wallet-ledger. Actions: reconcile payment (FINANCE), wallet adjustment (FINANCE/SUPER_ADMIN), create SupportCase. |

**From Phase 3 plan matrix (sidebar entries):**
| Sidebar Entry | ADMIN | SUPER_ADMIN | FINANCE | SUPPORT |
|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Sessions (CRUD) | ✅ | ✅ | 👁 lecture | 👁 |
| Live control | ✅ | ✅ | ❌ | 👁 |
| Paiements / reconciliation | 👁 | ✅ | ✅ | 👁 |
| Wallets / adjustments | ❌ | ✅ | ✅ | 👁 |
| Utilisateurs (support) | 👁 | ✅ | 👁 | ✅ |
| Mini-jeux | ✅ | ✅ | ❌ | ❌ |
| Audit logs | ✅ | ✅ | ✅ | 👁 |

---

## 2. Required CTA labels/texts and forbidden shortcuts

### Forbidden words (wording rule, Phase 3 Sprint 3E):
- `pari|mise|jackpot|gain garanti|prize pool` — banned across all pages including admin (demos possible). Re-scan global required.

### CTA labels and texts documented:
- Program Builder: "+ Ajouter un round" button
- Sortable card: "Config" button, "Supprimer" aria-label
- Live control: Pause / Reprendre / Finaliser — each requires Alert Dialog + Textarea reason (required, button disabled if empty)
- Incidents: "Créer un incident" button
- Dialog "ajouter un round": Tabs by family, Select policy filtered by FAMILY_POLICIES
- Audit: no delete button (anywhere)
- Support: reconcile payment (FINANCE), wallet adjustment (FINANCE/SUPER_ADMIN, reason + confirmation amount retaped), create SupportCase

### Badge texts documented:
- `policyLabel` outputs: "Top {n} passent", "{n} derniers éliminés", "{p.bps/100}% éliminés", "Survie → {quota} restants", "Aucune élimination (points)"
- Coherence badges: "✔ Programme cohérent" (green) / "✕ Incohérent — publication bloquée" (danger)
- Funnel labels: "Session pleine ({maxPlayers})", "Minimum ({minPlayers})"
- Gagnants configurés: "Gagnants configurés : {winnersCount}"

### Error text documented:
- Funnel incoherence: "Le programme doit laisser au moins {winnersCount} joueur(s) à la fin. Ajuste les policies."

---

## 3. Required empty/loading/error states

**From Phase 3 Sprint 3E (Polish):**
> Every page must have its 4 states: loading (Skeleton), empty (Empty), error (Alert + retry), success. Systematic audit with a checklist per route.

**Specific mentions:**
- Dashboard: Alert banner for critical signals (wallets `isLedgerAligned=false`, webhooks failing)
- Dashboard KPI: `AnimatedNumber` for counters
- Live control: DataTable of players with connection status, submitted, reconnectUntil. Funnel réel vs prévu.
- Audit: `<pre>` JSON diff (2 columns red/green) for before/after
- Support: Provider secrets masked — `providerTransId` truncated (`fap_…3f9`), never full. Never expose api keys, webhook secrets, provider raw secrets.
- Program Builder: simulation funnel sticky right column, coherence badge live-updated

---

## 4. Required tests/checks from plan files

### From Feature 04 plan:
- Unit tests: XAF/bps formulas
- Integration tests: DRAFT creation, simulation, publish, cancel
- RBAC tests: admin creates DRAFT; player refused
- Concurrency tests: `configVersion`/OCC on concurrent modification, modification after paid refused
- Audit tests: before/after/reason written for sensitive actions
- E2E: admin creates → simulates → publishes session

### From Feature 13 plan:
- RBAC by role: admin/support/finance/super admin (positive and negative)
- Integration tests: dashboard and audit filters
- Audit written for every sensitive action
- Provider secrets masked (Playwright `page.content()` does not contain full transId)
- Sensitive action without reason refused
- E2E support: search user → consult without leak

### From Phase 3 plan:
- **Sprint 3C tests**: RBAC négatif par rôle on each page; reason vide bloqué; audit écrit for each action (verified via audit API); secrets absent from DOM (Playwright `page.content()` does not contain full transId)
- **Sprint 3E / Recette finale**: 5 Playwright parcours:
  1. Discovery → account → registration
  2. Payment (Fapshi webhook simulated) → lobby → check-in
  3. Live 2 browsers: 2 Playwright contexts, 2-round session, 1 elimination, 1 reconnection (context.setOffline)
  4. Results → distribution → wallet credited → stats (with API ledger assertions)
  5. Admin: create 3-round program (green funnel) → publish → pause/resume live → audit trace
- Concurrency tests: last place, double debit, double distribution; anti-leak test; chaos test (kill game-server mid-round → worker closes → session finalizable)
- Light load test: 50 simulated players on 1 session (headless colyseus.js)
- Mobile data test: < 5 MB per complete session (excluding first visit)
- Lighthouse: mobile ≥ 85 (public), ≥ 75 (live)
- Bundle test: `pnpm build` + verify pixi not in public page chunks
- Zero admin endpoint without negative RBAC test
- Zero ledger/wallet inconsistency

---

## 5. Contradictions and open product decisions

### Contradictions / discrepancies:
1. **Feature 04 lists** `POST /v1/admin/sessions/:id/open-registration` as an API route, but Phase 3 plan does not mention it as a separate step — publish may imply open registration directly.
2. **Phase 3 plan** says non-admin → **404** (not 403, to not confirm admin zone existence), while Feature 04/13 docs specify **403** error codes (`403_ADMIN_ROLE_REQUIRED`, `403_ROLE_REQUIRED`). This is intentional: 404 for the UI layout gate, 403 for API middleware — but must be confirmed as the designed behavior.
3. **`GET /v1/admin/sessions`** is not explicitly listed in any PRD route table, but Phase 3 plan implies a session list page (sidebar Sessions CRUD), which would require a list endpoint. Currently undocumented.
4. **Phase 3 plan** adds `/v1/admin/minigames` (GET, enabled only) for the Program Builder Dialog, but this is not in Feature 04 or Feature 13 PRD routes.
5. **Phase 3 plan** adds live control routes (pause/resume/finalize via existing admin session routes) but does not specify their exact API paths — assumes they exist from Feature 09/10 which are dependencies.
6. **Phase 3 plan** mentions `POST /v1/admin/incidents` as an existing route, but Feature 13 PRD does list it.

### Open product decisions:
- Default values for price/commission/winners (Feature 04 PRD open question)
- Exact modification policy after publication — what changes are still allowed (Feature 04 PRD)
- Session templates needed V1 or post-MVP (Feature 04 PRD)
- Exact role matrix V1 (Feature 13 PRD open question)
- Which actions require approval vs direct execution (Feature 13 PRD)
- Support SLA and incident taxonomy (Feature 13 PRD)
- Retention duration for audit logs (Feature 13 PRD)
- V1 WebSocket admin room vs polling for live monitor (Phase 3 plan: "décision au gate selon routes réelles")
