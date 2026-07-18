# Vision And Scope

## Vision

Construire une plateforme de parties multijoueurs temps reel composees de manches et mini-jeux, pilotee par un administrateur, avec des participants explicites, des resultats verifies et une experience joueur lisible.

## Scope v0.1

Inclus:

- planification sans demarrage automatique;
- lobby d'avant-match;
- partie active;
- attente de fin de manche;
- verification et publication;
- manche suivante ou fin de partie;
- supervision lecture seule par snapshots et evenements;
- contrats Protobuf documentes.

Exclus:

- capture video;
- replay sauvegarde complet;
- generation clients Protobuf;
- nouveaux mini-jeux;
- microservices supplementaires;
- correction du legacy `/live`.

## Scope du premier lancement production

Ce scope est distinct du gel v0.1. Il inclut :

- collecte et operations financieres Fapshi officielles, sans mock ni fallback local;
- parcours complets joueur, admin, finance, support et observateur;
- exactement six jeux production, un par famille; la baseline candidate est `memory-sequence`,
  `pure-reaction-duel`, `trust-bridge`, `team-relay`, `danger-sweep`, `silent-vote`, a ratifier ou
  remplacer dans `P-SEQ-01` avant les contrats;
- notifications reelles, exploitation, securite, legal, observabilite, restauration et rollback;
- recette commerciale et decision de go-live explicite.

Il n'inclut pas encore les 114 autres titres du catalogue, le multi-region actif/actif ni une
certification externe non imposee par le cadre legal retenu.
