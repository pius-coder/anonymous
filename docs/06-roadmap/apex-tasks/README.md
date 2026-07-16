# Fiches APEX executables par session Codex

Chaque fichier de ce dossier est le prompt source de verite d'une session Codex separee. La session
doit lire le fichier entier, executer APEX, respecter l'ownership et s'arreter si un prerequis n'est pas
merge dans son commit de base.

## Etat d'execution

| Tache | Etat au 2026-07-16 |
|---|---|
| SEQ-00 | Termine, commit `71f7518` |
| SEQ-01 | Termine, inclus dans le commit de freeze contrats courant |
| SEQ-02 | Termine (seed deterministe, ScoreReview/DeliveryLog, L3 PG) — commit local a figer |
| WAVE-A/B, SEQ-03/04 | WAVE-A deblocable; SEQ-03 apres merge train WAVE-A |

## Ordre de lancement

### Non independantes, une seule session a la fois

1. `sequential/SEQ-00-integration-ci.md`
2. `sequential/SEQ-01-contracts-transport-freeze.md`
3. `sequential/SEQ-02-persistence-seed.md`
4. lancer les taches WAVE-A en parallele;
5. `sequential/SEQ-03-wave-a-merge-train.md`
6. lancer les taches WAVE-B en parallele;
7. `sequential/SEQ-04-system-acceptance.md`

### Independantes WAVE-A

- `wave-a/A-IDENTITY-password-reset.md`
- `wave-a/A-ACQUISITION-catalog-participation.md`
- `wave-a/A-PAYMENT-wallet-finance.md`
- `wave-a/A-PREPARATION-lobby-announcements.md`
- `wave-a/A-SCORING-publication.md`
- `wave-a/A-REALTIME-round-sync-reconnect.md`
- `wave-a/A-WORKERS-notification-delivery.md`

### Independantes WAVE-B

- `wave-b/B-MINIGAME-memory-sequence.md`
- `wave-b/B-OPERATIONS-compliance-support.md`
- `wave-b/B-OBSERVER-readonly.md`
- `wave-b/B-RESILIENCE-system-hardening.md`

## Regle de demarrage d'une session

La session commence par `pwd`, branche, status, commit, puis lit `AGENTS.md`, sa fiche, les documents
obligatoires et le code concerne. Elle utilise Context7 pour chaque bibliotheque impliquee. Elle ne
change jamais un chemin interdit et ne pousse/merge pas sans demande explicite.

Commande humaine type : ouvrir un worktree propre, demarrer une session Codex dans ce worktree et lui
donner uniquement : `Lis et execute docs/06-roadmap/apex-tasks/<fichier>.md`.

Le protocole worktree complet est `docs/05-workflows/apex-parallel-worktrees.md`.
