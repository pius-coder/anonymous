# P-A-OBSERVER - Observation strictement readonly

## Mission autonome

Livrer une experience observateur reelle pour lobby, room, manches et resultats publies, avec projection
minimale et impossibilite structurelle d'envoyer une commande competitive.

## Prerequis et lectures

- P-A-REALTIME disponible; P-SEQ-02/03 merges.
- Lire UX observer, audience/no-leak, scoring et contrats Realtime/Scoring.
- Context7 : Colyseus projections/testing et Next.js.

## Ownership

Use-cases/projections observer, routes `/observe/**`, composants readonly et tests malveillants. Pas de
runtime, admin command ou scoring mutation.

## Interdit

Contracts/DB, snapshot joueur reutilise, commande cachee uniquement par UI, score provisoire, role/choix
cache, token participant ou donnees hardcodees.

## Livrables production

- admission/audience observer separees et projection allowlist par phase/jeu;
- etats joueur actif/elimine/deconnecte sans information privee;
- timeline publique et resultats uniquement apres publication;
- UI loading/empty/error/reconnect/mobile/accessibilite;
- commandes impossibles au transport et journalisation des tentatives;
- tests wire-level des champs interdits de l'enveloppe generique; chaque jeu ajoute ses assertions dans
  WAVE-B et P-SEQ-06.

## Criteres d'acceptation

- client modifie envoyant une commande recoit un refus sans effet;
- role, sequence, vote, choix partenaire, score provisoire et token sont absents du wire;
- reconnexion observer ne change pas la state machine competitive;
- publication invalide les vues et affiche le meme classement officiel;
- aucun import `observer-data` dans les routes incluses.

## Tests et sortie

L1 projection allowlist, L4 client Colyseus malveillant/no-leak, L5 lobby/live/resultats readonly sur
la state generique. Les six jeux sont recetes dans P-SEQ-06. Gates lot et commit atomique.
