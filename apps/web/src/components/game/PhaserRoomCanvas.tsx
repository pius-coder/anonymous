"use client";

import { useEffect, useRef, useState } from "react";
import type { RoomGameHandle } from "./phaser/createRoomGame";

type ConnectionState = "connecting" | "connected" | "reconnecting" | "preview" | "offline";

type PhaserRoomCanvasProps = {
  partyId: string;
  displayName: string;
  minimapVisible: boolean;
  reducedMotion: boolean;
  onConnectionChange: (state: ConnectionState) => void;
  onPlayerCountChange: (count: number) => void;
};

export function PhaserRoomCanvas({
  partyId,
  displayName,
  minimapVisible,
  reducedMotion,
  onConnectionChange,
  onPlayerCountChange,
}: PhaserRoomCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<RoomGameHandle | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    const parent = hostRef.current;
    if (!parent) return;
    let disposed = false;
    let effectGame: RoomGameHandle | null = null;

    void import("./phaser/createRoomGame")
      .then(({ createRoomGame }) => {
        if (disposed) return;
        const handle = createRoomGame({
          parent,
          partyId,
          displayName,
          onConnectionChange,
          onPlayerCountChange,
        });
        if (disposed) {
          handle.destroy();
          return;
        }
        effectGame = handle;
        gameRef.current = handle;
      })
      .catch((error: unknown) => {
        if (!disposed) setFailure(error instanceof Error ? error.message : "Chargement Phaser impossible");
      });

    return () => {
      disposed = true;
      effectGame?.destroy();
      if (gameRef.current === effectGame) gameRef.current = null;
      parent.replaceChildren();
    };
  }, [displayName, onConnectionChange, onPlayerCountChange, partyId]);

  useEffect(() => gameRef.current?.setMinimapVisible(minimapVisible), [minimapVisible]);
  useEffect(() => gameRef.current?.setReducedMotion(reducedMotion), [reducedMotion]);

  return (
    <div className="phaser-room-canvas" ref={hostRef} aria-label="Carte interactive de la room sociale">
      {failure ? <div className="game-status-overlay" role="alert">{failure}</div> : null}
    </div>
  );
}
