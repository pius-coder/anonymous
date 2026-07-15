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

## Definition de preuve

Pour chaque scenario:

1. Nommer la fiche sprint et l'ID du scenario.
2. Nommer le test ou la commande de validation.
3. Verifier au moins un resultat observable.
4. Verifier au moins un cas de refus si l'action est sensible.
5. Documenter tout risque non couvert.
