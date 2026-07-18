# Paiements, Finance Et Workers

Ce document rend explicite les interfaces liees aux paiements, au wallet, au ledger, aux reconciliations,
aux gains post-publication, aux notifications et aux jobs idempotents.

Sources: sprints 03, 04, 07, 13, 17, 19.

Sources externes appliquees:

- Stripe: le paiement est represente comme un cycle d'etats, avec actions supplementaires possibles et traitement asynchrone.
- Stripe security: secrets provider, payloads bruts, tokens et details sensibles restent hors UI joueur/admin/support.
- WCAG/GOV.UK: les erreurs et statuts de paiement sont affiches pres de l'action et restent comprehensibles sans jargon provider.

## Parcours Paiement Joueur

```text
Detail partie
  -> S'inscrire
  -> Statut participation
  -> Paiement participation si requis
  -> Verification paiement
  -> Lobby uniquement si admission OK
```

### Ecran Paiement Joueur

```text
+--------------------------------------------------------------------------------+
| Partie X | Paiement participation                                              |
+--------------------------------------------------------------------------------+
| Resume                                                                         |
| Participation: REGISTERED                                                      |
| Montant: prix public                                                           |
| Acces live: bloque tant que paiement non confirme                              |
|                                                                                |
| Methodes                                                                       |
| +--------------------------------+ +-----------------------------------------+ |
| | Provider externe               | | Wallet                                  | |
| | Statut: PENDING/FAILED/OK      | | Solde: suffisant/insuffisant           | |
| | [Payer maintenant]             | | [Payer avec wallet]                    | |
| +--------------------------------+ +-----------------------------------------+ |
|                                                                                |
| Verification                                                                   |
| [Verifier le paiement]                                                         |
|                                                                                |
| Messages                                                                       |
| - Paiement en attente: attendre ou verifier                                    |
| - Provider indisponible: reessayer plus tard                                   |
| - Wallet insuffisant: aucun debit effectue                                     |
| - Montant divergent: paiement bloque, contacter support                        |
+--------------------------------------------------------------------------------+
```

### Etats Paiement Joueur

| Etat                              | UI joueur                                | CTA                                  |
| --------------------------------- | ---------------------------------------- | ------------------------------------ |
| Aucun paiement requis             | Admission peut continuer                 | `Entrer au lobby` si autres gates OK |
| `PAYMENT_PENDING`                 | Paiement cree, confirmation attendue     | `Verifier le paiement`               |
| `PAYMENT_CONFIRMED`               | Acces financier valide                   | `Entrer au lobby`                    |
| `PAYMENT_FAILED`                  | Raison publique affichee                 | `Reessayer`                          |
| `PROVIDER_UNAVAILABLE`            | Provider indisponible sans detail secret | `Reessayer plus tard`                |
| `WALLET_INSUFFICIENT_FUNDS`       | Solde insuffisant, aucun debit           | `Choisir autre methode`              |
| `PAYMENT_RECONCILIATION_REQUIRED` | Statut en verification support/finance   | `Contacter support`                  |

## Admin - Blocage Paiement

L'admin voit uniquement l'impact sur l'admission, pas les commandes ledger.

```text
+--------------------------------------------------------------------------------+
| Participant detail - Admin                                                     |
+--------------------------------------------------------------------------------+
| Joueur | Participation | Paiement | Admission live                              |
| ...    | REGISTERED    | BLOCKED  | Non admissible                             |
|                                                                                |
| Blocage paiement                                                               |
| Raison publique: paiement en attente / echoue / reconciliation requise         |
|                                                                                |
| Actions admin                                                                  |
| [Voir participant] [Envoyer annonce si phase preparation]                      |
|                                                                                |
| Actions absentes                                                               |
| Modifier ledger, forcer debit, reconciler transaction                          |
+--------------------------------------------------------------------------------+
```

## Finance - Ledger Et Reconciliation

```text
+--------------------------------------------------------------------------------+
| Finance | Ledger                                                               |
+--------------------------------------------------------------------------------+
| Filtres: date | partie | joueur | status | provider | idempotency key          |
|                                                                                |
| Table mouvements                                                               |
| Time | Actor/System | Type | Amount | Direction | Status | Idempotency | Audit |
|                                                                                |
| Detail transaction                                                             |
| - Transaction id                                                               |
| - Provider public ref                                                          |
| - Idempotency key                                                              |
| - Wallet movement                                                              |
| - Reconciliation status                                                        |
| - Audit trail                                                                  |
|                                                                                |
| Actions finance                                                                |
| [Reconciler] [Marquer a verifier] [Voir audit]                                 |
+--------------------------------------------------------------------------------+
```

### Etats Ledger

| Etat                 | UI finance            | Garde                      |
| -------------------- | --------------------- | -------------------------- |
| `LEDGER_POSTED`      | Mouvement poste       | Lecture/audit              |
| `LEDGER_PENDING`     | Mouvement en attente  | Retry/reconcile selon role |
| `LEDGER_RECONCILING` | Verification en cours | Bloquer double action      |
| `LEDGER_CORRECTED`   | Correction auditee    | Raison visible             |
| `LEDGER_FAILED`      | Echec redige          | Retry si idempotent        |

## Gains Post-Publication

Source: sprint 13.

```text
ROUND_VERIFICATION
  -> Scores provisoires admin
  -> Correction/review
  -> RESULTS_PUBLISHED
  -> Job gains autorise
  -> Ledger finance
```

Regles UI:

- Avant `RESULTS_PUBLISHED`, le job gains est affiche comme bloque ou en attente.
- Apres publication validee, finance peut voir le job et les mouvements associes.
- Joueur ne voit que resultats publies et statut public de gain si le produit le confirme.

## Worker Jobs Et Idempotence

```text
+--------------------------------------------------------------------------------+
| Operations jobs                                                                |
+--------------------------------------------------------------------------------+
| Job | Type | Entity | Status | Attempts | Idempotency | Last error | Actions    |
| ... | notification | party | PENDING | 0 | uuid | - | [Retry]                  |
| ... | payment_reconcile | tx | FAILED | 2 | uuid | redacted | [Retry]          |
| ... | rewards | result | BLOCKED | 0 | result-version | waiting publication | - |
+--------------------------------------------------------------------------------+
```

### Etats Jobs

| Etat                   | Sens UI                                                  |
| ---------------------- | -------------------------------------------------------- |
| `PENDING`              | Cree, pas encore traite.                                 |
| `PROCESSING`           | Revendique par un worker.                                |
| `SUCCEEDED`            | Termine avec resultat trace.                             |
| `FAILED_RETRYABLE`     | Peut etre relance sans doublon.                          |
| `FAILED_FINAL`         | Bloque, intervention requise.                            |
| `BLOCKED_BY_LIFECYCLE` | Condition metier non remplie, ex: resultats non publies. |

## Notification Delivery

Source: sprint 17.

```text
+--------------------------------------------------------------------------------+
| Delivery status                                                                |
+--------------------------------------------------------------------------------+
| Notification | Audience | Channel | Job status | Delivery status | Actions      |
| Rappel prep  | joueurs non prets | sms/wa/email | SUCCEEDED | SENT/FAILED | Retry |
+--------------------------------------------------------------------------------+
```

### Etats Delivery

| Etat          | Audience UI                                            |
| ------------- | ------------------------------------------------------ |
| `PENDING`     | Admin/support voit en attente.                         |
| `SENT`        | Message envoye au provider.                            |
| `DELIVERED`   | Livraison confirmee si provider le permet.             |
| `FAILED`      | Echec redige, retry possible selon politique.          |
| `UNDELIVERED` | Provider a refuse ou livraison impossible.             |
| `READ`        | Visible seulement si canal supporte et scope confirme. |

## No-Leak Finance Et Provider

- Le joueur ne voit jamais payload provider brut, idempotency interne sensible ou ledger complet.
- L'admin ne voit jamais commande de debit/credit.
- Le support voit erreur redigee, pas token provider.
- Finance voit les donnees necessaires au ledger, pas les commandes live.
- Les logs UI ne doivent pas afficher secrets, tokens, numero complet ou donnees paiement inutiles.
