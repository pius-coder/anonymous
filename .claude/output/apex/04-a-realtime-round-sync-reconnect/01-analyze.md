# Analyze — A-REALTIME

## Constat initial

- Branche `apex/a-realtime`, worktree `/home/afreeserv/worktrees/anonymous/a-realtime`
- Base `43a424b` (SEQ-00/01/02 + worktree hygiene)
- Game-server existant partiel : handlers, reconnexion, snapshots, mais politique partiellement client-driven
- E2E room = aperçu local ; live-smoke L5 présent
- Aucun `@colyseus/testing` ; tests live mockaient DB et appelaient handlers sans transport

## Gaps AC

1. `reconnectTimeout` / max clients lus depuis options client
2. Round/status/deadline injectables via join options
3. Inputs non persistés / nonce non idempotent en DB
4. Pas de L4 serveur/client Colyseus
5. Aperçu local confondu avec preuve E2E live
