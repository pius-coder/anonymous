# PHASE 1 — FONDATIONS AAA
## Design system Squid Game + Assets + Moteur de jeu complet

> Fichier cible : `docs/plan/17-phase1-fondations.md`
> Principe : **rien de Phase 2 (pages joueur) n'est constructible tant que Phase 1 n'est pas verte.** Phase 1 = ce qui rend le produit "premium" (identité, son, animation) + ce qui rend le produit "jouable" (boucle de rounds serveur, anti-triche réel, spectateur).

---

# PARTIE A — ASSETS À TÉLÉCHARGER (liste exhaustive, sources, licences)

## A.1 Polices (self-hosted, jamais de Google Fonts au runtime)

Installation via **Fontsource** (packages npm = fichiers dans `node_modules`, build 100% offline) :

```bash
pnpm --filter @session-jeu/web add @fontsource/archivo-black @fontsource-variable/inter
```

| Rôle | Police | Licence | Usage |
|---|---|---|---|
| **Display** (`--font-display`) | Archivo Black | OFL (libre) | Titres, boutons, scores, countdown, "ÉLIMINÉ" |
| **Corps** (`--font-sans`) | Inter Variable | OFL | Règles, montants XAF, formulaires, légal |

Branchement dans `apps/web/src/app/layout.tsx` :

```tsx
import "@fontsource/archivo-black";        // 400 uniquement
import "@fontsource-variable/inter";
import "./globals.css";
```

Et dans `globals.css`, en tête de `:root` :

```css
:root {
  --font-display: "Archivo Black";
  /* ...le reste de la palette Squid Game déjà livrée... */
}
```

⚠️ Interdit : `next/font/google`, tout `<link href="fonts.googleapis...">`. Test build sans réseau obligatoire.

## A.2 SFX — sources exactes (tout est gratuit, licences safe)

| Source | URL | Licence | Quoi y prendre |
|---|---|---|---|
| **Kenney — Interface Sounds** | kenney.nl/assets/interface-sounds | **CC0** (aucune attribution) | clics, confirmations, erreurs (100 sons) |
| **Kenney — UI Audio** | kenney.nl/assets/ui-audio | CC0 | ticks, switches, pops |
| **Kenney — Digital Audio** | kenney.nl/assets/digital-audio | CC0 | signaux, alarmes rétro, power-up |
| **Kenney — Impact Sounds** | kenney.nl/assets/impact-sounds | CC0 | élimination, chute, coup |
| **Pixabay Sound Effects** | pixabay.com/sound-effects | Licence Pixabay (usage commercial OK, pas de revente brute) | heartbeat, fanfare victoire, alarme grave |
| **Mixkit Game SFX** | mixkit.co/free-sound-effects/game | Licence Mixkit (usage commercial OK) | fanfares, countdown |
| **Freesound** | freesound.org (filtre licence **CC0** uniquement) | CC0 si filtré | compléments |

**Règle stricte pour l'agent** : chaque fichier téléchargé est consigné dans `apps/web/public/sfx/CREDITS.md` (nom, source, URL, licence). Aucun son sans ligne dans ce fichier. Aucun son de la série Netflix (propriétaire).

## A.3 Liste normative des 14 sons (mapping fichier → événement)

Télécharger/choisir 14 sons, les renommer exactement ainsi dans `apps/web/assets-src/sfx/` :

| Fichier source | Événement `juice` | Caractère recherché | Source suggérée |
|---|---|---|---|
| `tick.wav` | `countdown_tick` | tick sec, court (<100ms) | Kenney UI Audio |
| `go.wav` | `signal_go` | "ding" net, positif | Kenney Interface |
| `ok.wav` | `action_ok` | pop discret | Kenney Interface |
| `reject.wav` | `action_rejected` | buzz négatif court | Kenney Interface |
| `danger.wav` | `danger_alert` | alarme grave 2 tons | Kenney Digital |
| `heartbeat.wav` | `tension_loop` | battement cœur (bouclable) | Pixabay "heartbeat" |
| `elim_self.wav` | `elimination_self` | impact dramatique + chute | Kenney Impact + Pixabay |
| `elim_other.wav` | `elimination_other` | impact sourd court | Kenney Impact |
| `roundwin.wav` | `round_win` | jingle montant 3 notes | Kenney Digital |
| `phase.wav` | `phase_change` | whoosh | Kenney Interface |
| `fanfare.wav` | `victory_fanfare` | fanfare 2-3s | Mixkit |
| `credit.wav` | `credit_gain` | pièces/caisse | Kenney Interface |
| `checkin.wav` | `checkin_ok` | confirmation chaleureuse | Kenney Interface |
| `unlock.wav` | `_unlock` | quasi-silencieux (débloque l'audio mobile) | 50ms de sine -60dB, généré |

## A.4 Fabrication de l'audio sprite (1 seul fichier réseau)

Outil : `audiosprite` (npm, nécessite ffmpeg installé) :

```bash
# prérequis : sudo apt install ffmpeg
pnpm dlx audiosprite --output apps/web/public/sfx/game \
  --export webm,mp3 --format howler2 \
  apps/web/assets-src/sfx/*.wav
```

Produit `game.webm` + `game.mp3` + `game.json` (offsets pour Howler). Le JSON est commité ; le script est ajouté dans `package.json` (`"sfx:build"`). Poids cible total : **< 300KB** (audience mobile data).

## A.5 Autres dépendances npm de la phase

```bash
pnpm --filter @session-jeu/web add howler motion canvas-confetti
pnpm --filter @session-jeu/web add -D @types/howler @types/canvas-confetti
# colyseus.js sera ajouté en Phase 2 (client live) — PAS maintenant
```

---

# PARTIE B — DESIGN SYSTEM (RetroUI + primitives)

## B.1 Gate documentaire obligatoire (avant tout code)

1. Context7 : Next.js 16 — client components, `next/dynamic`, metadata.
2. Docs retroui.dev : installation composants (CLI shadcn `pnpm dlx shadcn@latest add <url>` ou copie manuelle), compatibilité Tailwind v4 — **tester 1 composant sur branche avant d'enchaîner**.
3. Context7 : `motion` — imports actuels (`motion/react`), `AnimatePresence`, `useReducedMotion`.
4. Docs Howler : sprites format howler2, `Howler.autoUnlock`.

## B.2 Composants à installer (RetroUI, copiés dans le repo)

Vague 1 (Phase 1, nécessaires pour `/dev/ui` et les primitives) :
`Button, Card, Badge, Input, Label, Dialog, Alert, Alert-Dialog, Progress, Tabs, Avatar, Separator, Drawer, Sheet, Sonner(toast), Skeleton, Tooltip, Accordion, Switch, Scroll-Area, Empty(ou équivalent), Spinner`

Destination : `apps/web/src/components/retroui/`. Les 4 composants shadcn existants (`components/ui/`) restent en place ; migration des pages en fin de phase.

## B.3 Application du CSS Squid Game

Remplacer `globals.css` par la version livrée précédemment (palette `#ED1B76` / `#0F9B8E` / fond `#0e0f13`, animations `danger-pulse`, `red-flash`, `shake`, `game-surface`, `shapes-watermark`). Puis :

```bash
rg "dark:" apps/web/src --files-with-matches   # nettoyer les classes dark: résiduelles
rg -i "prize pool|jackpot|pari|mise|gain garanti" apps/web/src  # doit être vide
```

## B.4 Primitives d'animation (code de référence)

`apps/web/src/components/juice/CountdownRing.tsx` — **le timer le plus important du produit**. Règle absolue : il rend le temps restant depuis `deadlineEpochMs` **serveur**, jamais un décompte local autonome :

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { juice } from "@/lib/juice";

type Props = { deadlineEpochMs: number; size?: number; totalMs?: number };

export function CountdownRing({ deadlineEpochMs, size = 120, totalMs }: Props) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, deadlineEpochMs - Date.now()));
  const lastTickSecond = useRef<number>(-1);

  useEffect(() => {
    const id = setInterval(() => {
      const r = Math.max(0, deadlineEpochMs - Date.now());
      setRemainingMs(r);
      const s = Math.ceil(r / 1000);
      if (s <= 5 && s > 0 && s !== lastTickSecond.current) {
        lastTickSecond.current = s;
        juice.play("countdown_tick");
        if (s <= 3) juice.vibrate("tap");
      }
    }, 100);
    return () => clearInterval(id);
  }, [deadlineEpochMs]);

  const total = totalMs ?? 30_000;
  const ratio = Math.min(1, remainingMs / total);
  const danger = remainingMs <= 5_000;
  const R = (size - 12) / 2;
  const C = 2 * Math.PI * R;

  return (
    <div className={danger ? "animate-danger-pulse" : ""} style={{ width: size, height: size }}>
      <svg width={size} height={size} role="timer" aria-label={`${Math.ceil(remainingMs / 1000)} secondes restantes`}>
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--muted)" strokeWidth="8" />
        <circle
          cx={size / 2} cy={size / 2} r={R} fill="none"
          stroke={danger ? "var(--arena-danger)" : "var(--arena-teal)"}
          strokeWidth="8" strokeDasharray={C} strokeDashoffset={C * (1 - ratio)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 100ms linear, stroke 300ms" }}
        />
        <text x="50%" y="54%" textAnchor="middle" className="font-head"
          fill={danger ? "var(--arena-danger)" : "var(--foreground)"} fontSize={size / 3.2}>
          {Math.ceil(remainingMs / 1000)}
        </text>
      </svg>
    </div>
  );
}
```

`EliminationOverlay.tsx` (déclenchée par le message serveur uniquement) :

```tsx
"use client";
import { motion, AnimatePresence } from "motion/react";
import { juice } from "@/lib/juice";
import { useEffect } from "react";
import { Button } from "@/components/retroui/Button";

export function EliminationOverlay({ open, rank, onSpectate, onQuit }:{
  open: boolean; rank: number; onSpectate: () => void; onQuit: () => void;
}) {
  useEffect(() => {
    if (open) { juice.play("elimination_self"); juice.vibrate("elimination"); }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[--arena-ink]/95"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="animate-red-flash pointer-events-none fixed inset-0 bg-[--arena-danger]" />
          <motion.h1
            initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 12 }}
            className="font-head text-6xl text-[--arena-danger]"
          >
            ÉLIMINÉ
          </motion.h1>
          <p className="text-muted-foreground">Rang final provisoire : #{rank}</p>
          <div className="flex gap-4">
            <Button onClick={onSpectate}>Regarder la fin</Button>
            <Button variant="outline" onClick={onQuit}>Mes résultats</Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

Autres primitives (mêmes patterns, à créer) : `PhaseTransition` (bannière plein écran qui slide, son `phase_change`), `ScorePop` (nombre qui jaillit et disparaît), `AnimatedNumber` (compteur XAF qui roule), `KillFeed` (Scroll Area + entrées qui slident).

## B.5 `juice.ts` — module son/vibration complet

`apps/web/src/lib/juice.ts` :

```ts
import { Howl } from "howler";
import spriteMap from "../../public/sfx/game.json"; // généré par audiosprite

type SfxKey =
  | "countdown_tick" | "signal_go" | "action_ok" | "action_rejected"
  | "danger_alert" | "tension_loop" | "elimination_self" | "elimination_other"
  | "round_win" | "phase_change" | "victory_fanfare" | "credit_gain"
  | "checkin_ok" | "_unlock";

type VibePattern = "tap" | "success" | "error" | "danger" | "elimination";

const VIBES: Record<VibePattern, number | number[]> = {
  tap: 15,
  success: [30, 40, 60],
  error: [80, 50, 80],
  danger: [200, 100, 200, 100, 200],
  elimination: 400,
};

class Juice {
  private howl: Howl | null = null;
  private muted = false;

  init() {
    if (this.howl) return;
    this.muted = typeof localStorage !== "undefined" && localStorage.getItem("sfx-muted") === "1";
    this.howl = new Howl({
      src: ["/sfx/game.webm", "/sfx/game.mp3"],
      sprite: (spriteMap as { sprite: Record<string, [number, number]> }).sprite,
      preload: true,
    });
  }

  /** À appeler dans le handler du bouton CHECK-IN : débloque l'audio mobile. */
  unlock() { this.init(); this.howl?.play("_unlock"); }

  play(key: SfxKey) {
    if (this.muted) return;
    this.init();
    this.howl?.play(key);
  }

  vibrate(pattern: VibePattern) {
    if (this.muted) return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(VIBES[pattern]);
    }
  }

  setMuted(v: boolean) {
    this.muted = v;
    localStorage.setItem("sfx-muted", v ? "1" : "0");
    if (v && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(0);
  }
  get isMuted() { return this.muted; }
}

export const juice = new Juice();
```

Règles : aucun composant n'importe `howler` directement ; toggle mute visible dans le HUD live ; `juice.init()` appelé au montage du lobby (pas sur la landing).

## B.6 Page vitrine `/dev/ui`

Page listant : tous les composants RetroUI, les 4 primitives en démo interactive, un bouton par SFX, un bouton par pattern de vibration. Guard :

```ts
if (process.env.NODE_ENV === "production") notFound();
```

---

# PARTIE C — MOTEUR DE JEU SERVEUR (le cœur de la phase)

## C.1 Gate documentaire obligatoire

1. Context7 Colyseus 0.17 : **`StateView` et décorateur `@view()`** (`import { view } from "@colyseus/schema"`, `client.view = new StateView()`, `client.view.add(entity)`) — vérifier les imports exacts contre la version installée.
2. Context7 Colyseus : `presence.subscribe/publish` (pont worker → room via Redis).
3. Context7 Prisma : transaction Serializable + retry sur erreur de sérialisation.
4. Relire `catalogue-mini-jeux.md` §1.1 (mémoire), §1.2 (calcul), §2.2 (réaction duel) — les règles serveur y sont déjà écrites.

## C.2 Schéma DB — migration `phase1_gameplay`

```prisma
enum EliminationPolicyType {
  KEEP_TOP_N
  ELIMINATE_BOTTOM_N
  ELIMINATE_BOTTOM_PERCENT
  DUEL_WINNER_ADVANCES
  SURVIVAL_UNTIL_QUOTA
  NO_ELIMINATION
}

model RoundConfig {
  id                   String  @id @default(cuid())
  sessionId            String
  ordinal              Int
  miniGameDefinitionId String
  configJson           Json
  durationMs           Int     @default(30000)
  eliminationPolicy    EliminationPolicyType
  eliminationValue     Int?    // n ou bps selon la policy
  session              GameSession        @relation(fields: [sessionId], references: [id])
  miniGameDefinition   MiniGameDefinition @relation(fields: [miniGameDefinitionId], references: [id])
  @@unique([sessionId, ordinal])
}
```

+ `RoundInstance.roundConfigId` (lien vers le programme) + `RoundInstance.seedLog Json?`.

## C.3 `applyEliminationPolicy` (packages/game-engine)

```ts
export type EliminationPolicy =
  | { type: "KEEP_TOP_N"; n: number }
  | { type: "ELIMINATE_BOTTOM_N"; n: number }
  | { type: "ELIMINATE_BOTTOM_PERCENT"; bps: number }
  | { type: "DUEL_WINNER_ADVANCES" }
  | { type: "SURVIVAL_UNTIL_QUOTA"; quota: number }
  | { type: "NO_ELIMINATION" };

export function applyEliminationPolicy(ranking: RankedPlayer[], policy: EliminationPolicy) {
  const total = ranking.length;
  const keep = (() => {
    switch (policy.type) {
      case "KEEP_TOP_N": return Math.min(policy.n, total);
      case "ELIMINATE_BOTTOM_N": return Math.max(0, total - policy.n);
      case "ELIMINATE_BOTTOM_PERCENT":
        return total - Math.floor((total * policy.bps) / 10000);
      case "DUEL_WINNER_ADVANCES": return Math.ceil(total / 2); // gagnant par paire + bye
      case "SURVIVAL_UNTIL_QUOTA": return Math.min(policy.quota, total);
      case "NO_ELIMINATION": return total;
    }
  })();
  return {
    qualifiedIds: ranking.slice(0, keep).map(r => r.playerId),
    eliminatedIds: ranking.slice(keep).map(r => r.playerId),
  };
}

/** Simulation du programme pour la validation admin (funnel d'effectifs). */
export function simulateProgram(startCount: number, policies: EliminationPolicy[]): number[] {
  const steps = [startCount];
  let n = startCount;
  for (const p of policies) {
    n = applyEliminationPolicy(
      Array.from({ length: n }, (_, i) => ({ playerId: String(i), score: 0, rank: i + 1, tieBreakMs: null, missingAction: false })),
      p,
    ).qualifiedIds.length;
    steps.push(n);
  }
  return steps; // ex: [20, 12, 6, 3]
}
```

Tests : propriété `qualified + eliminated = total`, funnel jamais négatif, `DUEL` avec impair → bye.

## C.4 Service `finalizeRound` (nouveau, comble le Gap A)

`apps/game-server/src/live/finalizeRound.ts` (partagé avec le worker via package ou duplication contrôlée) :

```ts
export async function finalizeRound(roundId: string, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const round = await tx.roundInstance.findUniqueOrThrow({
      where: { id: roundId },
      include: { roundConfig: { include: { miniGameDefinition: true } }, deadline: true },
    });
    if (round.status === RoundStatus.RESOLVED) return { type: "already-resolved" as const };

    const actions = await tx.playerAction.findMany({
      where: { roundId, acceptedAt: { not: null } },
      orderBy: { acceptedAt: "asc" },
    });
    const participants = await tx.sessionRegistration.findMany({
      where: { sessionId: round.sessionId, status: SessionRegistrationStatus.IN_ROOM },
      select: { userId: true },
    });

    // 1. Le runtime a déjà calculé les scores serveur (PlayerAction.payload.serverScore)
    // 2. Résolution déterministe
    const output = resolveRound({
      roundId,
      participants: participants.map(p => p.userId),
      actions: actions.map(toResolverAction),
      config: buildResolverConfig(round.roundConfig),
      seedLog: (round.seedLog ?? []) as ResolutionEvidence[],
    });
    const { qualifiedIds, eliminatedIds } = applyEliminationPolicy(
      output.ranking, toPolicy(round.roundConfig),
    );

    // 3. Persistance : RoundResult par joueur + hash de preuve
    await tx.roundResult.createMany({
      data: output.ranking.map(r => ({
        roundId, userId: r.playerId, score: r.score, rank: r.rank,
        qualified: qualifiedIds.includes(r.playerId),
        evidenceHash: hashResolution(output),
      })),
      skipDuplicates: true,
    });
    await tx.sessionRegistration.updateMany({
      where: { sessionId: round.sessionId, userId: { in: eliminatedIds } },
      data: { status: SessionRegistrationStatus.ELIMINATED },
    });
    await tx.roundInstance.update({
      where: { id: roundId },
      data: { status: RoundStatus.RESOLVED, endTime: now },
    });
    await tx.auditLog.create({
      data: {
        action: "round.resolved", entity: "RoundInstance", entityId: roundId,
        newData: { qualifiedIds, eliminatedIds, hash: hashResolution(output) },
      },
    });
    return { type: "resolved" as const, output, qualifiedIds, eliminatedIds };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 });
}
```

(Les noms exacts d'enums/champs sont à aligner sur le schéma réel — l'agent vérifie avant.)

## C.5 Orchestration : qui appelle quoi (séquence normative)

```
Room.beginRound(n)
  └ charge RoundConfig[n] → instancie le RUNTIME du mini-jeu
  └ startRound() (DB deadline + job BullMQ)  [existe déjà]

Deadline atteinte — DEUX chemins, le premier gagne (idempotent) :
  a) Room (clock local) : appelle finalizeRound(roundId)
  b) Worker round.deadline (filet crash) : ferme + appelle finalizeRound(roundId)
     puis presence.publish(`session:${sessionId}:round-resolved`, résumé)

Room reçoit le résultat (retour direct OU presence.subscribe) :
  └ broadcast "round.resolved" { scores publics, qualifiedIds, eliminatedIds }
  └ bascule les éliminés : LivePlayer.role = "SPECTATOR" (state sync)
  └ phase RESULTS (8s) → beginRound(n+1) OU fin de programme
Fin de programme :
  └ session terminable → flux finalize/distribution EXISTANT (Feature 12) prend le relais
```

Pont worker→room : `this.presence.subscribe(channel, cb)` dans `onCreate`, `presence.publish` côté worker (même Redis). **Gate documentaire : vérifier l'API presence exacte de la version installée.**

## C.6 Runtimes de mini-jeux server-side (comble le Gap B)

Interface commune (`packages/game-engine/src/runtimes/types.ts`) :

```ts
export interface MiniGameRuntime {
  /** Génère l'état initial (seed loguée). Ne retourne au client QUE le nécessaire. */
  start(ctx: { participants: string[]; config: unknown; seed: string }): void;
  /** Valide un input joueur et retourne l'effet. TOUT le scoring est ici. */
  handleAction(userId: string, action: { type: string; payload: unknown }, nowMs: number):
    | { ok: true; serverScore: number; clientEvent?: { type: string; data: unknown; to?: string } }
    | { ok: false; reason: string };
  /** Snapshot des scores serveur pour le resolver à la deadline. */
  snapshot(): { scores: Record<string, number>; tieBreakMs: Record<string, number>; seedLog: ResolutionEvidence[] };
}
```

**Runtime `memory-sequence`** (règles = catalogue §1.1) — squelette :

```ts
export class MemorySequenceRuntime implements MiniGameRuntime {
  private sequences = new Map<string, number[]>(); // séquence par joueur — JAMAIS envoyée entière
  private progress = new Map<string, { level: number; failed: boolean; totalMs: number }>();
  private rng!: () => number;
  private seedLog: ResolutionEvidence[] = [];

  start(ctx) {
    this.rng = seededRandom(ctx.seed);
    this.seedLog.push({ type: "rng.seed", message: "memory-sequence seed", data: { seed: ctx.seed } });
    for (const p of ctx.participants) {
      this.sequences.set(p, Array.from({ length: 3 }, () => Math.floor(this.rng() * 4)));
      this.progress.set(p, { level: 0, failed: false, totalMs: 0 });
    }
    // La room envoie à CHAQUE joueur (message ciblé, pas broadcast) : "sequence.show"
    // avec SA séquence en lecture seule — puis le client la masque, le serveur garde la vérité.
  }

  handleAction(userId, action, nowMs) {
    if (action.type !== "sequence-input") return { ok: false, reason: "action-not-allowed" };
    const st = this.progress.get(userId);
    const seq = this.sequences.get(userId);
    if (!st || !seq || st.failed) return { ok: false, reason: "not-playing" };

    const input = (action.payload as { steps?: number[] }).steps ?? [];
    const correct = input.length === seq.length && input.every((v, i) => v === seq[i]);
    if (!correct) { st.failed = true; return { ok: true, serverScore: st.level }; }

    st.level += 1;
    seq.push(Math.floor(this.rng() * 4)); // +1 élément, régénéré serveur
    return {
      ok: true, serverScore: st.level,
      clientEvent: { type: "sequence.show", data: { steps: seq }, to: userId },
    };
  }

  snapshot() {
    return {
      scores: Object.fromEntries([...this.progress].map(([u, s]) => [u, s.level])),
      tieBreakMs: Object.fromEntries([...this.progress].map(([u, s]) => [u, s.totalMs])),
      seedLog: this.seedLog,
    };
  }
}
```

**Runtimes Phase 1 à livrer** : `memory-sequence`, `rapid-calculation` (questions générées une par une, réponse validée serveur), `pure-reaction-duel` (signal horodaté serveur, faux départ pénalisé). **Suppression obligatoire** de l'action `submit-score` du seed → remplacée par `sequence-input`, `answer`, `reaction-click`.

## C.7 Spectateur & vues (StateView)

1. `LivePlayer` : + `@type("string") role = "PLAYER"` ; + `eliminatedAtRound`.
2. Données privées de jeu (séquence en cours, question courante) : **jamais dans le state broadcasté** — soit messages ciblés `client.send()` (choisi pour Phase 1, plus simple), soit `@view()` (requis dès qu'un état privé doit persister/re-sync après reconnexion — à trancher au gate documentaire selon la version).
3. Guard serveur dans `submitPlayerAction` : rejeter si la registration du joueur est `ELIMINATED` (`{ type: "not-a-player" }` + AntiCheatEvent si répété).
4. À l'élimination : `role = "SPECTATOR"`, message ciblé `you.eliminated { rank }` (déclenche l'overlay côté client en Phase 2).
5. Règle documentée : *un spectateur ne reçoit jamais une info qu'un joueur actif n'a pas* (anti-soufflage WhatsApp).

---

# PARTIE D — DÉCOUPAGE EN SPRINTS + TESTS + DoD

## Sprint 1A — Assets & thème (2-3 jours)
Fonts Fontsource, CSS Squid Game, composants RetroUI vague 1, `/dev/ui` (sans SFX).
**Tests** : build offline, snapshot composants, scan wording interdit, `/dev/ui` 404 en prod.

## Sprint 1B — Juice (2 jours)
Téléchargement des 14 SFX + `CREDITS.md`, sprite audiosprite, `juice.ts`, 5 primitives (CountdownRing, EliminationOverlay, PhaseTransition, ScorePop, AnimatedNumber), démos sur `/dev/ui`.
**Tests** : sprite < 300KB, CountdownRing basé epoch serveur (test unitaire avec fake timers), mute persistant, `navigator.vibrate` wrappé défensivement.

## Sprint 1C — Boucle de rounds (4-5 jours) ← chemin critique
Migration `RoundConfig`/policy, `applyEliminationPolicy` + `simulateProgram`, `finalizeRound`, orchestration room↔worker (presence pubsub), guard éliminés, rôle SPECTATOR.
**Tests** :
- Intégration : session 3 rounds, 6 joueurs simulés, se déroule sans intervention ; funnel respecté.
- Idempotence : `finalizeRound` appelé 2× (room + worker) → 1 seul RoundResult set.
- Crash : room tuée pendant un round → worker clôture, reprise propre.
- Éliminé qui soumet → rejeté + AntiCheatEvent.
- Replay : même inputs + seed → même `evidenceHash`.

## Sprint 1D — Runtimes anti-triche (4-5 jours)
3 runtimes, remplacement de `submit-score`, messages ciblés, seed du catalogue mis à jour.
**Tests** :
- **Le test roi** : capturer tout ce qui part vers un client (state + messages) pendant une partie → assert qu'aucune séquence/réponse/cible complète n'y figure avant résolution.
- Client envoyant un score direct → `action-not-allowed`.
- Déterminisme runtime (seed fixe).
- Faux départ réaction → pénalité appliquée serveur.

## Definition of Done — PHASE 1
- ✅ `pnpm typecheck && pnpm lint && pnpm test && pnpm build` verts.
- ✅ Une session de 3 rounds avec éliminations se joue en test d'intégration, scores 100% serveur.
- ✅ `/dev/ui` démontre tout le design system + sons + vibrations.
- ✅ `CREDITS.md` complet, aucun asset sans licence tracée.
- ✅ Aucune donnée sensible de jeu observable côté client (test automatisé).
- ✅ Rapport de sprint : versions, library IDs Context7, décisions StateView vs messages ciblés.

---

## Aperçu des phases suivantes (pour cadrage, détail à venir)

- **PHASE 2 — Le joueur** : drawer auth, inscription+paiement, wallet, profil, lobby immersif, client Colyseus (`colyseus.js`), écrans de phase, UI des 3 mini-jeux, vue spectateur + kill-feed, résultats avec podium/confetti.
- **PHASE 3 — L'opérateur & le lancement** : admin sidebar, **Program Builder** avec simulation funnel live, contrôle live (pause/finalize), audit/support, PixiJS pour la famille Survie, polish performance (Lighthouse, bas de gamme Android), recette E2E complète.
