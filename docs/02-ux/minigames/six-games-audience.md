# UX — Audience et etats des six mini-jeux signes

**Statut :** `APPROVED` (UX produit)  
**Version :** 1.0.0  
**Source de verite gameplay :** [rulebooks](../../01-product/rulebooks/README.md)  
**Matrice informationnelle :** [fairness-matrix.md](../../01-product/rulebooks/fairness-matrix.md)

## Ecrans minimaux par acteur

| Acteur | Voit | N'envoie jamais |
|---|---|---|
| Joueur | phase, timer public, HUD autorise, feedback local rulebook, etat reconnect | score adversaire non publie, secrets hors self, commandes admin |
| Partenaire / equipe | etat d'equipe autorise (ready, tour, score d'equipe provisoire si rulebook l'autorise) | secrets individuels hors partage explicite |
| Admin | supervision globale + individuelle lecture, evidence meta, commandes de manche hors gameplay | input joueur "a la place de" |
| Observateur | snapshots rediges, progression publique | toute commande competitive |
| Support | tickets, meta connexion, logs rediges | roles/votes en clair hors procedure |

## Etats UI obligatoires (chaque jeu)

`loading` · `empty` (attente adversaire/equipe) · `error` (code produit) · `reconnecting` · `disconnected_expired` · `playing` · `waiting_resolution` · `results_pending_publication` · `results_published` · `forfeit` · `void`

## Messages reconnexion

Toujours indiquer : place conservee ? input deja recu ? phase courante ? action requise ? contact support ?

## Accessibilite

Voir section accessibilite de chaque rulebook + principes transverses fairness-matrix §9.
