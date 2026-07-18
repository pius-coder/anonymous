# P-A-FAPSHI - Collecte Fapshi officielle

## Mission autonome

Remplacer integralement le faux adaptateur par une integration Fapshi sandbox/live fail-closed et un
checkout joueur reel. Fapshi est la decision fournisseur fermee.

## Prerequis et lectures

- P-SEQ-00/02/03 merges.
- Lire contrats Payment, modele DB production, audit, securite, docs finance et preuves legacy Fapshi.
- Documentation officielle obligatoire : environnement, credentials, `POST /initiate-pay`,
  `GET /payment-status/{transId}`, webhook, expire-pay et limites. Context7 pour HTTP/Connect utilise.

## Ownership

Client/adaptateur Fapshi du **service de collecte**, use-case de collecte, route webhook/inbox, UI
checkout/polling/return et tests provider. Le service payout possede un autre couple de credentials et
appartient a P-A-FINANCE. Pas de remboursement metier, admission ou scheduler.

## Interdit

Proto/DB, montage central, Bearer invente, `/initiate`, `checkoutUrl/reference` non officiels,
`fapshi-local-*`, statut injecte en DB, secret dans log/client et succes deduit du seul webhook.

## Livrables production

- base URL sandbox `https://sandbox.fapshi.com` ou live `https://live.fapshi.com` allowlistee;
- headers serveur `apiuser`/`apikey`, timeout, abort, retry uniquement sur operations sures et redaction;
- intent durable et `externalId` unique avant `/initiate-pay`; un timeout ambigu passe en `UNKNOWN` et
  declenche recherche/reconciliation, jamais un retry aveugle;
- validation `link`/`transId`, allowlist de l'hote checkout et `redirectUrl` construit cote serveur;
- ouverture du checkout, retour utilisateur et etats CREATED/PENDING/SUCCESSFUL/FAILED/EXPIRED;
- webhook `x-wh-secret` accuse rapidement, inbox durable, traitement asynchrone et verification par
  `payment-status` avant mutation; secret obligatoire, comparaison sure et rotation documentee;
- reconciliation recuperable si webhook perdu, car Fapshi ne le retente pas;
- kill switch et runbook rotation/incident sans fallback fake.

## Criteres d'acceptation

- config/credential absent ou reponse mal formee echoue sans creer un faux succes;
- checkout `link` hors host allowliste ou `redirectUrl` client arbitraire est refuse;
- webhook duplique, desordonne ou forge ne double pas et ne confirme rien seul;
- montant, devise, `externalId`, `transId` et identite de participation concordent avant succes;
- perte de reponse apres acceptation Fapshi ne cree pas une seconde transaction;
- aucune cle Fapshi n'atteint navigateur/log/trace;
- sandbox prouve initiation, retour, webhook/inbox et status query reels.

## Tests et sortie

L1 mapping/erreurs, L3 inbox/idempotence, L4 contract tests sur sandbox Fapshi controles, L5 checkout
navigateur sans injection DB. Gates lot, traces redigees, commit atomique et procedure live documentee.
