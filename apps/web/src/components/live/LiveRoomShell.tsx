"use client";

import { useCallback, useMemo, useState } from "react";
import { MessageCircle, Radio, Send, Target, Users } from "lucide-react";
import { GameCanvas, type PixiGameHandle } from "@/components/games/pixi/GameCanvas";
import type { LiveChatMessage, LivePlayer, LiveSnapshot, Status } from "@/hooks/useGameRoom";

type Props = {
  status: Status;
  snap: LiveSnapshot | null;
  currentGameName?: string;
  eliminated?: boolean;
  chatMessages: LiveChatMessage[];
  onMove: (point: { x: number; y: number }) => void;
  onChat: (body: string, quick?: boolean) => void;
  onPing: (type: string, point?: { x: number; y: number }) => void;
  children?: React.ReactNode;
};

const ARENA = { width: 1000, height: 700 };
const quickMessages = ["Je suis prêt", "Par ici", "On se regroupe", "Go"];

function initials(player: Pick<LivePlayer, "displayName" | "userId">) {
  return (player.displayName || player.userId).slice(0, 2).toUpperCase();
}

export function LiveRoomShell({
  status,
  snap,
  currentGameName,
  eliminated,
  chatMessages,
  onMove,
  onChat,
  onPing,
  children,
}: Props) {
  const [chatOpen, setChatOpen] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const players = useMemo(() => snap?.players ?? [], [snap?.players]);
  const activePlayers = players.filter((player) => !player.isEliminated);

  const pointerToArena = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.round(((event.clientX - rect.left) / rect.width) * ARENA.width),
      y: Math.round(((event.clientY - rect.top) / rect.height) * ARENA.height),
    };
  };

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (eliminated) return;
    onMove(pointerToArena(event));
  };

  const renderPixi = useCallback(
    ({ app, pixi }: PixiGameHandle) => {
      const stage = new pixi.Container();
      const floor = new pixi.Graphics();
      const playerNodes = new Map<
        string,
        {
          body: InstanceType<typeof pixi.Graphics>;
          label: InstanceType<typeof pixi.Text>;
          bubble: InstanceType<typeof pixi.Text>;
        }
      >();

      app.stage.addChild(stage);
      stage.addChild(floor);

      const draw = () => {
        floor.clear();
        floor.rect(0, 0, app.screen.width, app.screen.height).fill({ color: 0x111318 });
        floor.rect(16, 16, app.screen.width - 32, app.screen.height - 32).stroke({ width: 4, color: 0xffffff, alpha: 0.12 });
        for (let x = 64; x < app.screen.width; x += 64) {
          floor.moveTo(x, 0).lineTo(x, app.screen.height).stroke({ width: 1, color: 0xffffff, alpha: 0.07 });
        }
        for (let y = 64; y < app.screen.height; y += 64) {
          floor.moveTo(0, y).lineTo(app.screen.width, y).stroke({ width: 1, color: 0xffffff, alpha: 0.07 });
        }

        for (const player of players) {
          let node = playerNodes.get(player.userId);
          if (!node) {
            const body = new pixi.Graphics();
            const label = new pixi.Text({
              text: initials(player),
              style: { fill: "#ffffff", fontFamily: "Arial", fontSize: 13, fontWeight: "700" },
            });
            const bubble = new pixi.Text({
              text: "",
              style: { fill: "#ffffff", fontFamily: "Arial", fontSize: 12, fontWeight: "700" },
            });
            label.anchor.set(0.5);
            bubble.anchor.set(0.5);
            stage.addChild(body, label, bubble);
            node = { body, label, bubble };
            playerNodes.set(player.userId, node);
          }
          const x = (Math.max(0, Math.min(ARENA.width, player.x || 120)) / ARENA.width) * app.screen.width;
          const y = (Math.max(0, Math.min(ARENA.height, player.y || 120)) / ARENA.height) * app.screen.height;
          const connected = player.connectionStatus === "CONNECTED";
          node.body.clear();
          node.body.circle(0, 0, 24).fill({
            color: player.isEliminated ? 0x7f1d1d : connected ? 0x0f766e : 0x52525b,
            alpha: player.isEliminated ? 0.5 : 1,
          });
          node.body.circle(0, 0, 26).stroke({ width: 4, color: connected ? 0xfacc15 : 0xffffff, alpha: 0.5 });
          node.body.position.set(x, y);
          node.label.position.set(x, y);
          node.label.alpha = player.isEliminated ? 0.45 : 1;
          node.bubble.text = player.chatBubble || player.emote || "";
          node.bubble.position.set(x, y - 42);
          node.bubble.alpha = node.bubble.text ? 1 : 0;
        }

        for (const [userId, node] of playerNodes) {
          if (!players.some((player) => player.userId === userId)) {
            node.body.destroy();
            node.label.destroy();
            node.bubble.destroy();
            playerNodes.delete(userId);
          }
        }
      };

      app.ticker.add(draw);
      draw();
      return () => {
        app.ticker.remove(draw);
      };
    },
    [players],
  );

  const sendDraft = () => {
    const body = draft.trim();
    if (!body) return;
    onChat(body);
    setDraft("");
  };

  return (
    <main className="fixed inset-0 z-50 h-dvh w-screen overflow-hidden bg-[#111318] text-white">
      <GameCanvas
        ariaLabel="Salle live 2D"
        className="absolute inset-0 h-full w-full touch-none"
        onPointerDown={move}
        onPointerMove={(event) => {
          if (event.buttons === 1) move(event);
        }}
        onReady={renderPixi}
        fallback={<div className="absolute inset-0 bg-[#111318]" />}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <div className="pointer-events-auto border-2 border-white/15 bg-black/70 px-3 py-2 shadow-lg">
          <p className="font-head text-xs uppercase text-white/60">Phase</p>
          <p className="font-head text-lg uppercase">{snap?.phase ?? status}</p>
        </div>
        <div className="pointer-events-auto min-w-0 border-2 border-white/15 bg-black/70 px-3 py-2 text-right shadow-lg">
          <p className="font-head text-xs uppercase text-white/60">Round {snap?.roundNum ?? 0}</p>
          <p className="truncate font-head text-lg uppercase">{currentGameName || "Salle d'attente"}</p>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 right-3 grid gap-2">
        {children && (
          <div className="max-h-[42dvh] overflow-hidden border-2 border-white/15 bg-black/78 p-3 shadow-xl">
            {children}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <button className="grid size-11 place-items-center border-2 border-white/20 bg-black/75" onClick={() => setRosterOpen((v) => !v)} aria-label="Joueurs">
              <Users size={18} />
            </button>
            <button className="grid size-11 place-items-center border-2 border-white/20 bg-black/75" onClick={() => setChatOpen((v) => !v)} aria-label="Discussion">
              <MessageCircle size={18} />
            </button>
            <button className="grid size-11 place-items-center border-2 border-white/20 bg-black/75" onClick={() => onPing("here")} aria-label="Ping">
              <Target size={18} />
            </button>
          </div>
          <div className="border-2 border-white/20 bg-black/75 px-3 py-2 font-head text-xs uppercase">
            <Radio className="mr-1 inline size-3" /> {activePlayers.length}/{players.length}
          </div>
        </div>
      </div>

      {rosterOpen && (
        <aside className="absolute left-3 top-20 max-h-[55dvh] w-56 overflow-hidden border-2 border-white/15 bg-black/82 p-2">
          {players.map((player) => (
            <div key={player.userId} className="flex items-center gap-2 border-b border-white/10 py-2 last:border-b-0">
              <div className="grid size-8 place-items-center overflow-hidden border border-white/20 bg-white/10 font-head text-xs">
                {player.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={player.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(player)
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{player.displayName}</p>
                <p className="text-xs uppercase text-white/50">{player.connectionStatus}</p>
              </div>
            </div>
          ))}
        </aside>
      )}

      {chatOpen && (
        <aside className="absolute bottom-20 left-3 right-3 max-h-[52dvh] overflow-hidden border-2 border-white/15 bg-black/86 p-3 md:left-auto md:w-96">
          <div className="grid max-h-60 gap-2 overflow-y-auto pr-1">
            {chatMessages.slice(-20).map((message) => (
              <div key={message.id} className="text-sm">
                <span className="font-bold text-[#facc15]">{message.displayName}: </span>
                <span>{message.body}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {quickMessages.map((message) => (
              <button key={message} className="border border-white/15 px-2 py-1 text-xs" onClick={() => onChat(message, true)}>
                {message}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendDraft();
              }}
              className="min-w-0 flex-1 border-2 border-white/15 bg-white px-3 text-sm text-black"
              maxLength={160}
            />
            <button className="grid size-10 place-items-center border-2 border-white/15 bg-[#facc15] text-black" onClick={sendDraft} aria-label="Envoyer">
              <Send size={16} />
            </button>
          </div>
        </aside>
      )}
    </main>
  );
}
