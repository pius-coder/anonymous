# Fiches APEX production

Ces fiches prolongent la reconstruction v0.1. Elles ne remplacent pas les fiches historiques
`sequential/`, `wave-a/` et `wave-b/` qui prouvent la baseline de reconstruction.

## Statut initial

Toutes les fiches de ce dossier sont **A FAIRE** au 2026-07-16. Un fichier present ne signifie pas que
sa feature est implementee.

## Ordre

1. `sequential/P-SEQ-00` a `P-SEQ-03`;
2. les douze fiches `wave-a/` dans les dependances indiquees, puis `P-SEQ-04`;
3. `P-SEQ-05`, puis les six fiches `wave-b/`, puis `P-SEQ-06`;
4. WAVE-C : `PLATFORM | LEGAL`, puis `DATA | SECURITY | OBSERVABILITY | QA`, puis `SCALE`, puis
   `OPERATIONS`;
5. `P-SEQ-07`, `P-SEQ-08` et `P-SEQ-09`.

## Contrat commun a chaque fiche

- feature production verticale ou capacite d'exploitation executable;
- ownership explicite et surfaces partagees reservees aux jalons sequentiels;
- aucune valeur hardcodee/fallback local/provider factice sur le flux normal;
- Context7 pour toute bibliotheque et documentation officielle Fapshi;
- tests par niveau avec DB/Redis/transport/provider/navigateur reels quand ils sont dans l'AC;
- logs sans secrets, telemetrie, erreurs actionnables et runbook associe;
- commit atomique, rapport des commandes, risques residuels et worktree propre.

Un besoin de contrat ou schema decouvert apres freeze retourne a P-SEQ-02/P-SEQ-03. Le nouveau hash
est fige et tous les descendants affectes sont revalides avant reprise.

Les mocks L1 n'autorisent jamais a marquer une AC d'integration comme terminee.
