# Architecture frontend prioritaire

## Couches UI

1. **Foundations**: tokens dark green, typographie, espaces, ombres, breakpoints et motion.
2. **RetroUI Base primitives**: composants installes depuis le registre officiel dans
   `apps/web/src/components/ui`.
3. **Product components**: lifecycle, connexion, player status, finance status, timeline, command rail.
4. **Shells par audience**: public, player, admin, observer, support et finance.
5. **Screens**: composition routee sans regle metier autoritaire.
6. **Pixi scenes**: room et mini-jeux; aucune navigation ou permission globale dans le canvas.
7. **Generated clients**: clients ConnectRPC par domaine et client Colyseus pour le live.

## Viewport et scroll

- `html`, `body` et le root occupent `100dvh` avec `overflow: hidden`.
- La navbar et le header restent dans le viewport.
- Le contenu principal utilise `min-height: 0` pour permettre les zones internes.
- Seuls `ScrollArea`, tables, listes et sheets peuvent defiler.
- Une page mobile ne doit pas creer un second scroll derriere une sheet ouverte.

## Navigation

- Desktop: navbar persistante, compacte et repliable.
- Mobile: navbar dans une Sheet; barre d'actions primaires adaptee au flow.
- Header: aucune bordure de carte, titre court a gauche, icones d'action a droite.
- L'audience determine le modele de navigation fourni au shell; les liens interdits ne sont pas rendus.

## Transports

- ConnectRPC: auth, sessions, participations, preparation, paiements, admin, scoring, support,
  compliance et notifications.
- Colyseus: presence live, mouvements, chat, groupes, inputs de mini-jeu, snapshots et reconnexion.
- Le browser ne lit jamais Prisma et ne reutilise pas les entites DB comme view models.

## RetroUI

- La variante Base UI est obligatoire car `components.json` pointe sur `@retroui-base`.
- Les primitives restent dans `components/ui`.
- Les composants produit restent hors de ce dossier.
- DataTable, DatePicker et Typography sont des patterns composes; ils ne sont pas de faux items du
  registre.

## Pixi

- Une scene est une classe ou fonction de cycle de vie: `preload -> mount -> update -> resize -> destroy`.
- `Application.init({ resizeTo: container })` adapte le renderer au panneau.
- `Assets.addBundle()` et `Assets.loadBundle()` chargent seulement les bundles necessaires sans
  reinitialiser le cache global lors de chaque montage.
- Les scenes separent public state, player private state et observer state.
- Les textures, listeners et tickers sont detruits au demontage.

## Gates avant reprise de la roadmap

- Tous les shells et flows ont une route et un etat responsive.
- Les services HTTP du web utilisent les descriptors generes.
- Le live conserve une source de verite Colyseus.
- Le kit RetroUI est demonstrable dans une route de dev protegee.
- Les parcours critiques sont couverts en E2E.
