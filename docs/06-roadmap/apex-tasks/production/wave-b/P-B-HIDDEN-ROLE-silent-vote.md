# P-B-HIDDEN-ROLE - Silent Vote

## Mission autonome

Livrer `silent-vote` comme vrai jeu a role cache. Le vote majoritaire legacy ne suffit pas : roles,
informations privees, discussion, vote, revelation et victoire doivent suivre le rulebook signe.

## Prerequis et lectures

- P-SEQ-01 rulebook role-cache approuve, P-SEQ-05 merge.
- Lire legacy silent-vote, audience/no-leak, support/privacy, scoring et reconnexion.
- Context7 : Colyseus schema/filtering/testing et renderer web utilise.

## Ownership

Runtime/config/resolver role cache, assignation privee, plugin, UI joueur/readonly, redaction support,
telemetrie et tests adversariaux.

## Interdit

Contracts/DB/registry, role dans state publique/log/analytics, simple elimination majoritaire sans roles,
vote modifiable apres lock, target arbitraire, reconnexion avec nouveau role ou observateur omniscient.

## Livrables production

- distribution seedee de roles/conditions de victoire et compatibilite taille joueurs;
- phases briefing prive/discussion/vote lock/resolution/revelation selon rulebook;
- vote unique, abstention/non-vote, egalite, abandon et joueur deconnecte;
- classification et chiffrement au repos des roles/votes/checkpoints avec cle geree, acces support
  audite, rotation/purge, restitution du meme role et projection par audience;
- score/gains/evidence sans exposer les secrets avant revelation autorisee;
- UI privee accessible, neutralisation captures/logs involontaires et procedure support encadree.

## Criteres d'acceptation

- scans wire/DOM/log/trace/support ne trouvent aucun role ou vote interdit;
- lecture DB/backup sans droit de dechiffrement ne revele aucun role/vote actif;
- reconnect restitue le meme role sans nouvelle distribution;
- double vote, cible invalide, late vote et commande observer sont sans effet;
- non-vote/egalite/abandon produisent la resolution signee;
- publication ne revele que les informations autorisees par le rulebook.

## Tests et sortie

L1 distribution/victoire/fuzz, L3 checkpoint/evidence, L4 clients par role+observer malveillant, L5
partie complete/reconnect/publication, revue adversariale no-leak. Gates lot et commit atomique.
