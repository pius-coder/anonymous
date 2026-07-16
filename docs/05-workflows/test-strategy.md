# Test Strategy

Les tests doivent prouver un comportement metier observable. Un test qui verifie seulement qu'une fonction
est appelee, qu'un composant rend du texte decoratif ou qu'un repository retourne un mock n'est pas suffisant.

## Regles anti faux positifs

- Chaque test doit pointer vers une user story ou un scenario d'acceptation.
- Le `Then` du scenario doit etre verifie explicitement.
- Les permissions doivent etre testees cote serveur, pas seulement via bouton cache.
- Les projections par audience doivent prouver l'absence des champs interdits.
- Les tests d'erreur doivent verifier le code public et le message exploitable.
- Les tests de contrats doivent utiliser fixtures golden ou generation compatible.
- Les tests d'integration doivent utiliser un chemin realiste: transport -> use case -> domaine -> persistence si la couche est dans le scope.
- Les tests realtime doivent couvrir reconnect, duplicate input, late input, role interdit et no-leak.
- Les tests UI doivent couvrir loading, empty, error, stale/reconnect, denied et success.
- Les tests idempotence doivent executer la meme action au moins deux fois.

## Types de tests attendus

| Surface | Tests minimaux |
|---|---|
| Domaine | transitions autorisees/interdites, invariants, erreurs stables |
| Contrats | proto lint/generation, golden fixtures, compatibilite, champs sensibles absents |
| API/ConnectRPC | RBAC, validation, mapping erreurs, audit, idempotence |
| DB | migrations DB vide, contraintes, repositories, transactions |
| Realtime | auth live, reconnect, audience, late/duplicate input, desync |
| UI | etats visibles, boutons disabled/absents, erreurs actionnables, mobile sans overlap |
| Worker | claim concurrent, retry, idempotence, redaction logs |
| Observabilite | audit actor/entity/reason/correlationId, logs sans secrets |

## Niveaux de validation L0 a L6

| Niveau | Portee | Frontieres reelles exigees |
|---|---|---|
| L0 | Docs, contrats statiques, generation | liens, lint proto, golden, diff genere |
| L1 | Unit | fonction/module isole; mocks autorises hors sujet teste |
| L2 | Composant/service | use-case + domaine ou handler direct; nommer explicitement les frontieres mockees |
| L3 | Integration persistence | PostgreSQL/Redis reels et jetables; migrations, contraintes, transactions, concurrence |
| L4 | Integration transport | requete Connect/Hono reelle ou serveur/client Colyseus; auth, mapping erreurs, reconnexion |
| L5 | E2E systeme | navigateur + services reels + seed; aucun fallback local sur le parcours prouve |
| L6 | Recette monorepo | docs, generation, migration DB vide, unit, integration, E2E, typecheck, lint, build |

Un lot doit atteindre le plus haut niveau correspondant a ses AC. Par exemple, une correction de
repository exige L3; une reconnexion live exige L4; inscription -> room -> publication exige L5.

## Harness d'integration attendu

- une base ou un schema PostgreSQL unique par worktree;
- migrations appliquees depuis une DB vide avant les suites L3-L5;
- Redis namespace par worktree et nettoyage garanti;
- serveur Connect/Hono demarre sur un port isole;
- game-server demarre et client simule connecte pour les preuves realtime;
- Playwright configure avec tous les `webServer` requis et un seed deterministe;
- logs et artefacts conserves en cas d'echec, sans secrets.

Les scripts racine `test:unit`, `test:integration`, `test:e2e` et `test:all` sont fournis par SEQ-00.
Voir `docs/05-workflows/test-commands.md` pour commandes, timeouts, artefacts, isolation `WORKTREE_ID`
et diagnostic. Ne pas presenter une commande manuelle hors de ces scripts comme preuve d'integration.

## Definition de preuve

Pour chaque scenario:

1. Nommer la fiche sprint et l'ID du scenario.
2. Nommer le test ou la commande de validation.
3. Verifier au moins un resultat observable.
4. Verifier au moins un cas de refus si l'action est sensible.
5. Documenter tout risque non couvert.
6. Indiquer le niveau L0-L6 atteint et les frontieres volontairement mockees.
