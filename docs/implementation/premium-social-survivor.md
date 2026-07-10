# Implémentation — Social Survivor Premium

Date : 2026-07-10  
Branche locale : `feature/premium-social-survivor-ui`

## 1. Principe d'intervention

Les plans et PRD ont été utilisés comme contexte, puis confrontés à la codebase réelle. Les décisions ont suivi la matrice suivante :

| État constaté | Décision |
|---|---|
| Composant stable et déjà cohérent | Conserver |
| Composant fonctionnel mais visuellement faible | Améliorer |
| Responsabilités mélangées ou état trop centralisé | Refactoriser |
| Module fragile recréant Pixi/les écouteurs à chaque input | Réécrire |
| Donnée privée placée dans un payload public | Retirer du payload public et cibler le client |

Le travail n'a pas modifié les flux monétaires. La livraison porte sur l'interface, le lobby social, les scènes PixiJS, les mini-jeux de référence, le spectateur et la console opérateur.

## 2. Design system premium

Le socle RetroUI reste en place. Une couche de matérialité premium a été ajoutée dans `apps/web/src/app/globals.css` :

- surfaces `base`, `raised`, `floating`, `overlay`, `critical` ;
- rayons continus et hiérarchisés ;
- bordures translucides ;
- reflets internes ;
- ombres de contact et ambiantes multicouches ;
- blur et saturation mesurés ;
- réduction automatique des mouvements ;
- safe areas mobile ;
- variante plus sobre pour les écrans administratifs.

Les primitives RetroUI `Button`, `Card` et `Input`, ainsi que les shells publics et administratifs, utilisent maintenant ces tokens.

## 3. Architecture du lobby social

```text
LiveRoomShell
├── SocialMapCanvas (PixiJS)
├── HudLayer
├── MiniGameSurface
├── SocialPanelHost (un seul panneau actif)
│   ├── PlayerProfilePanel
│   ├── GroupsPanel
│   ├── PlayersPanel
│   ├── ChatPanel
│   └── RequestsPanel
├── BottomNavigation
├── ReconnectBanner
└── EliminationOverlay
```

Les états de sélection, panneau actif, pair de discussion et expansion du mini-jeu restent locaux au client. Les positions, groupes publics et états de round viennent de la room.

## 4. Carte PixiJS

`SocialMapCanvas` :

- rendu différé de PixiJS ;
- destruction complète de l'application et des ressources ;
- ticker suspendu lorsque l'onglet est masqué ;
- interpolation des déplacements ;
- camps de groupe ;
- chefs, joueur local et joueur sélectionné mis en évidence ;
- sélection contextuelle limitée à 28 joueurs ;
- agrégation des joueurs masqués en clusters ;
- fallback DOM si PixiJS échoue.

La carte n'affiche donc pas 100 avatars simultanément. Elle priorise le joueur local, la cible sélectionnée, le groupe courant, les chefs et les joueurs proches.

## 5. Groupes et demandes

Le schéma Colyseus public expose uniquement :

- identifiant et nom du groupe ;
- chef ;
- membres ;
- capacité ;
- couleur et zone ;
- verrouillage.

Les demandes privées ne sont pas placées dans `LiveRoomState`. Elles utilisent des messages ciblés :

| Message | Portée |
|---|---|
| `social.requests` | joueur connecté/reconnecté |
| `social.request.created` | émetteur et destinataire |
| `social.request.updated` | émetteur et destinataire |
| `social.request.removed` | ancien destinataire lors d'un transfert de chef |

Actions implémentées : création, candidature, invitation, acceptation/refus, départ, transfert automatique du rôle de chef, verrouillage et expiration.

Règles serveur :

- deux candidatures simultanées maximum ;
- aucune candidature dupliquée ;
- capacité vérifiée côté serveur ;
- autorisation du chef vérifiée côté serveur ;
- mutations sociales bloquées pendant un round actif ;
- autres demandes expirées après l'adhésion d'un joueur.

## 6. Chat contextuel

Trois canaux UI sont disponibles : privé, groupe et système.

Le serveur cible les destinataires des messages privés et de groupe. Il vérifie le destinataire, l'appartenance au groupe et un cooldown. Les spectateurs éliminés ne peuvent pas envoyer de message joueur pendant un round actif, afin de limiter le soufflage.

Limite actuelle : le modèle Prisma existant enregistre le corps du message mais ne possède pas encore de colonnes `channel`, `targetUserId` et `groupId`. Le ciblage temps réel est correct, mais la reconstruction historique complète des fils devra faire l'objet d'une migration dédiée.

## 7. Rôle caché

Le payload public de `silent-vote` ne contient plus la liste des rôles. Le serveur :

1. calcule l'attribution à partir du round et des participants actifs ;
2. conserve l'attribution dans la room ;
3. envoie `role.assigned` uniquement au joueur concerné ;
4. renvoie ce message lors d'une reconnexion autorisée.

Le client affiche la carte de rôle uniquement au joueur actif. Le spectateur ne reçoit pas de rôle privé supplémentaire.

## 8. Mini-jeux et laboratoire

Les six familles sont représentées dans `/dev/ui` et le laboratoire social `/dev/social` permet :

- 12, 50 ou 100 joueurs simulés ;
- déplacement sur la carte ;
- clusters ;
- profils ;
- création et verrouillage de groupe ;
- candidatures et invitations ;
- chat privé/groupe/système ;
- round affiché au-dessus de la carte ;
- élimination et spectateur.

Les surfaces de référence présentes sont : mémoire, duel de réaction, pont de confiance, relais d'équipe, zones sûres, rayon balayeur PixiJS et vote silencieux.

## 9. Back-office

La console administrateur utilise le même langage visuel, avec une densité et une animation réduites :

- sidebar flottante ;
- topbar opérateur ;
- dashboard de métriques et d'états ;
- Program Builder avec cartes de rounds et funnel ;
- surfaces et contrôles alignés sur le design system global.

## 10. Éléments non présentés comme terminés

- Les 120 runtimes serveur ne sont pas implémentés ; le catalogue reste une cible paramétrable.
- La persistance DB des groupes sociaux, demandes et métadonnées de fils de chat n'est pas ajoutée dans cette livraison.
- Les sons utilisent un moteur Web Audio synthétique centralisé ; le sprite Howler et les 14 fichiers licenciés nécessitent les assets réels.
- Les validations complètes `pnpm typecheck`, `lint`, `test` et `build` doivent être relancées dans un environnement disposant des dépendances.

## 11. Commandes de validation à exécuter après installation

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Routes de contrôle en développement :

```text
/dev/ui
/dev/social
```
