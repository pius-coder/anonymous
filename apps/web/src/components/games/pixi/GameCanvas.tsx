"use client";

import { useEffect, useRef, useState } from "react";
import type { Application, Container, Graphics, Text } from "pixi.js";

export type PixiRuntime = typeof import("pixi.js");

export type PixiGameHandle = {
  app: Application;
  pixi: PixiRuntime;
};

export type PixiGameCleanup = (() => void) | void;

export function GameCanvas({
  className,
  ariaLabel,
  onPointerMove,
  onPointerDown,
  onReady,
  fallback,
}: {
  className?: string;
  ariaLabel: string;
  onPointerMove?: React.PointerEventHandler<HTMLDivElement>;
  onPointerDown?: React.PointerEventHandler<HTMLDivElement>;
  onReady: (handle: PixiGameHandle) => PixiGameCleanup;
  fallback: React.ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let app: Application | null = null;
    let cleanup: PixiGameCleanup;
    let cancelled = false;

    (async () => {
      try {
        const pixi = await import("pixi.js");
        const host = hostRef.current;
        if (!host || cancelled) return;

        app = new pixi.Application();
        await app.init({
          backgroundAlpha: 0,
          antialias: true,
          autoDensity: true,
          resizeTo: host,
        });

        if (cancelled || !hostRef.current) {
          app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
          return;
        }

        app.canvas.className = "h-full w-full";
        app.canvas.setAttribute("aria-hidden", "true");
        host.appendChild(app.canvas);
        cleanup = onReady({ app, pixi });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
      app?.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
      app = null;
    };
  }, [onReady]);

  if (failed) return fallback;

  return (
    <div
      ref={hostRef}
      role="application"
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      className={className}
    />
  );
}

export type PixiNodeRefs = {
  stage: Container;
  sweep: Graphics;
  players: Map<string, { body: Graphics; label: Text }>;
};
