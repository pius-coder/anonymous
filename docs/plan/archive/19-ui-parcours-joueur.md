# Feature 19 - UI parcours joueur

## Objectif sprint

Brancher l UI RetroUI sur les contrats API existants : auth, inscription, paiement, wallet, profil.

## Dependances

- Feature 17.
- API existante.

## Gate documentaire obligatoire

1. Context7 Next.js 16 : cookies, redirects, formulaires, server/client components.
2. Verifier le partage du cookie de session API entre web et API.

## User stories

### Story 19.1 - Pages auth

Creer `/auth/register`, `/auth/login`, `/auth/forgot-password`, `/auth/reset-password`, mapper les erreurs API en FR, supporter `?next=`, afficher l etat connecte dans le header.

### Story 19.2 - Inscription + paiement

Sur detail session connecte, appeler l inscription, afficher policy no-show/remboursement, gerer paiement Fapshi ou wallet, page retour paiement et annulation pending.

### Story 19.3 - Wallet et profil

Creer `/wallet`, `/me`, historique et stats, sans promesse de retrait argent reel.

## Definition of Done

Parcours visiteur -> compte -> inscription -> paiement wallet -> PAID jouable en E2E.
