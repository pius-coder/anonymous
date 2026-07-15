"use client";

import { useEffect, useRef, useState } from "react";
import {
  Application,
  Assets,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Text,
  Texture,
} from "pixi.js";

const TILE = 48;
const COLS = 12;
const ROWS = 8;
const BUNDLE = "noya-social-room-v1";
let roomBundleRegistered = false;

const source = (index: number) =>
  `/game-assets/kenney-tiny-dungeon/Tiles/tile_${String(index).padStart(4, "0")}.png`;

type ArenaRoomCanvasProps = {
  displayName?: string;
};

export function ArenaRoomCanvas({ displayName = "Noya" }: ArenaRoomCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const hostElement = host;

    let disposed = false;
    let app: Application | undefined;

    async function mountRoom() {
      try {
        app = new Application();
        await app.init({
          resizeTo: hostElement,
          background: "#07110c",
          antialias: false,
          autoDensity: true,
          resolution: Math.min(globalThis.devicePixelRatio || 1, 2),
        });
        if (disposed) {
          app.destroy(true);
          return;
        }
        hostElement.appendChild(app.canvas);

        if (!roomBundleRegistered) {
          Assets.addBundle(BUNDLE, {
            floor: source(48),
            floorAlt: source(49),
            wall: source(16),
            wallAlt: source(28),
            crate: source(63),
            chair: source(72),
            table: source(75),
            localPlayer: source(84),
            playerTwo: source(85),
            playerThree: source(87),
            playerFour: source(98),
          });
          roomBundleRegistered = true;
        }
        const textures = await Assets.loadBundle(BUNDLE) as Record<string, Texture>;
        Object.values(textures).forEach((texture) => {
          texture.source.scaleMode = "nearest";
        });
        if (disposed || !app) return;

        const world = new Container();
        world.label = "social-room";
        app.stage.addChild(world);

        drawFloor(world, textures);
        drawWalls(world, textures);
        drawProps(world, textures);

        const local = createPlayer(textures.localPlayer, 3, 4, displayName, true);
        const players = [
          local,
          createPlayer(textures.playerTwo, 8, 2, "Malo"),
          createPlayer(textures.playerThree, 9, 5, "Aya"),
          createPlayer(textures.playerFour, 5, 2, "Sam"),
        ];
        players.forEach((player) => world.addChild(player));

        let targetX = local.x;
        let targetY = local.y;
        world.eventMode = "static";
        world.hitArea = new Rectangle(0, 0, COLS * TILE, ROWS * TILE);
        world.cursor = "crosshair";
        world.on("pointertap", (event) => {
          const point = world.toLocal(event.global);
          targetX = clamp(point.x, TILE * 1.2, TILE * (COLS - 1.2));
          targetY = clamp(point.y, TILE * 1.2, TILE * (ROWS - 1.2));
        });

        app.ticker.add((ticker) => {
          const smoothing = Math.min(1, ticker.deltaTime * 0.12);
          local.x += (targetX - local.x) * smoothing;
          local.y += (targetY - local.y) * smoothing;
        });

        const resizeWorld = () => {
          if (!app) return;
          const scale = Math.min(
            app.screen.width / (COLS * TILE),
            app.screen.height / (ROWS * TILE),
          );
          world.scale.set(scale);
          world.position.set(
            Math.round((app.screen.width - COLS * TILE * scale) / 2),
            Math.round((app.screen.height - ROWS * TILE * scale) / 2),
          );
        };
        app.renderer.on("resize", resizeWorld);
        resizeWorld();
        setReady(true);
      } catch (error) {
        if (!disposed) {
          setFailure(error instanceof Error ? error.message : "Impossible de charger la room 2D");
        }
      }
    }

    void mountRoom();
    return () => {
      disposed = true;
      setReady(false);
      if (app) {
        app.destroy(true, { children: true, texture: false, textureSource: false });
      }
    };
  }, [displayName]);

  return (
    <div className="arena-canvas-shell">
      <div ref={hostRef} className="arena-canvas" aria-label="Room sociale interactive en 2D" />
      {!ready && !failure ? <span className="arena-status">Chargement de la room…</span> : null}
      {failure ? <span className="arena-status arena-status--error">{failure}</span> : null}
      {ready ? <span className="arena-help">Cliquez dans la room pour vous déplacer</span> : null}
    </div>
  );
}

function drawFloor(world: Container, textures: Record<string, Texture>) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const tile = new Sprite((row + col) % 7 === 0 ? textures.floorAlt : textures.floor);
      tile.position.set(col * TILE, row * TILE);
      tile.width = TILE;
      tile.height = TILE;
      world.addChild(tile);
    }
  }
}

function drawWalls(world: Container, textures: Record<string, Texture>) {
  for (let col = 0; col < COLS; col += 1) {
    addTile(world, col, 0, col % 3 === 0 ? textures.wallAlt : textures.wall);
    addTile(world, col, ROWS - 1, textures.wall);
  }
  for (let row = 1; row < ROWS - 1; row += 1) {
    addTile(world, 0, row, textures.wall);
    addTile(world, COLS - 1, row, textures.wallAlt);
  }
}

function drawProps(world: Container, textures: Record<string, Texture>) {
  [
    [2, 2, textures.chair],
    [2, 3, textures.table],
    [7, 4, textures.crate],
    [8, 4, textures.crate],
    [7, 5, textures.chair],
  ].forEach(([col, row, texture]) => addTile(world, col as number, row as number, texture as Texture));

  const stage = new Graphics()
    .roundRect(TILE * 4.2, TILE * 0.9, TILE * 3.6, TILE * 1.25, 8)
    .fill({ color: 0x173b27, alpha: 0.92 })
    .stroke({ color: 0x69f58d, width: 3 });
  world.addChild(stage);
  const label = new Text({
    text: "NOYA ROOM",
    style: { fontFamily: "monospace", fontSize: 16, fill: 0xbfffcf, fontWeight: "700" },
  });
  label.anchor.set(0.5);
  label.position.set(TILE * 6, TILE * 1.52);
  world.addChild(label);
}

function addTile(world: Container, col: number, row: number, texture: Texture) {
  const tile = new Sprite(texture);
  tile.position.set(col * TILE, row * TILE);
  tile.width = TILE;
  tile.height = TILE;
  world.addChild(tile);
}

function createPlayer(
  texture: Texture,
  col: number,
  row: number,
  name: string,
  isLocal = false,
) {
  const player = new Container();
  player.position.set(col * TILE + TILE / 2, row * TILE + TILE / 2);

  if (isLocal) {
    const ring = new Graphics().circle(0, 8, 18).stroke({ color: 0x69f58d, width: 3, alpha: 0.9 });
    player.addChild(ring);
  }

  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5, 0.75);
  sprite.scale.set(3);
  player.addChild(sprite);

  const tag = new Text({
    text: name,
    style: {
      fontFamily: "monospace",
      fontSize: 10,
      fill: isLocal ? 0x07110c : 0xeffff4,
      fontWeight: "700",
      padding: 2,
    },
  });
  tag.anchor.set(0.5);
  tag.position.set(0, -30);
  const tagBackground = new Graphics()
    .roundRect(-tag.width / 2 - 4, -36, tag.width + 8, 15, 4)
    .fill({ color: isLocal ? 0x69f58d : 0x07110c, alpha: 0.92 });
  player.addChild(tagBackground, tag);
  return player;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
