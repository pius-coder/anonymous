# Feature 17 - Fondation design system gaming (RetroUI + Motion)

## Objectif sprint

Poser l identite visuelle gaming du produit avec RetroUI par-dessus le socle shadcn/Tailwind v4 existant, plus les primitives d animation, sans casser les pages Feature 01.

## Decisions non negociables

- RetroUI est integre en mode copy-paste dans `apps/web/src/components/retroui/`.
- Le socle shadcn existant (`components/ui/`) reste fonctionnel pendant la migration.
- Police locale uniquement. Aucun appel Google Fonts au build.
- Police display retro pour titres/boutons seulement ; police lisible systeme pour regles, montants XAF et textes legaux.
- Le wording public reste soumis aux interdits Feature 01.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` passent avant merge.

## Gate documentaire obligatoire

1. Context7 : Next.js 16 App Router, fonts locales, metadata, client/server components.
2. Context7 ou docs officielles RetroUI : composants via CLI shadcn ou copie manuelle, Tailwind v4.
3. Context7 : Motion, `AnimatePresence`, `useReducedMotion`.
4. Tester sur branche : ajout d un composant RetroUI et build sans reseau.

## User stories

### Story 17.1 - Integration RetroUI

Copier Button, Card, Badge, Input, Dialog, Progress, Tabs, Avatar, Alert, Label et les composants necessaires aux pages publiques. Ajouter tokens theme, police locale, images produit generees et `/dev/ui` bloque en production.

### Story 17.2 - Primitives d animation

Installer `motion` et creer `PhaseTransition`, `CountdownRing`, `EliminationOverlay`, `ScorePop`, avec respect de `prefers-reduced-motion`.

### Story 17.3 - Migration des pages existantes

Migrer landing, catalogue, detail session, notifications, admin dashboard et layout vers RetroUI avec layout global unifie. Re-scan wording interdit.

## Definition of Done

RetroUI operationnel, pages publiques migrees, primitives animation testees, build offline OK, E2E Feature 01 vert.
