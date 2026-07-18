# P-B-ALLIANCE - Trust Bridge

## Mission autonome

Livrer `trust-bridge` comme alliance forcee par binome avec choix prive, resolution serveur et regles
explicites pour joueur impair, no-show, deconnexion et remplacement.

## Prerequis et lectures

- P-SEQ-01 rulebook approuve, P-SEQ-05 merge.
- Lire resolver legacy, formation de binome, audience, scoring et UX communication.
- Context7 : Colyseus projections/reconnect et renderer utilise.

## Ownership

Runtime/config/resolver alliance, pairing, plugin, UI joueur/partenaire/readonly, telemetrie et tests.

## Interdit

Contracts/DB/registry, pairing par ordre accidentel du tableau, choix partenaire visible avant verrou,
resolution client, remplacement improvise ou score individuel contradictoire avec l'unite binome.

## Livrables production

- formation de binomes deterministe selon rulebook et traitement du joueur impair;
- routes/choix, phases commit/lock/reveal/resolve et limite de communication;
- absence, abandon, reconnexion d'un partenaire et politique de remplacement;
- etat prive par joueur/binome, projection publique minimale et redaction support;
- score/gain/evidence du binome puis repartition explicite;
- UI accessible indiquant partenaire, timer et confirmation sans fuite anticipee.

## Criteres d'acceptation

- ordre de connexion ne modifie pas arbitrairement l'appariement;
- choix d'un partenaire reste absent du wire adverse avant la phase autorisee;
- double submit, partenaire absent ou reconnect ne resolvent qu'une fois;
- joueur impair et remplacement obtiennent un resultat conforme au rulebook;
- classement/publication et gains respectent l'unite binome.

## Tests et sortie

L1 pairing/resolution/fuzz, L3 assignation/checkpoint/evidence, L4 paires+impair+reconnect/no-leak, L5
multi-joueurs/admin/observer/publication. Gates lot et commit atomique.
