# P-SEQ-01 - Rulebooks signes des six mini-jeux

## Mission autonome

Produire les six specifications produit executables avant tout contrat ou runtime. Chaque fiche fixe
le gameplay, les acteurs, les transitions et la justice competitive; aucun agent ne deduit une regle
depuis un titre ou le legacy.

## Prerequis et lectures

- `P-SEQ-00` merge.
- Lire le catalogue, le workflow d'integration mini-jeu, UX, scoring, realtime, audit production et les
  preuves legacy des six cles.
- Context7 : Colyseus pour les contraintes de reconnexion; aucune bibliotheque UI n'est choisie ici.

## Ownership exclusif

Nouvelles fiches produit/UX/ADR des six jeux et matrice commune de fairness. Aucun code, contrat ou DB.

## Interdit

Ne pas recopier les resolvers legacy comme regles finales. Ne pas valider `silent-vote` sans vrais
roles caches. Ne pas accepter timestamp, position, score ou victoire envoyes comme verite client.

## Livrables production

Ratifier les six cles candidates du plan ou remplacer explicitement un candidat par un jeu de la meme
famille. Mettre a jour catalogue, fiches WAVE-B et matrice avant P-SEQ-02; aucun remplacement implicite
apres le freeze.

Pour chaque cle : objectif, taille/formation, phases, commandes, limites, timer, victoire, egalite,
score, gain, no-show, abandon, reconnect, checkpoint, information publique/privee/support, anti-triche,
fairness, accessibilite, assets, telemetrie et scenarios Given/When/Then.

Points obligatoires : horodatage serveur du duel, binome impair/alliance, equipe choisie mutuellement,
simulation serveur de survie, roles/victoire/no-leak du role cache et progression verifiee du solo.

## Criteres d'acceptation

- six rulebooks portent statut `APPROVED`, version et proprietaire produit;
- chaque cle/titre affiche possede une decision de ratification tracee;
- chaque commande et transition a une reponse serveur et une erreur definies;
- la matrice d'audience couvre joueur, partenaire/equipe, admin, observateur et support;
- les cas de latence, reconnexion, crash room et reprise sont decidables sans improvisation;
- chaque fiche mappe ses AC aux niveaux L1/L3/L4/L5.

## Tests et sortie

`pnpm docs:check`, liens internes, revue produit et adversariale no-leak/fairness. Commit documentaire
atomique. Toute question non resolue bloque P-SEQ-02 et reste nommee avec son decideur.
