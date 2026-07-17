# P-C-LEGAL - Consentement, privacy et retention

## Mission autonome

Transformer les contraintes legales/metier approuvees en preuves serveur : documents versionnes,
consentement, droits donnees, retention, anonymisation, conservation financiere et providers.

## Prerequis et lectures

- P-SEQ-03/06 merges; conseil legal/localisation commerciale et politique finance disponibles.
- Lire privacy, security, auth, payment, notifications, audit et modele donnees.
- Documentation officielle des providers pour sous-traitance/retention; Context7 si SDK d'export utilise.

## Ownership

Documents/policies approuves, use-cases consent/export/delete/anonymize, jobs retention et UI compte/legal.
Les migrations passent par le proprietaire DB si necessaires.

## Interdit

Affirmer une conformite sans validation competente, checkbox seulement cliente, suppression des preuves
financieres obligatoires, export non autorise ou role/secret mini-jeu dans une demande support.

## Livrables production

- CGU/confidentialite/cookies/jeu-paiement versions, dates et consentement serveur;
- inventaire finalites/donnees/sous-traitants/transferts et base legale decidee;
- retention par sessions, live inputs/checkpoints, scores, logs, notifications, incidents et finance;
- export, rectification, suppression/anonymisation avec exceptions financieres/audit;
- cookies/analytics consentis, opt-out notification et contact/support;
- jobs purge avec dry-run, audit, metriques et legal hold;
- mentions Fapshi/provider et procedure violation donnees.
- juridictions servies/interdites, qualification jeu d'adresse/hasard et licences/agrement eventuels;
- age minimum/mineurs, identite/KYC, AML/sanctions pour gains et seuils de payout;
- fiscalite/retenues, affichage prix/frais, litiges/chargebacks et preuve de transaction;
- jeu responsable : limites, auto-exclusion, signaux de risque, information et procedure d'appel.

## Criteres d'acceptation

- inscription conserve version/date/source du consentement;
- export contient seulement le demandeur et reste protege/expirant;
- purge respecte retention et ne casse pas ledger/reconciliation;
- retrait consentement/opt-out agit sur les traitements concernes;
- aucune juridiction n'est ouverte sans qualification/licence decidee; age, KYC/AML, fiscalite et jeu
  responsable ont chacun un verdict binaire de go-live signe;
- tests prouvent RBAC, idempotence et redaction.

## Tests et sortie

L3 retention/anonymisation, L4 permissions, L5 consent/export/delete/opt-out. Revue juridique nommee,
gates lot, registre final et commit atomique.
