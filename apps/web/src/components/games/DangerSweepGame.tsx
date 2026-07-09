"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { juice } from "@/lib/juice";
import { GameCanvas, type PixiGameHandle, type PixiNodeRefs } from "@/components/games/pixi/GameCanvas";

type Sweep = { fn: "linear" | "rotate"; t0EpochMs: number; speed: number; width: number };
type ArenaPlayer = { userId: string; displayName?: string; x: number; y: number; eliminated?: boolean };

const DEFAULT_SWEEP: Sweep = { fn: "linear", t0EpochMs: 0, speed: 180, width: 72 };

function sweepX(sweep: Sweep, width: number, now = Date.now()) {
  const elapsed = Math.max(0, now - sweep.t0EpochMs) / 1000;
  return ((elapsed * sweep.speed) % (width + sweep.width * 2)) - sweep.width;
}

export function DangerSweepGame({
  arena = { width: 1000, height: 700 },
  sweep = DEFAULT_SWEEP,
  players,
  youUserId,
  onMove,
  readOnly,
}: {
  arena?: { width: number; height: number };
  sweep?: Sweep;
  players: ArenaPlayer[];
  youUserId: string;
  onMove: (point: { x: number; y: number }) => void;
  readOnly?: boolean;
}) {
  const pixiRefs = useRef<PixiNodeRefs | null>(null);
  const [rayX, setRayX] = useState(() => sweepX(sweep, arena.width));
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      setRayX(sweepX(sweep, arena.width));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [arena.width, sweep]);

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (readOnly) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.round(((event.clientX - rect.left) / rect.width) * arena.width);
    const y = Math.round(((event.clientY - rect.top) / rect.height) * arena.height);
    const point = {
      x: Math.max(0, Math.min(arena.width, x)),
      y: Math.max(0, Math.min(arena.height, y)),
    };
    setPending(point);
    juice.vibrate("tap");
    onMove(point);
  };

  const renderPixi = useCallback(({ app, pixi }: PixiGameHandle) => {
    const stage = new pixi.Container();
    const grid = new pixi.Graphics();
    const sweepBeam = new pixi.Graphics();
    const playerNodes = new Map<string, { body: InstanceType<typeof pixi.Graphics>; label: InstanceType<typeof pixi.Text> }>();

    app.stage.addChild(stage);
    stage.addChild(grid);
    stage.addChild(sweepBeam);

    const drawGrid = () => {
      grid.clear();
      grid.rect(0, 0, app.screen.width, app.screen.height).fill({ color: 0x09111f });
      grid.stroke({ width: 4, color: 0xffffff, alpha: 0.16 });
      const step = Math.max(32, app.screen.width / 14);
      for (let x = 0; x <= app.screen.width; x += step) {
        grid.moveTo(x, 0).lineTo(x, app.screen.height).stroke({ width: 1, color: 0xffffff, alpha: 0.12 });
      }
      for (let y = 0; y <= app.screen.height; y += step) {
        grid.moveTo(0, y).lineTo(app.screen.width, y).stroke({ width: 1, color: 0xffffff, alpha: 0.12 });
      }
    };

    const updatePlayers = () => {
      for (const player of players) {
        let node = playerNodes.get(player.userId);
        if (!node) {
          const body = new pixi.Graphics();
          const label = new pixi.Text({
            text: (player.displayName ?? player.userId).slice(0, 2).toUpperCase(),
            style: { fill: "#ffffff", fontFamily: "Arial", fontSize: 13, fontWeight: "700" },
          });
          label.anchor.set(0.5);
          stage.addChild(body);
          stage.addChild(label);
          node = { body, label };
          playerNodes.set(player.userId, node);
        }
        const isYou = player.userId === youUserId;
        const point = isYou && pending ? pending : player;
        const x = (point.x / arena.width) * app.screen.width;
        const y = (point.y / arena.height) * app.screen.height;
        const color = player.eliminated ? 0xf43f5e : isYou ? 0xfacc15 : 0x2dd4bf;
        node.body.clear();
        node.body.circle(0, 0, 22).fill({ color, alpha: player.eliminated ? 0.45 : 1 });
        node.body.circle(0, 0, 22).stroke({ width: 4, color: 0xffffff, alpha: 0.35 });
        node.body.position.set(x, y);
        node.label.position.set(x, y + 1);
        node.label.alpha = player.eliminated ? 0.45 : 1;
      }
      for (const [userId, node] of playerNodes) {
        if (!players.some((player) => player.userId === userId)) {
          node.body.destroy();
          node.label.destroy();
          playerNodes.delete(userId);
        }
      }
    };

    const drawSweep = () => {
      const x = (sweepX(sweep, arena.width) / arena.width) * app.screen.width;
      const w = (sweep.width / arena.width) * app.screen.width;
      sweepBeam.clear();
      sweepBeam.rect(x, 0, w, app.screen.height).fill({ color: 0xf43f5e, alpha: 0.74 });
      sweepBeam.rect(x - 10, 0, w + 20, app.screen.height).stroke({ width: 6, color: 0xf43f5e, alpha: 0.25 });
    };

    const tick = () => {
      drawGrid();
      drawSweep();
      updatePlayers();
    };

    tick();
    app.ticker.add(tick);
    pixiRefs.current = { stage, sweep: sweepBeam, players: playerNodes };

    return () => {
      app.ticker.remove(tick);
      pixiRefs.current = null;
    };
  }, [arena.height, arena.width, pending, players, sweep, youUserId]);

  const fallback = (
    <div
      role="application"
      aria-label="Arene 2D du rayon balayeur"
      onPointerDown={move}
      onPointerMove={(event) => {
        if (event.buttons === 1) move(event);
      }}
      className="relative w-full max-w-5xl flex-1 overflow-hidden border-4 border-border bg-[--arena-ink] touch-none"
      style={{ aspectRatio: `${arena.width} / ${arena.height}` }}
    >
      <div
        className="absolute inset-y-0 bg-[--arena-danger]/75 shadow-[0_0_40px_var(--arena-danger)]"
        style={{ left: `${(rayX / arena.width) * 100}%`, width: `${(sweep.width / arena.width) * 100}%` }}
      />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:64px_64px]" />
      {players.map((player) => {
        const isYou = player.userId === youUserId;
        return (
          <motion.div
            key={player.userId}
            className="absolute grid size-12 place-items-center border-4 border-border font-head text-xs text-white"
            animate={{
              left: `${((isYou && pending ? pending.x : player.x) / arena.width) * 100}%`,
              top: `${((isYou && pending ? pending.y : player.y) / arena.height) * 100}%`,
            }}
            style={{
              translate: "-50% -50%",
              backgroundColor: player.eliminated
                ? "var(--arena-danger)"
                : isYou
                  ? "var(--arena-gold)"
                  : "var(--arena-teal)",
              opacity: player.eliminated ? 0.45 : 1,
            }}
          >
            {(player.displayName ?? player.userId).slice(0, 2).toUpperCase()}
          </motion.div>
        );
      })}
    </div>
  );

  return (
    <div className="game-surface flex h-full w-full flex-col items-center justify-center gap-3 p-3">
      <div className="flex w-full max-w-5xl items-center justify-between">
        <p className="font-head text-2xl font-black uppercase text-[--arena-danger]">Rayon balayeur</p>
        <p className="text-xs uppercase text-muted-foreground">
          {readOnly ? "spectateur" : "glisse pour bouger"}
        </p>
      </div>
      <GameCanvas
        ariaLabel="Arene 2D PixiJS du rayon balayeur"
        onPointerDown={move}
        onPointerMove={(event) => {
          if (event.buttons === 1) move(event);
        }}
        className="relative w-full max-w-5xl flex-1 overflow-hidden border-4 border-border bg-[--arena-ink] touch-none"
        onReady={renderPixi}
        fallback={fallback}
      />
      <p className="font-head text-center text-sm text-muted-foreground" aria-live="polite">
        Canvas PixiJS; les collisions restent tranchees serveur.
      </p>
    </div>
  );
}
