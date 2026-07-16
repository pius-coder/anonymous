# Inventaire Figma-like des interfaces et composants

Ce document est le contrat de composition UI. Il remplace l'idee d'un sprint UI isole: le systeme
de design est une fondation transversale, et chaque sprint metier doit reutiliser ces primitives et
leurs etats.

## Foundations

| Fondation   | Decision                                                                      |
| ----------- | ----------------------------------------------------------------------------- |
| Theme       | Dark par defaut, vert Noya; aucun bleu generique de template                  |
| Viewport    | `100dvh`, document non scrollable, scroll interne explicite                   |
| Header      | Sans bordure, titre a gauche, recherche/notifications/profil a droite         |
| Navigation  | Sidebar persistante desktop, Sheet mobile, liens filtres par audience         |
| Forme       | Bordure dure, petite rondeur, ombre offset RetroUI                            |
| Typographie | Head monospace retro, body systeme lisible                                    |
| Avatar      | `minidenticons` pour les comptes; sprites Phaser pour la presence dans une room |
| Motion      | 120-200 ms; respect de `prefers-reduced-motion`                               |

## Primitives RetroUI disponibles

Toutes les primitives installables du registre officiel RetroUI Base sont dans
`apps/web/src/components/ui`. `DataTable` et `Typography` sont des patterns composes, pas de faux
items de registre.

| Groupe      | Primitives                                                                          | Usage attendu                            |
| ----------- | ----------------------------------------------------------------------------------- | ---------------------------------------- |
| Actions     | Button, ButtonGroup, Toggle, ToggleGroup, Kbd                                       | CTA, commandes live, raccourcis          |
| Formulaires | Field, Label, Input, InputGroup, InputOTP, Textarea, Select, NativeSelect, Combobox | Auth, creation session, filtres, finance |
| Choix       | Checkbox, RadioGroup, Switch, Slider, Calendar                                      | Preferences, RBAC, planification         |
| Navigation  | Sidebar, NavigationMenu, Menubar, Breadcrumb, Pagination, Command                   | Shells, listes longues, palette          |
| Overlays    | Sheet, Drawer, Dialog, AlertDialog, Popover, HoverCard, Tooltip, ContextMenu        | Detail, mobile, confirmation, aide       |
| Contenu     | Card, Item, Table, Badge, Avatar, AspectRatio, Carousel                             | Dashboards, catalogues, joueurs          |
| Etats       | Alert, Sonner, Progress, Spinner, Skeleton, Empty                                   | Chargement, erreur, succes, progression  |
| Structure   | Tabs, Accordion, Collapsible, Separator, ScrollArea, Resizable, Direction           | Densite et panneaux internes             |

## Matrice des ecrans

| Audience      | Route                           | Interface                     | Composants principaux                       | Sheet/Dialog            | Service                 |
| ------------- | ------------------------------- | ----------------------------- | ------------------------------------------- | ----------------------- | ----------------------- |
| Public        | `/`                             | Landing et prochaines parties | Hero media, Button, Badge, liste parties    | Aucun                   | SessionService          |
| Public        | `/auth/login`                   | Connexion                     | Card, Field, Input, Checkbox, Alert, Button | Reset separe            | IdentityService         |
| Public        | `/auth/register`                | Creation compte               | Card, Input, Checkbox, Alert                | Conditions via Dialog   | IdentityService         |
| Public/Joueur | `/parties`                      | Catalogue filtrable           | Tabs, Input, Card, Progress, Badge          | Detail par route        | SessionService          |
| Public/Joueur | `/parties/[code]`               | Detail et reservation         | Card, Progress, Button                      | Confirmation paiement   | Participation + Payment |
| Joueur        | `/account`                      | Profil et session             | Avatar, Item, Button                        | Deconnexion             | IdentityService         |
| Joueur        | `/parties/[code]/participation` | Statut inscription            | Lifecycle, Alert, Button                    | Annulation              | ParticipationService    |
| Joueur        | `/parties/[code]/payment`       | Paiement participation        | Card, RadioGroup, Alert, Button             | Confirmation paiement   | PaymentService          |
| Joueur        | `/parties/[code]/lobby`         | Presence et readiness         | Lifecycle, Item, Button                     | Confirmation ready      | PreparationService      |
| Joueur        | `/me/tickets`                   | Tickets et prochain CTA       | Card, Badge, Button                         | Detail ticket           | ParticipationService    |
| Joueur        | `/me/wallet`                    | Solde et ledger               | Card, Table, Badge                          | Depot/retrait           | PaymentService          |
| Joueur        | `/me/notifications`             | Boite de reception            | Card, Badge, Button                         | Detail message          | NotificationService     |
| Joueur        | `/parties/[code]/room`          | Room sociale 2D plein ecran   | Phaser, camera, mini-carte, HUD, joystick   | Joueurs/chat/parametres | LiveAccess + Colyseus   |
| Joueur        | `/parties/[code]/round`         | Briefing et manche            | Lifecycle, Progress, Alert                  | Regles                  | RoundService            |
| Joueur        | `/parties/[code]/waiting`       | Verification                  | PageState, Lifecycle                        | Aucun score provisoire  | RoundService            |
| Joueur        | `/parties/[code]/results`       | Classement publie             | Card, Avatar, Badge, confetti               | Partage                 | ScoringService          |
| Admin         | `/admin`                        | Dashboard operationnel        | MetricCard, Table, Card                     | Fiche session en Sheet  | AdminService            |
| Admin         | `/admin/parties`                | Gestion sessions              | DataTable compose, Input, Badge             | Detail en Sheet         | Session + Admin         |
| Admin         | `/admin/parties/[id]/control`   | Command center                | Form, ButtonGroup, Lifecycle                | Confirmations sensibles | Round + Preparation     |
| Admin         | `/admin/minigames`              | Manifestes runtime            | Card, Badge, Button                         | Configuration           | MiniGameService         |
| Support       | `/support`                      | File d'assistance             | MetricCard, Card, Badge                     | Dossier support         | Admin read models       |
| Support       | `/admin/users`                  | Annuaire comptes              | DataTable, Avatar, Switch                   | Compte en Sheet         | Identity/Admin          |
| Finance       | `/finance`                      | Dashboard finance             | MetricCard, Table                           | Anomalie                | PaymentService          |
| Finance       | `/admin/payments`               | Transactions                  | Table, Badge, filtre                        | Transaction             | PaymentService          |
| Finance       | `/admin/wallets`                | Portefeuilles                 | Table, Input, Badge                         | Ecritures               | PaymentService          |
| Super admin   | `/super-admin`                  | Gouvernance                   | MetricCard, Card                            | Actions a haut impact   | AdminService            |
| Super admin   | `/admin/audit`                  | Journal immuable              | Table, Input, Badge                         | Detail evenement        | Audit read model        |
| Super admin   | `/admin/compliance`             | Controles                     | Card, Progress, Badge                       | Preuves                 | Compliance read model   |
| Observateur   | `/observe/parties/[id]`         | Snapshot readonly             | Lifecycle, ReadonlyBadge, Card              | Aucun controle          | Readonly snapshot       |

## Etats obligatoires par ecran

Chaque ecran connecte doit composer au minimum les variantes `loading`, `empty`, `error`, `denied`
et `ready`. Les commandes ont en plus `pending`, `success`, `rejected`, `duplicate` et `offline`.

## Regles des Sheets et Dialogs

- Sheet: consultation ou edition contextuelle qui conserve la liste en arriere-plan.
- Drawer: action mobile courte ou panneau ancre en bas.
- Dialog: choix non destructif qui bloque temporairement le flow.
- AlertDialog: confirmation destructive ou financiere, avec consequence explicite.
- Une Sheet mobile verrouille le scroll de l'arriere-plan et possede sa propre zone `ScrollArea`.
