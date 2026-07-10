"use client";

import { useCallback, useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { GameCanvas, type PixiGameHandle } from "@/components/games/pixi/GameCanvas";
import type { LivePlayer } from "@/hooks/useGameRoom";
import type { SocialGroup } from "./social-model";

const WORLD = { width: 1000, height: 700 };
const PLAYER_RENDER_LIMIT = 28;

const GROUP_COLORS: Record<SocialGroup["accent"], number> = {
  pink: 0xed1b76,
  teal: 0x0f9b8e,
  gold: 0xffd12e,
  violet: 0x9e7cff,
};

function initials(player: Pick<LivePlayer, "displayName" | "userId">) {
  return (player.displayName || player.userId).slice(0, 2).toUpperCase();
}

export function selectVisibleMapPlayers(
  players: LivePlayer[],
  groups: SocialGroup[],
  localPlayerId?: string,
  selectedPlayerId?: string,
  limit = PLAYER_RENDER_LIMIT,
) {
  if (players.length <= limit) return players;
  const local = players.find((player) => player.userId === localPlayerId);
  const localGroup = groups.find((group) => group.memberIds.includes(localPlayerId ?? ""));
  const byDistance = [...players].sort((a, b) => {
    if (!local) return a.displayName.localeCompare(b.displayName);
    return Math.hypot(a.x - local.x, a.y - local.y) - Math.hypot(b.x - local.x, b.y - local.y);
  });
  const orderedIds = [
    localPlayerId,
    selectedPlayerId,
    ...(localGroup?.memberIds ?? []),
    ...groups
      .map((group) => group.leaderId)
      .sort((a, b) => {
        const playerA = players.find((player) => player.userId === a);
        const playerB = players.find((player) => player.userId === b);
        if (!local || !playerA || !playerB) return 0;
        return Math.hypot(playerA.x - local.x, playerA.y - local.y) - Math.hypot(playerB.x - local.x, playerB.y - local.y);
      }),
    ...byDistance.filter((player) => !player.isEliminated).map((player) => player.userId),
  ];
  const visibleIds = new Set<string>();
  for (const id of orderedIds) {
    if (!id || visibleIds.has(id)) continue;
    visibleIds.add(id);
    if (visibleIds.size >= limit) break;
  }
  return players.filter((player) => visibleIds.has(player.userId));
}

export function SocialMapCanvas({
  players,
  groups,
  selectedPlayerId,
  localPlayerId,
  readOnly,
  onSelectPlayer,
  onMove,
}: {
  players: LivePlayer[];
  groups: SocialGroup[];
  selectedPlayerId?: string;
  localPlayerId?: string;
  readOnly?: boolean;
  onSelectPlayer: (playerId: string) => void;
  onMove: (point: { x: number; y: number }) => void;
}) {
  const liveRef = useRef({ players, groups, selectedPlayerId, localPlayerId });

  useEffect(() => {
    liveRef.current = { players, groups, selectedPlayerId, localPlayerId };
  }, [groups, localPlayerId, players, selectedPlayerId]);

  const onReady = useCallback(({ app, pixi }: PixiGameHandle) => {
    const world = new pixi.Container();
    const backdrop = new pixi.Graphics();
    const zones = new pixi.Graphics();
    const paths = new pixi.Graphics();
    const labels = new pixi.Container();
    const clusterLayer = new pixi.Container();
    const playerLayer = new pixi.Container();
    const playerNodes = new Map<
      string,
      {
        body: InstanceType<typeof pixi.Graphics>;
        ring: InstanceType<typeof pixi.Graphics>;
        label: InstanceType<typeof pixi.Text>;
        bubble: InstanceType<typeof pixi.Text>;
        currentX: number;
        currentY: number;
      }
    >();
    const clusterNodes = new Map<
      string,
      { body: InstanceType<typeof pixi.Graphics>; label: InstanceType<typeof pixi.Text> }
    >();

    world.addChild(backdrop, paths, zones, labels, clusterLayer, playerLayer);
    app.stage.addChild(world);

    const drawEnvironment = () => {
      const scaleX = app.screen.width / WORLD.width;
      const scaleY = app.screen.height / WORLD.height;
      world.scale.set(scaleX, scaleY);

      backdrop.clear();
      backdrop.rect(0, 0, WORLD.width, WORLD.height).fill({ color: 0x090b12 });
      backdrop.circle(500, 348, 328).fill({ color: 0x111723, alpha: 0.96 });
      backdrop.circle(500, 348, 330).stroke({ width: 3, color: 0xffffff, alpha: 0.08 });
      backdrop.circle(500, 348, 300).stroke({ width: 1, color: 0x64d9ff, alpha: 0.1 });

      for (let x = 30; x < WORLD.width; x += 44) {
        backdrop.moveTo(x, 0).lineTo(x, WORLD.height).stroke({ width: 1, color: 0xffffff, alpha: 0.025 });
      }
      for (let y = 28; y < WORLD.height; y += 44) {
        backdrop.moveTo(0, y).lineTo(WORLD.width, y).stroke({ width: 1, color: 0xffffff, alpha: 0.025 });
      }

      paths.clear();
      paths.moveTo(500, 85).bezierCurveTo(420, 170, 390, 260, 500, 350).stroke({ width: 8, color: 0xffffff, alpha: 0.055 });
      paths.moveTo(500, 350).bezierCurveTo(625, 380, 660, 475, 735, 545).stroke({ width: 8, color: 0xffffff, alpha: 0.055 });
      paths.moveTo(500, 350).bezierCurveTo(370, 390, 340, 485, 250, 555).stroke({ width: 8, color: 0xffffff, alpha: 0.055 });
      paths.moveTo(500, 350).bezierCurveTo(600, 250, 675, 205, 765, 180).stroke({ width: 8, color: 0xffffff, alpha: 0.055 });

      zones.clear();
      for (const child of labels.removeChildren()) child.destroy();

      for (const group of liveRef.current.groups) {
        const color = GROUP_COLORS[group.accent];
        zones.circle(group.zone.x, group.zone.y, group.zone.radius).fill({ color, alpha: 0.065 });
        zones.circle(group.zone.x, group.zone.y, group.zone.radius).stroke({ width: 3, color, alpha: 0.42 });
        zones.circle(group.zone.x, group.zone.y, group.zone.radius - 11).stroke({ width: 1, color, alpha: 0.18 });
        const label = new pixi.Text({
          text: `${group.name.toUpperCase()}  ${group.memberIds.length}/${group.maxMembers}`,
          style: {
            fill: "#ffffff",
            fontFamily: "Arial",
            fontSize: 13,
            fontWeight: "700",
            letterSpacing: 1.2,
          },
        });
        label.anchor.set(0.5);
        label.position.set(group.zone.x, group.zone.y - group.zone.radius + 22);
        label.alpha = 0.72;
        labels.addChild(label);
      }
    };

    const updateClusters = (hiddenPlayers: LivePlayer[]) => {
      const clusters = new Map<string, { count: number; x: number; y: number }>();
      for (const player of hiddenPlayers) {
        if (player.isEliminated) continue;
        const column = Math.max(0, Math.min(4, Math.floor(player.x / 200)));
        const row = Math.max(0, Math.min(3, Math.floor(player.y / 175)));
        const key = `${column}:${row}`;
        const cluster = clusters.get(key) ?? { count: 0, x: 0, y: 0 };
        cluster.count += 1;
        cluster.x += player.x;
        cluster.y += player.y;
        clusters.set(key, cluster);
      }

      for (const [key, cluster] of clusters) {
        let node = clusterNodes.get(key);
        if (!node) {
          const body = new pixi.Graphics();
          const label = new pixi.Text({
            text: "",
            style: { fill: "#ffffff", fontFamily: "Arial", fontSize: 12, fontWeight: "800" },
          });
          label.anchor.set(0.5);
          clusterLayer.addChild(body, label);
          node = { body, label };
          clusterNodes.set(key, node);
        }
        const x = cluster.x / cluster.count;
        const y = cluster.y / cluster.count;
        node.body.clear();
        node.body.circle(0, 0, 21).fill({ color: 0x202838, alpha: 0.88 });
        node.body.circle(0, 0, 21).stroke({ width: 2, color: 0x64d9ff, alpha: 0.45 });
        node.body.position.set(x, y);
        node.label.text = `+${cluster.count}`;
        node.label.position.set(x, y);
      }

      for (const [key, node] of clusterNodes) {
        if (clusters.has(key)) continue;
        node.body.destroy();
        node.label.destroy();
        clusterNodes.delete(key);
      }
    };

    let width = 0;
    let height = 0;
    const draw = () => {
      if (width !== app.screen.width || height !== app.screen.height) {
        width = app.screen.width;
        height = app.screen.height;
        drawEnvironment();
      }

      const state = liveRef.current;
      const visiblePlayers = selectVisibleMapPlayers(
        state.players,
        state.groups,
        state.localPlayerId,
        state.selectedPlayerId,
      );
      const visibleIds = new Set(visiblePlayers.map((player) => player.userId));
      updateClusters(state.players.filter((player) => !visibleIds.has(player.userId)));

      for (const player of visiblePlayers) {
        let node = playerNodes.get(player.userId);
        if (!node) {
          const ring = new pixi.Graphics();
          const body = new pixi.Graphics();
          const label = new pixi.Text({
            text: initials(player),
            style: { fill: "#ffffff", fontFamily: "Arial", fontSize: 14, fontWeight: "800" },
          });
          const bubble = new pixi.Text({
            text: "",
            style: { fill: "#ffffff", fontFamily: "Arial", fontSize: 12, fontWeight: "700" },
          });
          label.anchor.set(0.5);
          bubble.anchor.set(0.5);
          playerLayer.addChild(ring, body, label, bubble);
          node = { ring, body, label, bubble, currentX: player.x ?? 500, currentY: player.y ?? 350 };
          playerNodes.set(player.userId, node);
        }

        const targetX = Math.max(32, Math.min(WORLD.width - 32, player.x ?? 500));
        const targetY = Math.max(42, Math.min(WORLD.height - 42, player.y ?? 350));
        node.currentX += (targetX - node.currentX) * 0.18;
        node.currentY += (targetY - node.currentY) * 0.18;
        const selected = state.selectedPlayerId === player.userId;
        const local = state.localPlayerId === player.userId;
        const connected = player.connectionStatus === "CONNECTED" || player.connectionStatus === "READY";
        const group = state.groups.find((item) => item.memberIds.includes(player.userId));
        const color = group ? GROUP_COLORS[group.accent] : 0x64d9ff;

        node.ring.clear();
        if (selected || local) {
          node.ring.circle(0, 0, selected ? 37 : 34).stroke({
            width: selected ? 4 : 2,
            color: selected ? 0xffd12e : 0xffffff,
            alpha: selected ? 0.95 : 0.55,
          });
          node.ring.circle(0, 0, selected ? 43 : 39).stroke({ width: 1, color, alpha: 0.35 });
        }
        node.ring.position.set(node.currentX, node.currentY);

        node.body.clear();
        node.body.circle(0, 0, local ? 27 : 24).fill({
          color: player.isEliminated ? 0x5d2630 : connected ? color : 0x555963,
          alpha: player.isEliminated ? 0.46 : 1,
        });
        node.body.circle(0, 0, local ? 27 : 24).stroke({ width: 3, color: 0xffffff, alpha: local ? 0.8 : 0.24 });
        if (group?.leaderId === player.userId) {
          node.body.poly([0, -38, 7, -30, 0, -24, -7, -30]).fill({ color: 0xffd12e });
        }
        node.body.position.set(node.currentX, node.currentY);

        node.label.text = initials(player);
        node.label.position.set(node.currentX, node.currentY);
        node.label.alpha = player.isEliminated ? 0.45 : 1;
        node.bubble.text = player.chatBubble || player.emote || (selected ? player.displayName : "");
        node.bubble.position.set(node.currentX, node.currentY - 47);
        node.bubble.alpha = node.bubble.text ? 1 : 0;
      }

      for (const [userId, node] of playerNodes) {
        if (visibleIds.has(userId)) continue;
        node.body.destroy();
        node.ring.destroy();
        node.label.destroy();
        node.bubble.destroy();
        playerNodes.delete(userId);
      }
    };

    const onResize = () => drawEnvironment();
    window.addEventListener("resize", onResize);
    app.ticker.add(draw);
    drawEnvironment();
    draw();

    return () => {
      window.removeEventListener("resize", onResize);
      app.ticker.remove(draw);
    };
  }, []);

  const visiblePlayers = useMemo(
    () => selectVisibleMapPlayers(players, groups, localPlayerId, selectedPlayerId),
    [groups, localPlayerId, players, selectedPlayerId],
  );

  const clickMap = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const point = {
        x: Math.round(((event.clientX - rect.left) / rect.width) * WORLD.width),
        y: Math.round(((event.clientY - rect.top) / rect.height) * WORLD.height),
      };
      const closest = visiblePlayers
        .map((player) => ({ player, distance: Math.hypot((player.x ?? 0) - point.x, (player.y ?? 0) - point.y) }))
        .sort((a, b) => a.distance - b.distance)[0];
      if (closest && closest.distance < 62) {
        onSelectPlayer(closest.player.userId);
        return;
      }
      if (!readOnly) onMove(point);
    },
    [onMove, onSelectPlayer, readOnly, visiblePlayers],
  );

  const fallback = useMemo(
    () => (
      <div className="grid h-full place-items-center bg-[#090b12] text-center text-sm text-white/55">
        <div>
          <p className="font-head text-lg uppercase text-white">Carte 2D indisponible</p>
          <p>Le lobby reste accessible via les panneaux sociaux.</p>
        </div>
      </div>
    ),
    [],
  );

  return (
    <GameCanvas
      ariaLabel="Carte sociale 2D du lobby"
      className="absolute inset-0 h-full w-full touch-none"
      onPointerDown={clickMap}
      onReady={onReady}
      fallback={fallback}
    />
  );
}
