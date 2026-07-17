# P-SEQ-04 - Composition du coeur commercial

## Mission autonome

Integrer les lots WAVE-A un commit a la fois et livrer un parcours commercial reel jusqu'a la room,
sans completer silencieusement une feature fautive dans le merge train.

## Prerequis et lectures

- Les douze lots WAVE-A sont verts, commits atomiques et worktrees propres, sauf amendement de scope
  signe avant leur lancement.
- Lire leurs rapports, le freeze contrats/DB, matrice RPC, audit et conventions de merge.
- Context7 : ConnectRPC, Hono, Next.js et Colyseus pour les seules corrections de composition.

## Ownership exclusif

Routeur RPC central, composition API/web, providers/adapters partages, scripts d'orchestration affectes,
matrice RPC et tests E2E transverses. Les corrections metier retournent au lot proprietaire.

## Interdit

Resolution de conflit par choix aveugle d'un cote, modification Proto/DB hors jalon proprietaire,
provider fake, import de `ui-data`/`player-data`/`finance-data`/`observer-data`/`support-data` dans un
parcours inclus.

## Livrables production

- les 11 services hors MiniGame sont montes et leurs methodes production implementees;
- register -> catalogue -> siege -> checkout Fapshi -> paiement confirme -> lobby -> live;
- admin/finance/support/observer separes par politique serveur;
- outbox/job reel declenche depuis les transactions applicatives;
- URL live publique unique et configuration fail-fast;
- E2E multi-service sans worker/provider contourne.

## Criteres d'acceptation

- aucune participation non payee n'entre au lobby/room payante;
- token session absent du JavaScript et permissions finance/admin conformes au domaine;
- provider/DB/Redis indisponible produit un etat actionnable sans succes invente;
- matrice RPC et routes/UI refletent l'etat reel;
- chaque merge garde generation, migration, tests lot, L4, typecheck et lint verts.

## Tests et sortie

Merge `--no-ff` atomique, gates apres chaque commit, puis L3/L4/L5 du parcours commercial. Conserver
traces Fapshi sandbox redigees. Produire un commit de composition et une liste de lots renvoyes.
