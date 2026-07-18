# P-C-QA - Navigateurs, accessibilite et performance

## Mission autonome

Prouver la qualite visible du parcours commercial et des six jeux sur la matrice appareils/navigateurs,
avec accessibilite et budgets performance mesurables.

## Prerequis et lectures

- P-C-PLATFORM merge; P-SEQ-06 merge; six renderers et parcours coeur disponibles.
- Lire UX, architecture frontend, rulebooks, assets et support matrix a approuver.
- Context7 : Playwright, Next.js, Phaser/renderer utilise et outils accessibilite/performance.

## Ownership

`tests/quality/**`, fixtures, device/browser matrix, audits a11y/performance, budgets et rapport. Les
modifications de configuration Playwright/racine sont composees par P-SEQ-07; les corrections UI
retournent aux lots proprietaires.

## Interdit

Chrome desktop seul, screenshot comme unique AC, desactivation d'une assertion flaky, signal seulement
couleur/audio/mouvement, test local preview pour valider le live.

## Livrables production

- matrice Chrome/Firefox/WebKit et mobile/tablette supportes;
- clavier, tactile, focus, lecteur ecran, contraste, zoom, reduced motion et annonces live;
- tests complets register/Fapshi/lobby/live/six jeux/resultats/support;
- budgets LCP/INP/CLS, JS/assets, memoire renderer, tick/patch et reseau mobile;
- etats loading/empty/error/offline/reconnect et internationalisation/fuseau;
- captures/traces/videos uniquement sans secrets.

## Criteres d'acceptation

- aucun blocker WCAG cible sur parcours critique;
- les six jeux restent jouables au clavier et tactile avec alternative multimodale;
- aucun overlap/scroll interdit en room mobile et reconnexion est actionnable;
- budgets performance passent sur artefact production et reseau contraint;
- flakes sont mesures, proprietaires et sous seuil, jamais masques par retries illimites.

## Tests et sortie

Playwright multi-browser/device sur build production, axe/manual screen-reader, Lighthouse/Web Vitals et
profil renderer. Rapport QA signe, gates lot et commit atomique.
