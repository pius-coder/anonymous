# A-REALTIME - Sync round, reconnexion et snapshots

## Mission autonome

Apres SEQ-00/01/02, rendre le chemin realtime reel et autoritaire. Supprimer la dependance aux options
client pour la politique serveur et prouver la reconnexion par un serveur/client Colyseus.

## Ownership

`apps/game-server/**`, implementation RealtimeAccess, facade/composants web de `/room` et tests live.
Les routes observer sont reservees a B-OBSERVER; scoring/minigame sont hors scope.

## Interdit

Contrats, Prisma/migrations/seed, tooling racine, routeur central,
`apps/web/src/services/rpcServices.ts`, UI observer/admin scoring et workers.

## Demarrage obligatoire

Lire AGENTS, gap analysis sections live, sprints 09-11, analyse legacy live, architecture realtime et
contrats figes. Context7 : Colyseus, Phaser, ConnectRPC et Playwright.

## AC

- Timeout reconnect et max clients viennent de config serveur, pas des options du client.
- Room charge round/status/deadline depuis une source serveur et persiste les inputs acceptes.
- Nonce duplique, input tardif, role interdit et sequence stale sont refuses/idempotents.
- Reconnexion restaure l'etat autorise dans la fenetre et refuse apres expiration.
- Snapshots joueur/admin/readonly respectent audience et sont consommables sur transport.
- Le test live echoue si Colyseus est indisponible; l'apercu local est explicitement hors E2E.

## Tests et sortie

L3 persistence input/deadline, L4 `@colyseus/testing` join/reconnect/no-leak/desync, L5 navigateur room
reelle clavier/mobile. Validations completes, commit atomique et rapport; montage central par SEQ-03.
