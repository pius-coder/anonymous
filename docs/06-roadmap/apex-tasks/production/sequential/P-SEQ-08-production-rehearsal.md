# P-SEQ-08 - Repetition generale production

## Mission autonome

Executer une journee de partie controlee sur l'environnement preproduction identique a la production,
avec personnes et providers reels, puis prouver les procedures de panne et de reprise.

## Prerequis et lectures

- `P-SEQ-07` livre un release candidate immuable.
- Runbooks, RPO/RTO, SLO, contacts Fapshi/provider, donnees de test et plan d'incident approuves.
- Context7 et docs officielles des services manages/deploiement retenus.

## Ownership exclusif

Plan de repetition, donnees controlees, scripts de synthetic/load, artefacts de preuve et rapport de
readiness. Aucun patch metier pendant la recette; un echec retourne a son lot.

## Interdit

Mocks, URLs localhost, bypass paiement, injection DB de statuts, faux webhook, restauration non testee,
acceptation orale d'un P0/P1.

## Scenarios obligatoires

1. Inscription, reset livre reellement et sessions multi-device/revocation.
2. Derniere place concurrente et paiement Fapshi controle jusqu'a admission.
3. Six manches avec admin, joueurs, observateur et support; reconnect/no-leak/publication/gains.
4. Notification reelle, retry, DLQ et reprise provider.
5. Crash API/game-server/worker, saturation controlee, rotation secret et alerte on-call.
6. Backup, restore sur environnement vierge, rollback release et reconciliation finance.

## Criteres d'acceptation

- SLO et capacite restent dans les budgets signes;
- RPO/RTO, rollback et temps de detection/prise en charge sont mesures;
- Fapshi, montant, devise, participant, ledger et reconciliation concordent;
- aucune fuite de secret/role/score provisoire dans wire, logs ou support;
- chaque ecart est P0/P1/P2 avec proprietaire, echeance et decision.

## Tests et sortie

Executer L6, charge/soak, fault injection, restore et rollback. Produire un rapport signe avec artefacts
rediges. Aucun go-live dans cette fiche.
