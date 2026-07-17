# P-A-SUPPORT - Support, compliance, incidents et audit durable

## Mission autonome

Remplacer les shells support/compliance/audit par des workflows reels de lecture, incident, waiver,
action encadree et tracabilite, sans donner au support les pouvoirs admin ou finance.

## Prerequis et lectures

- P-SEQ-02/03 merges.
- Lire roles/permissions, compliance, incident, audit, privacy, UX support et preuves legacy.
- Context7 : ConnectRPC, Next.js et Prisma selon les implementations.

## Ownership

Use-cases Compliance/Support/Incident/Audit, `/support/**`, `/admin/compliance`, `/admin/audit`,
`/admin/parties/*/audit`, `/admin/parties/*/incidents`, queries timeline, redaction et tests. Pas de
mutation paiement/score/live.

## Interdit

Contracts/DB, audit `.catch(() => {})` sur action critique, chiffres de conformite hardcodes, secret/role
cache visible, impersonation non approuvee ou privilege ADMIN/FINANCE.

## Livrables production

- incidents creer/assigner/classer/resoudre avec SLA, evidence et timeline;
- gates/waivers compliance versionnes, expiration et proprietaire;
- audit acteur/action/cible/resultat/statut/correlation, ecriture fiable et alerte failure;
- audit append-only/tamper-evident, droits lecture/ecriture separes, exports signes et detection de
  trou/modification;
- pipeline signal anti-triche -> correlation -> incident/gate, seuils, faux positifs, revue humaine et
  procedure d'appel;
- vue support joueur/partie redigee, actions limitees et motifs obligatoires;
- recherche/pagination/export autorises et retention appliquee;
- UI sans `support-data`, hardcodes ou etat de succes invente.

## Criteres d'acceptation

- SUPPORT ne publie pas de score, ne lance pas de round et ne gere pas un paiement;
- information privee mini-jeu est masquee sauf procedure d'incident explicitement autorisee;
- audit critique ne peut echouer silencieusement;
- incident/waiver expirant declenche notification/alerte;
- refus RBAC et exports sensibles sont eux-memes audites.

## Tests et sortie

L3 audit/incidents/claims, L4 RBAC/redaction, L5 support/compliance/audit avec refus malveillants. Gates
lot, commit atomique et runbook support.
