# P-SEQ-09 - Decision go-live et lancement reversible

## Mission autonome

Prendre une decision binaire GO/NO-GO a partir des preuves, puis, seulement en cas de GO humain
explicite, promouvoir le release candidate et surveiller le lancement selon le runbook.

## Prerequis et lectures

- `P-SEQ-08` termine; rapport de repetition signe.
- Lire audit production, registre risques, legal, finance, SLO, on-call, rollback et release manifest.
- Documentation officielle des plateformes et Fapshi a jour.

## Ownership exclusif

Checklist go-live, signatures, fenetre de changement, promotion, smoke prod, observation renforcee et
rapport post-lancement. Aucun developpement de feature.

## Interdit

Deployer sans ordre humain explicite, reconstruire l'artefact, ignorer un P0/P1, contourner un provider,
modifier la DB manuellement ou transformer l'absence d'alerte en preuve de succes.

## Gate GO obligatoire

- six jeux L5/L6 verts et rulebooks/version runtime correspondants;
- paiement Fapshi officiel, admission, reconciliation et compensation/payout selon scope finance;
- notification reelle et support/incident/compliance operationnels;
- security, privacy/legal, supply chain et audit approuves;
- capacity/SLO, backup/restore, rollback et on-call exerces;
- aucun fake, hardcode, localhost, seed dangereux ou secret dans l'artefact;
- tous les P0 sont fermes;
- toute derogation P1 possede compensations testees, signatures produit/securite/legal/operations
  concernees, date d'expiration et plan de correction.

## Criteres d'acceptation

- decision et signataires sont archives avant toute promotion;
- production utilise exactement le digest recete;
- smoke utilisateur/admin/Fapshi/live/notification est vert apres promotion;
- rollback est declenche automatiquement ou humainement aux seuils decides;
- une revue 24 h/72 h classe incidents, metriques et prochaines priorites.

## Tests et sortie

En NO-GO : aucun deploiement, lots fautifs rouverts. En GO explicite : promotion, synthetic smoke,
surveillance renforcee et rapport. Ne jamais pousser, merger ou deployer sans autorisation humaine.
