# Sprint 18 - Compliance support audit anti-cheat

## Objectif

Rendre les actions sensibles auditables et exploitables par admin/support. Hors scope: UI admin sans garde
serveur.

## User Stories Produit

| ID | Role | User story | Valeur produit | Priorite |
|---|---|---|---|---|
| US-18-01 | Admin | En tant qu'admin, je veux decider un gate compliance avec preuve, afin de debloquer ou bloquer proprement une action. | Gate exploitable. | Must |
| US-18-02 | Support | En tant que support, je veux ouvrir et suivre un incident sans commande competition, afin d'aider sans risque. | Support auditable. | Must |
| US-18-03 | Joueur | En tant que joueur, je veux que les decisions sensibles soient tracees, afin de proteger l'equite. | Audit visible par processus. | Must |
| US-18-04 | Worker/Systeme | En tant que systeme, je veux enregistrer les signaux anti-cheat sans secrets, afin d'aider la review. | Anti-cheat exploitable et redige. | Must |

## Scenarios D'Acceptation Atomiques

| ID | Story | Surface | Given | When | Then | UML liee | Contrat/Test |
|---|---|---|---|---|---|---|---|
| AC-18-01 | US-18-01 | Compliance admin | Gate bloquant | L'admin clique `Examiner le gate` | Details, evidence et actions autorisees visibles | [permissions](../../03-architecture/uml/permissions.md) | `ListComplianceGates` |
| AC-18-02 | US-18-01 | Compliance admin | Evidence suffisante | L'admin clique `Valider le gate` | Gate passe, audit acteur/raison/resultat | [data flow](../../03-architecture/uml/data-flow.md) | `DecideComplianceGate` |
| AC-18-03 | US-18-01 | Compliance admin | Raison vide | L'admin clique `Waiver le gate` | Refus `AUDIT_REASON_REQUIRED` | [permissions](../../03-architecture/uml/permissions.md) | Audit reason test |
| AC-18-04 | US-18-02 | Support incident | Role support | Le support clique `Ouvrir incident` | Incident cree sans commandes round/publish | [permissions](../../03-architecture/uml/permissions.md) | `OpenIncident` |
| AC-18-05 | US-18-04 | Anti-cheat review | Duplicate nonce detecte | Le systeme enregistre `RiskSignal` | Signal sans reponse cachee ni secret | [data flow](../../03-architecture/uml/data-flow.md) | Redaction test |
| AC-18-06 | US-18-03 | Audit joueur/admin | Action sensible realisee | L'admin clique `Voir audit` | Trace acteur, entite, raison, resultat disponible | [data flow](../../03-architecture/uml/data-flow.md) | `ListAuditEvents` |

## Sources Docs Obligatoires

- Produit: [actors](../../01-product/actors-and-permissions.md), [scoring](../../01-product/scoring-and-publication.md)
- UX: [admin command center](../../02-ux/admin-command-center.md), [loading/error/reconnect](../../02-ux/loading-error-reconnection.md)
- Architecture/UML: [security model](../../03-architecture/security-model.md), [permissions](../../03-architecture/uml/permissions.md), [data flow](../../03-architecture/uml/data-flow.md)
- Couches: [observability](../../04-layers/observability.md), [admin web](../../04-layers/admin-web.md), [persistence](../../04-layers/persistence.md)
- Workflow: [pipeline agentique](../../05-workflows/agentic-feature-pipeline.md), [safe removal](../../05-workflows/safe-removal.md)
- Tests: [strategie de test](../../05-workflows/test-strategy.md)

## Preuves Legacy

- Compliance gates pouvaient bloquer toute publication publique.
- `AdminActionApproval`, `IncidentLog`, `SupportCase`, `RiskSignal`, `AntiCheatEvent` existaient.
- Les docs admin-arbitrage prevoyaient incidents, decisions et approvals.

## UML Concernee

- Lire [permissions](../../03-architecture/uml/permissions.md), [data flow](../../03-architecture/uml/data-flow.md) et [scoring publication](../../03-architecture/uml/scoring-publication.md).
- Modifier si une permission sensible ou un audit obligatoire change.

## Pipeline Par Couche

- Web: compliance/support/audit views avec denied/stale/error.
- API/ConnectRPC: services compliance, support, audit, anti-cheat.
- Game-server: emit anti-cheat/risk signals sans decision support.
- Domaine: gates, incidents, audit policies.
- DB: audit log, incident, risk signal, anti-cheat event.
- Worker: normalisation/retry si signaux async.
- Notifications: incident notification si decide.
- Observabilite: action/entity/reason/correlationId et redaction.

## Contrats Protobuf Et ConnectRPC

`ListComplianceGates`, `DecideComplianceGate`, `OpenIncident`, `ListAuditEvents`,
`RecordAntiCheatEvent`, `ListRiskSignals`, erreurs `AUDIT_REASON_REQUIRED`, `WAIVER_FORBIDDEN`.

## Data

Audit obligatoire pour action sensible; anti-cheat event minimal sans reponse cachee ni secret.

## UI States

Gate blocked, waiver pending, incident open/resolved, audit empty, support read-only denied.

## Permissions

Support read-only par defaut. Admin decide. Finance lit finance. Aucun role client ne remplace le serveur.

## Erreurs Observabilite

Action sensible sans raison, support forbidden, anti-cheat redaction failure, correlation id absent.

## Tests Attendus

- Publication publique bloquee/debloquee par workflow complet.
- Audit obligatoire pour action sensible.
- Support read-only respecte.
- Anti-cheat event n'expose pas donnees privees inutiles.

## Definition Of Done

- Les gates compliance ne sont plus des blocages sans issue.
- Les actions sensibles ont trace, acteur, raison et resultat.

## Interdictions Specifiques

- Ne pas donner une UI admin sans garde serveur.
- Ne pas stocker secrets ou reponses cachees dans les logs.
