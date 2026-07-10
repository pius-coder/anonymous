"use client";

import { useEffect, useRef, useState, type PointerEventHandler, type ReactNode } from "react";
import type { Application, Container, Graphics, Text } from "pixi.js";

export type PixiRuntime = typeof import("pixi.js");

export type PixiGameHandle = {
  app: Application;
  pixi: PixiRuntime;
};

export type PixiGameCleanup = (() => void) | void;

/**
 * Shared Pixi host for live maps and game boards.
 *
 * The canvas is loaded lazily, paused while the page is hidden and always
 * destroyed with its scene graph. Game-specific state must live in refs so
 * `onReady` can stay stable and the WebGL context is not recreated per input.
 */
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
  onPointerMove?: PointerEventHandler<HTMLDivElement>;
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
  onReady: (handle: PixiGameHandle) => PixiGameCleanup;
  fallback: ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let app: Application | null = null;
    let cleanup: PixiGameCleanup;
    let cancelled = false;
    let removeVisibilityListener: (() => void) | undefined;
    let resizeObserver: ResizeObserver | undefined;

    const destroyApp = () => {
      if (!app) return;
      try {
        app.ticker.stop();
        app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
      } catch (error) {
        console.warn("Pixi canvas cleanup failed", error);
        app.canvas?.remove();
      } finally {
        app = null;
      }
    };

    void (async () => {
      setFailed(false);
      setLoading(true);

      try {
        const pixi = await import("pixi.js");
        const host = hostRef.current;
        if (!host || cancelled) return;

        app = new pixi.Application();
        await app.init({
          backgroundAlpha: 0,
          antialias: true,
          autoDensity: true,
          width: Math.max(1, host.clientWidth),
          height: Math.max(1, host.clientHeight),
          resolution: Math.min(2, window.devicePixelRatio || 1),
        });

        if (cancelled || !hostRef.current) {
          destroyApp();
          return;
        }

        app.canvas.className = "block h-full w-full";
        app.canvas.setAttribute("aria-hidden", "true");
        host.replaceChildren(app.canvas);

        resizeObserver = new ResizeObserver(([entry]) => {
          if (!app) return;
          const { width, height } = entry.contentRect;
          app.renderer.resize(Math.max(1, width), Math.max(1, height));
        });
        resizeObserver.observe(host);

        const syncTickerWithVisibility = () => {
          if (!app) return;
          if (document.visibilityState === "hidden") app.ticker.stop();
          else app.ticker.start();
        };
        document.addEventListener("visibilitychange", syncTickerWithVisibility);
        removeVisibilityListener = () => document.removeEventListener("visibilitychange", syncTickerWithVisibility);
        syncTickerWithVisibility();

        cleanup = onReady({ app, pixi });
        if (!cancelled) setLoading(false);
      } catch (error) {
        console.error("Pixi canvas initialization failed", error);
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      removeVisibilityListener?.();
      resizeObserver?.disconnect();
      cleanup?.();
      destroyApp();
    };
  }, [onReady]);

  if (failed) return fallback;

  return (
    <div
      role="application"
      aria-label={ariaLabel}
      aria-busy={loading}
      data-pixi-state={loading ? "loading" : "ready"}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      className={className}
    >
      <div ref={hostRef} className="absolute inset-0 h-full w-full" />
      {loading ? (
        <div className="pointer-events-none absolute inset-0 grid min-h-40 place-items-center text-center text-xs font-bold uppercase tracking-[0.18em] text-white/45">
          Initialisation du moteur 2D…
        </div>
      ) : null}
    </div>
  );
}

export type PixiNodeRefs = {
  stage: Container;
  sweep: Graphics;
  players: Map<string, { body: Graphics; label: Text }>;
};
