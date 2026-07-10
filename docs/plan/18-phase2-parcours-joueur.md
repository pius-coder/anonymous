# PHASE 2 — LE PARCOURS JOUEUR
## Auth → Inscription → Paiement → Lobby → Live → Mini-jeux → Résultats

> Fichier cible : `docs/plan/18-phase2-parcours-joueur.md`
> Prérequis : Phase 1 verte (design system, juice, boucle de rounds serveur, runtimes).

---

# PARTIE A — ARCHITECTURE TRANSVERSE DE LA PHASE

## A.1 Le problème n°1 à trancher AVANT tout : le cookie de session

L'API Hono (port 3001) pose le cookie ; le web Next (port 3000) doit le porter. **Décision imposée** : proxy via rewrites Next → même origine, zéro problème CORS/SameSite :

```ts
// apps/web/next.config.ts
const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${process.env.API_URL ?? "http://localhost:3001"}/v1/:path*` }];
  },
};
```

Tout le client web appelle `/api/v1/...` (même origine). Le WebSocket Colyseus, lui, se connecte directement à l'endpoint retourné par la réservation (il porte son propre token, pas le cookie).

## A.2 Client API unique

`apps/web/src/lib/api.ts` : wrapper `fetch` typé — `credentials: "include"`, parse `{ data } | { error: { code, message } }`, map des codes d'erreur → messages FR dans `lib/errors.fr.ts` (UN SEUL dictionnaire pour toute l'app : `EMAIL_ALREADY_USED`, `SESSION_FULL`, `INSUFFICIENT_FUNDS`, `JOIN_TOKEN_EXPIRED`, ~25 codes relevés dans les routes existantes).

## A.3 Gate documentaire Phase 2

1. Context7 `colyseus.js` 0.17 : `Client`, `joinOrCreate(room, options)`, `room.onStateChange`, `room.onMessage`, `client.reconnect(reconnectionToken)`.
2. Context7 Next 16 : `useRouter`, Server Actions vs client fetch (décision : client fetch via proxy, Server Components pour les lectures publiques), `next/dynamic`.
3. Docs canvas-confetti.

## A.4 Sprints

| Sprint | Contenu | Durée |
|---|---|---|
| **2A** | Drawer auth + pages auth + header connecté + `?next=` | 3 j |
| **2B** | Drawer inscription 3 étapes + paiement Fapshi/wallet + page retour + `/me/sessions` | 4 j |
| **2C** | Wallet + ledger + profil + historique + notifications | 3 j |
| **2D** | Lobby immersif + `useGameRoom` (Colyseus) + écrans de phase + reconnexion | 5 j |
| **2E** | UI des 3 mini-jeux + mode spectateur + kill-feed + résultats/podium | 5 j |

---

# PARTIE B — SPÉCIFICATION PAR SPRINT (condensée, les layouts détaillés ont déjà été livrés)

## Sprint 2A — Auth
- `components/auth/AuthDrawer.tsx` : `Drawer` (mobile) / `Dialog` (desktop, breakpoint `md`), `Tabs` Connexion/Inscription, champs `Field+Input`, erreurs sous champ, rate-limit → `Alert` avec `resetAt`. S'ouvre depuis n'importe quel CTA protégé sans quitter la page (`?next=` conservé).
- Pages fallback `/auth/*` (accès direct, reset password).
- `useSession()` hook : `GET /api/v1/me` (SWR simple maison), expose `user | null`, consommé par le header et la bottom-nav.
- **Tests** : E2E register→login→logout, next= respecté, drawer sur détail session.

## Sprint 2B — Inscription & paiement
- `RegisterDrawer` 3 étapes (`Progress` en haut) : Récap+politique → `Radio Group` Fapshi/Wallet (wallet désactivé+`Tooltip` si solde insuffisant) → Confirmation. IdempotencyKey générée client (`crypto.randomUUID()`), bouton verrouillé après clic.
- Fapshi : `initiate` → `window.location = checkoutUrl` ; retour sur `/payments/[id]/status` → polling 3s de `GET /payments/:id/status`, 4 états visuels, deadline visible, annulation via `Alert Dialog`.
- `/me/sessions` : `Tabs` À venir/En cours/Terminées, badges statut, action contextuelle (Payer→drawer, Lobby, Résultats).
- **Tests** : E2E inscription→pending→PAID (webhook simulé), double-clic = 1 seule inscription, SESSION_FULL/ALREADY_REGISTERED affichés.

## Sprint 2C — Wallet & profil
Conforme aux specs déjà livrées (hero solde + `AnimatedNumber`, ledger cursor, retrait désactivé V1 ; profil = Sheet édition, stats KPI, historique). **Tests** : ownership, pagination, alignement ledger.

## Sprint 2D — Lobby & client live

**`useGameRoom`** — le hook central (squelette normatif) :

```ts
// apps/web/src/lib/useGameRoom.ts
"use client";
import { Client, Room } from "colyseus.js";
import { useEffect, useRef, useState } from "react";

export type LiveSnapshot = {
  phase: string; roundNum: number; deadlineEpochMs: number; currentRoundId: string;
  players: Array<{ userId: string; displayName: string; connectionStatus: string; role: string; submittedAction: boolean }>;
};
type Status = "connecting" | "connected" | "reconnecting" | "ended" | "error";

export function useGameRoom(sessionId: string) {
  const roomRef = useRef<Room | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [snap, setSnap] = useState<LiveSnapshot | null>(null);
  const [lastMessage, setLastMessage] = useState<{ type: string; data: unknown } | null>(null);

  useEffect(() => {
    let disposed = false;
    (async () => {
      // 1. join-token → 2. réservation → 3. join WS
      const jt = await fetch(`/api/v1/sessions/${sessionId}/join-token`, { credentials: "include" }).then(r => r.json());
      const res = await fetch(`/api/v1/live/sessions/${sessionId}/reservation`, {
        method: "POST", credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ joinToken: jt.data.joinToken.token }),
      }).then(r => r.json());

      const client = new Client(res.data.websocket.endpoint);
      const room = await client.joinOrCreate(res.data.websocket.roomName, res.data.websocket.options);
      if (disposed) { room.leave(); return; } // StrictMode double-mount
      roomRef.current = room;
      sessionStorage.setItem(`reconn:${sessionId}`, room.reconnectionToken);
      setStatus("connected");

      room.onStateChange((s) => setSnap(serializeState(s)));
      for (const t of ["joined","round.started","round.resolved","you.eliminated","sequence.show","question.next","signal","action.accepted","action.rejected","session.finished"]) {
        room.onMessage(t, (data) => setLastMessage({ type: t, data }));
      }
      room.onLeave(async (code) => {
        if (code === 1000) { setStatus("ended"); return; }
        setStatus("reconnecting"); // fenêtre 30s serveur
        try {
          const r2 = await client.reconnect(sessionStorage.getItem(`reconn:${sessionId}`)!);
          roomRef.current = r2; setStatus("connected"); /* re-attacher les handlers */
        } catch { setStatus("error"); }
      });
    })().catch(() => setStatus("error"));
    return () => { disposed = true; roomRef.current?.leave(); };
  }, [sessionId]);

  return { status, snap, lastMessage, send: (type: string, data: unknown) => roomRef.current?.send(type, data) };
}
```

⚠️ Gate documentaire : noms exacts (`reconnectionToken`, `client.reconnect`) à confirmer sur la version installée.

**`GameShell`** — layout live unique (toutes les phases et tous les jeux vivent dedans) :

```
┌─ HUD ────────────────────────────────────────┐
│ Round 2/5   [CountdownRing]   👥12   🔇      │
├──────────────────────────────────────────────┤
│              <children = surface>            │  ← plein écran, 100dvh
├─ Bande joueurs (Scroll-Area horizontale) ────┤
│ [Av✓][Av⚡][Av💀][Av…]                        │
└──────────────────────────────────────────────┘
```

Overlays gérés par le shell : BRIEFING (`Dialog` non fermable), RESOLVING (spinner tension + `tension_loop`), PAUSED, bandeau reconnexion, `EliminationOverlay` sur `you.eliminated`.
**Tests 2D** : lobby PAID-only, check-in idempotent (+ `juice.unlock()` dans le handler !), refresh navigateur → reconnexion, transitions pilotées serveur uniquement.

## Sprint 2E — Mini-jeux, spectateur, résultats
- Les 3 surfaces de jeu ci-dessous (Partie C) branchées sur `useGameRoom` (`lastMessage` + `send`).
- Spectateur : mêmes surfaces en mode `readOnly` + leaderboard/kill-feed selon la famille (tableau normatif Phase 1).
- Résultats : podium Motion + confetti si gagnant + `AnimatedNumber` crédits + détail par round (`Collapsible`).
- **Test roi reconduit** : rien de sensible dans ce que reçoit le client avant résolution.

---

# PARTIE C — CODE DES 3 INTERFACES DE MINI-JEUX

> Conventions communes : composants client autonomes et démontables sur `/dev/ui` (props simulables), mobile-first (`100dvh`, zones tactiles ≥ 64px), desktop centré, **aucun scoring local** — ils affichent, envoient des actions, et réagissent aux événements serveur. Les endroits où le WS se branche sont marqués `// WS:`.

---

## C.1 — SOLO : Séquence mémoire (`memory-sequence`)

Logique respectée (catalogue §1.1 + runtime Phase 1) : le serveur envoie `sequence.show { steps }` → phase WATCH (tuiles s'allument une à une, **inputs verrouillés**) → phase INPUT (le joueur reproduit, chaque tuile pressée s'empile) → envoi `sequence-input { steps }` avec nonce → le serveur répond soit un nouveau `sequence.show` (niveau +1), soit `action.accepted` final (échec → score figé).

```tsx
// apps/web/src/components/games/MemorySequenceGame.tsx
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { juice } from "@/lib/juice";

const TILES = [
  { id: 0, color: "var(--arena-pink)",  label: "Rose"  },
  { id: 1, color: "var(--arena-teal)",  label: "Teal"  },
  { id: 2, color: "var(--arena-gold)",  label: "Or"    },
  { id: 3, color: "var(--arena-green)", label: "Vert"  },
] as const;

type Phase = "IDLE" | "WATCH" | "INPUT" | "SENT" | "FAILED";

type Props = {
  /** WS: steps reçus via message "sequence.show" */
  incomingSequence: number[] | null;
  /** WS: envoi de l'action { type:"sequence-input", nonce, payload:{ steps } } */
  onSubmit: (steps: number[]) => void;
  level: number;                 // = serverScore renvoyé par action.accepted
  showSpeedMs?: number;          // depuis config du round (défaut 600)
  readOnly?: boolean;            // mode spectateur
};

export function MemorySequenceGame({ incomingSequence, onSubmit, level, showSpeedMs = 600, readOnly }: Props) {
  const [phase, setPhase] = useState<Phase>("IDLE");
  const [litTile, setLitTile] = useState<number | null>(null);
  const [input, setInput] = useState<number[]>([]);
  const seqLen = useRef(0);

  /* ---- Phase WATCH : rejouer la séquence reçue du serveur ---- */
  useEffect(() => {
    if (!incomingSequence) return;
    seqLen.current = incomingSequence.length;
    setInput([]);
    setPhase("WATCH");
    let i = 0;
    const play = () => {
      if (i >= incomingSequence.length) { setLitTile(null); setPhase(readOnly ? "IDLE" : "INPUT"); return; }
      setLitTile(incomingSequence[i]);
      juice.play("countdown_tick");
      setTimeout(() => { setLitTile(null); i += 1; setTimeout(play, 160); }, showSpeedMs);
    };
    const t = setTimeout(play, 500);
    return () => clearTimeout(t);
  }, [incomingSequence, showSpeedMs, readOnly]);

  /* ---- Phase INPUT : le joueur reproduit ---- */
  const press = useCallback((tileId: number) => {
    if (phase !== "INPUT" || readOnly) return;
    juice.vibrate("tap");
    setLitTile(tileId);
    setTimeout(() => setLitTile(null), 180);
    const next = [...input, tileId];
    setInput(next);
    if (next.length === seqLen.current) {
      setPhase("SENT");                 // verrouille immédiatement (anti double-submit UI)
      onSubmit(next);                   // WS: le serveur juge ; il répondra sequence.show OU fin
    }
  }, [phase, input, onSubmit, readOnly]);

  return (
    <div className="game-surface flex h-full min-h-0 flex-col items-center justify-center gap-6 p-4">
      {/* Bandeau d'état — jamais de score calculé localement, `level` vient du serveur */}
      <div className="flex items-center gap-4">
        <span className="font-head text-lg text-muted-foreground">NIVEAU</span>
        <span className="font-head text-4xl text-[--arena-gold]">{level}</span>
      </div>

      <p className="font-head text-xl tracking-wide text-center" aria-live="polite">
        {phase === "WATCH"  && <span className="text-[--arena-teal]">👁 REGARDE…</span>}
        {phase === "INPUT"  && <span className="text-[--arena-pink]">✋ REPRODUIS ({input.length}/{seqLen.current})</span>}
        {phase === "SENT"   && <span className="text-muted-foreground">VÉRIFICATION…</span>}
        {phase === "FAILED" && <span className="text-[--arena-danger]">RATÉ !</span>}
        {phase === "IDLE"   && <span className="text-muted-foreground">EN ATTENTE DU SERVEUR…</span>}
      </p>

      {/* Grille 2×2 — mobile: pleine largeur ; desktop: bornée */}
      <div className="grid w-full max-w-[min(90vw,420px)] grid-cols-2 gap-3 md:gap-4 aspect-square">
        {TILES.map((tile) => {
          const lit = litTile === tile.id;
          return (
            <motion.button
              key={tile.id}
              type="button"
              aria-label={tile.label}
              disabled={phase !== "INPUT" || readOnly}
              onPointerDown={() => press(tile.id)}
              whileTap={{ scale: 0.94 }}
              className="border-4 border-border shadow-md select-none touch-manipulation
                         disabled:cursor-not-allowed"
              style={{
                backgroundColor: tile.color,
                filter: lit ? "brightness(1.6) saturate(1.3)" : phase === "WATCH" ? "brightness(0.45)" : "brightness(0.85)",
                boxShadow: lit ? `0 0 32px ${tile.color}` : undefined,
                transition: "filter 120ms, box-shadow 120ms",
              }}
            />
          );
        })}
      </div>

      {/* Pastilles de progression de la saisie */}
      <div className="flex gap-2 h-3">
        {Array.from({ length: seqLen.current }).map((_, i) => (
          <div key={i} className="size-3 border-2 border-border"
               style={{ backgroundColor: i < input.length ? "var(--arena-green)" : "var(--muted)" }} />
        ))}
      </div>
    </div>
  );
}
```

---

## C.2 — DUEL : Réaction pure (`pure-reaction-duel`) — *la plus délicate*

Logique respectée (catalogue §2.2 + runtime) : le serveur envoie `signal { atEpochMs? } ` quand le signal part (horodaté serveur) ; **taper avant = faux départ** (le serveur pénalise, l'UI l'affiche mais ne décide pas) ; le client envoie `reaction-click` avec son timestamp local, la correction de latence est serveur. Écran scindé toi/adversaire, best-of-N (`roundsToWin` depuis la config).

```tsx
// apps/web/src/components/games/ReactionDuelGame.tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { juice } from "@/lib/juice";

type DuelPhase = "WAIT" | "ARMED" | "SIGNAL" | "LOCKED";
// WAIT   = repos entre manches | ARMED = "ne touche pas encore" (fond danger)
// SIGNAL = GO serveur reçu     | LOCKED = j'ai tapé, j'attends le verdict serveur

type MancheResult = { winnerUserId: string | null; yourMs: number | null; oppMs: number | null; falseStart?: string };

type Props = {
  you: { userId: string; name: string };
  opponent: { userId: string; name: string };
  /** WS: true quand le message "signal" arrive ; repasse à false entre les manches */
  signalOn: boolean;
  /** WS: passe à true quand "manche.armed" arrive (phase d'attente aléatoire serveur) */
  armed: boolean;
  /** WS: dernier verdict de manche reçu du serveur */
  lastResult: MancheResult | null;
  /** scores de manches — viennent du serveur, jamais calculés ici */
  score: { you: number; opp: number };
  roundsToWin: number; // config
  onTap: () => void;   // WS: send "action" { type:"reaction-click", nonce, payload:{ clientTs: Date.now() } }
  readOnly?: boolean;
};

export function ReactionDuelGame({ you, opponent, signalOn, armed, lastResult, score, roundsToWin, onTap, readOnly }: Props) {
  const [phase, setPhase] = useState<DuelPhase>("WAIT");

  /* Machine d'affichage pilotée par les props serveur */
  useEffect(() => { if (armed) setPhase("ARMED"); }, [armed]);
  useEffect(() => {
    if (signalOn && phase === "ARMED") { setPhase("SIGNAL"); juice.play("signal_go"); juice.vibrate("tap"); }
  }, [signalOn, phase]);
  useEffect(() => { if (lastResult) setPhase("WAIT"); }, [lastResult]);

  const tap = useCallback(() => {
    if (readOnly || phase === "WAIT" || phase === "LOCKED") return;
    // Taper en ARMED = faux départ : on ENVOIE quand même, le SERVEUR juge (jamais l'UI)
    setPhase("LOCKED");
    if (phase === "ARMED") juice.vibrate("error");
    onTap();
  }, [phase, onTap, readOnly]);

  const bg =
    phase === "SIGNAL" ? "var(--arena-safe)" :
    phase === "ARMED"  ? "var(--arena-danger)" :
    "var(--arena-ink)";

  const Pips = ({ n }: { n: number }) => (
    <div className="flex gap-1.5">
      {Array.from({ length: roundsToWin }).map((_, i) => (
        <div key={i} className="size-3 border-2 border-border"
             style={{ backgroundColor: i < n ? "var(--arena-gold)" : "transparent" }} />
      ))}
    </div>
  );

  return (
    /* Toute la surface est la zone de tap — mobile ET desktop */
    <button
      type="button"
      onPointerDown={tap}
      disabled={readOnly}
      className="relative flex h-full w-full flex-col touch-manipulation select-none outline-none"
      style={{ backgroundColor: bg, transition: "background-color 80ms" }}
      aria-label="Zone de réaction — tape dès que l'écran devient vert"
    >
      {/* Moitié adversaire (haut mobile / gauche desktop) */}
      <div className="flex flex-1 flex-col items-center justify-center gap-2 md:absolute md:left-0 md:top-0 md:h-full md:w-1/3">
        <div className="size-14 border-4 border-border bg-secondary font-head text-xl flex items-center justify-center text-secondary-foreground">
          {opponent.name.slice(0, 2).toUpperCase()}
        </div>
        <span className="font-head text-sm text-foreground/80">{opponent.name}</span>
        <Pips n={score.opp} />
        {lastResult?.oppMs != null && <span className="font-mono text-xs text-foreground/60">{lastResult.oppMs} ms</span>}
      </div>

      {/* Centre : consigne géante */}
      <div className="pointer-events-none flex flex-[2] items-center justify-center md:absolute md:inset-0">
        <AnimatePresence mode="wait">
          <motion.span
            key={phase + String(lastResult?.winnerUserId ?? "")}
            initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ type: "spring", damping: 14 }}
            className="px-6 text-center font-head text-4xl md:text-7xl text-white drop-shadow-[3px_3px_0_var(--border)]"
          >
            {phase === "WAIT" && !lastResult && "PRÉPARE-TOI"}
            {phase === "WAIT" && lastResult && (
              lastResult.falseStart === you.userId ? "FAUX DÉPART !" :
              lastResult.winnerUserId === you.userId ? "MANCHE GAGNÉE ✔" : "MANCHE PERDUE"
            )}
            {phase === "ARMED"  && "ATTENDS…"}
            {phase === "SIGNAL" && "GO ! TAPE !"}
            {phase === "LOCKED" && "…"}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Moitié joueur (bas mobile / droite desktop) */}
      <div className="flex flex-1 flex-col items-center justify-center gap-2 md:absolute md:right-0 md:top-0 md:h-full md:w-1/3">
        <div className="size-14 border-4 border-border bg-primary font-head text-xl flex items-center justify-center text-primary-foreground">
          {you.name.slice(0, 2).toUpperCase()}
        </div>
        <span className="font-head text-sm text-foreground/80">{you.name} (toi)</span>
        <Pips n={score.you} />
        {lastResult?.yourMs != null && <span className="font-mono text-xs text-foreground/60">{lastResult.yourMs} ms</span>}
      </div>
    </button>
  );
}
```

Points anti-hallucination pour l'agent : le fond passe au vert **uniquement** sur le message serveur ; le faux départ est envoyé et jugé serveur ; `LOCKED` empêche tout second tap (anti double-submit UI).

---

## C.3 — SURVIE COLLECTIVE : Zones qui rétrécissent (`safe-zones`) — *la plus complexe*

Logique respectée (catalogue §5.2) : grille de cases ; à chaque tour le serveur diffuse `zones.round { safeCells, lockAtEpochMs }` ; les joueurs se placent avant le verrou ; une case = un joueur, **premier message serveur gagne** ; au verrou, le serveur diffuse `zones.locked { occupied, eliminatedIds }` puis un tour avec moins de cases. Ici tout est spectacle public (positions visibles de tous) — parfait pour le mode spectateur.

```tsx
// apps/web/src/components/games/SafeZonesGame.tsx
"use client";
import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { juice } from "@/lib/juice";
import { CountdownRing } from "@/components/juice/CountdownRing";

type PlayerDot = { userId: string; name: string; cell: number | null; eliminated: boolean };

type Props = {
  gridSize: number;                    // config: ex 5 → grille 5×5
  safeCells: number[];                 // WS: "zones.round" — indices des cases sûres CE tour
  lockAtEpochMs: number;               // WS: idem — verrou du tour
  players: PlayerDot[];                // WS: positions temps réel (state sync — occupation = vérité serveur)
  youUserId: string;
  myClaim: number | null;              // WS: ma case confirmée par "action.accepted" (pas ma demande !)
  locked: boolean;                     // WS: "zones.locked" reçu
  onClaim: (cell: number) => void;     // WS: send { type:"claim-cell", nonce, payload:{ cell } }
  readOnly?: boolean;
};

export function SafeZonesGame({ gridSize, safeCells, lockAtEpochMs, players, youUserId, myClaim, locked, onClaim, readOnly }: Props) {
  const [pendingCell, setPendingCell] = useState<number | null>(null); // demande envoyée, non confirmée
  const safe = useMemo(() => new Set(safeCells), [safeCells]);

  const occupants = useMemo(() => {
    const map = new Map<number, PlayerDot[]>();
    for (const p of players) if (p.cell !== null && !p.eliminated)
      map.set(p.cell, [...(map.get(p.cell) ?? []), p]);
    return map;
  }, [players]);

  const claim = useCallback((cell: number) => {
    if (readOnly || locked || !safe.has(cell)) return;
    if (occupants.get(cell)?.some(o => o.userId !== youUserId)) { juice.vibrate("error"); return; } // déjà prise (état serveur)
    setPendingCell(cell);        // optimiste VISUEL seulement — la vérité arrivera par state sync
    juice.vibrate("tap");
    onClaim(cell);
  }, [readOnly, locked, safe, occupants, youUserId, onClaim]);

  const alive = players.filter(p => !p.eliminated).length;

  return (
    <div className="game-surface flex h-full min-h-0 flex-col items-center gap-3 p-3 md:justify-center">
      {/* HUD du tour */}
      <div className="flex w-full max-w-[min(94vw,560px)] items-center justify-between">
        <div className="border-2 border-border bg-card px-3 py-1 shadow-sm">
          <span className="font-head text-sm">CASES SÛRES : </span>
          <span className="font-head text-lg text-[--arena-green]">{safeCells.length}</span>
        </div>
        <CountdownRing deadlineEpochMs={lockAtEpochMs} size={64} totalMs={10_000} />
        <div className="border-2 border-border bg-card px-3 py-1 shadow-sm">
          <span className="font-head text-sm">👥 </span>
          <span className="font-head text-lg">{alive}</span>
        </div>
      </div>

      {/* Grille — mobile plein écran, desktop bornée ; cases carrées */}
      <div
        className="grid w-full max-w-[min(94vw,560px)] flex-1 md:flex-none gap-1.5 md:gap-2"
        style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`, aspectRatio: "1" }}
        role="grid" aria-label="Plateau des zones sûres"
      >
        {Array.from({ length: gridSize * gridSize }).map((_, cell) => {
          const isSafe = safe.has(cell);
          const occ = occupants.get(cell) ?? [];
          const mine = myClaim === cell;
          const pending = pendingCell === cell && !mine;

          return (
            <button
              key={cell}
              type="button"
              role="gridcell"
              disabled={!isSafe || locked || readOnly}
              onPointerDown={() => claim(cell)}
              className={`relative border-2 border-border touch-manipulation select-none
                          ${isSafe ? "shadow-sm" : ""} ${!isSafe && locked ? "animate-red-flash" : ""}`}
              style={{
                backgroundColor: !isSafe ? "var(--arena-ink)"
                  : mine ? "var(--arena-gold)"
                  : occ.length > 0 ? "var(--arena-teal)"
                  : pending ? "var(--accent)"
                  : "var(--card)",
                opacity: !isSafe ? 0.35 : 1,
                transition: "background-color 150ms",
              }}
              aria-label={!isSafe ? "Case dangereuse" : occ.length ? `Case prise par ${occ[0].name}` : "Case libre"}
            >
              {/* Pions — la position vient du state serveur, jamais du clic local */}
              <AnimatePresence>
                {occ.slice(0, 1).map((p) => (
                  <motion.div
                    key={p.userId}
                    layoutId={`dot-${p.userId}`}
                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", damping: 15 }}
                    className="absolute inset-1 flex items-center justify-center border-2 border-border font-head text-[10px] md:text-xs"
                    style={{
                      backgroundColor: p.userId === youUserId ? "var(--primary)" : "var(--secondary)",
                      color: "#fff",
                    }}
                  >
                    {p.name.slice(0, 2).toUpperCase()}
                  </motion.div>
                ))}
              </AnimatePresence>
              {pending && <div className="absolute inset-0 animate-danger-pulse" />}
            </button>
          );
        })}
      </div>

      <p className="font-head text-center text-sm md:text-base" aria-live="polite">
        {locked
          ? <span className="text-[--arena-danger]">🔒 VERROUILLÉ — les cases dangereuses s'effondrent…</span>
          : myClaim !== null
            ? <span className="text-[--arena-green]">✔ Case sécurisée — tu peux encore bouger</span>
            : <span className="text-[--arena-pink]">CHOISIS UNE CASE SÛRE AVANT LE VERROU !</span>}
      </p>
    </div>
  );
}
```

Détails cruciaux encodés dans ce composant : la revendication est **optimiste visuellement mais jamais autoritaire** (le pion n'apparaît que via le state serveur, `layoutId` Motion anime automatiquement le déplacement du pion quand le serveur le déplace) ; une case occupée par un autre est refusée localement *d'après l'état serveur*, mais la course réelle de "premier arrivé" est tranchée serveur ; le spectateur (`readOnly`) voit exactement le même plateau — c'est le spectacle.

---

# PARTIE D — TESTS & DoD PHASE 2

- **E2E chemin d'or** : visiteur → drawer auth → inscription → paiement wallet → lobby → check-in (unlock audio) → live 2 rounds (mémoire puis zones) → élimination overlay → spectateur → résultats → wallet crédité.
- **Reconnexion** : kill réseau 10s en plein round → bandeau → état restauré, aucune action rejouée.
- **Test roi** (reconduit) : capture de tout le trafic entrant client pendant une partie → zéro donnée sensible pré-résolution.
- **Perf mobile** : Lighthouse ≥ 85 sur landing/catalogue ; page live testée sur Android entrée de gamme (throttle CPU 4×).
- **Accessibilité minimale** : `aria-live` sur les consignes de phase, cibles ≥ 44px, `prefers-reduced-motion` respecté.
- `pnpm typecheck && lint && test && build` verts.
