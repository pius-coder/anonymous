# P-B-SOLO - Memory Sequence

## Mission autonome

Livrer `memory-sequence` comme feature Solo production : sequence secrete serveur, progression prouvee,
UI accessible, reconnexion et score provisoire reproductible.

## Prerequis et lectures

- P-SEQ-01 rulebook approuve, P-SEQ-05 plateforme mergee.
- Lire preuves legacy du runtime, contracts/config figes, audience, scoring et assets.
- Context7 : Colyseus et renderer web reellement utilise.

## Ownership

Runtime/config/resolver Memory Sequence, adapter plugin, renderer joueur/readonly, assets/licences,
telemetrie et tests du jeu. Consommer la plateforme publique.

## Interdit

Contracts/DB/registry central, sequence dans state publique/log, `roundIndex` client comme preuve de
progression, random global, score client ou simple placeholder anime.

## Livrables production

- phases briefing/display/input/feedback/complete avec clock/seed serveur;
- config versionnee : longueur initiale, increment, rounds, vitesse et limites;
- commandes symbole typees, ordre/nonce/deadline/rate limit et progression serveur;
- checkpoint prive permettant reprise sans reveler ou regenerer une autre sequence;
- score/tie-break/evidence selon rulebook et projection observer sans secret;
- UI clavier/tactile avec texte/symboles non dependants uniquement de couleur/mouvement.

## Criteres d'acceptation

- sauter un niveau, rejouer un input ou envoyer apres deadline est refuse;
- meme seed/config/commandes produit meme sequence/resultat;
- reconnect pendant affichage et saisie reprend la bonne phase sans double score;
- sequence future absente du wire, DOM, logs et vue support;
- publication affiche exactement le score issu de la preuve runtime.

## Tests et sortie

L1 determinisme/fuzz/progression, L3 checkpoint/evidence, L4 vrai client Colyseus reconnect/no-leak,
L5 admin+joueur+observer+publication sur mobile/clavier. Gates lot et commit atomique.
