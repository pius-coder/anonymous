import * as Phaser from "phaser";
import { Client, getStateCallbacks, type Room } from "@colyseus/sdk";
import {
  ROOM_COLLISION_GRID,
  ROOM_MAP_HEIGHT,
  ROOM_MAP_WIDTH,
  ROOM_PLAYER_SPEED,
  ROOM_SPAWNS,
  ROOM_TILE_SIZE,
  ROOM_WORLD_HEIGHT,
  ROOM_WORLD_WIDTH,
} from "@session-jeu/game-engine";
import {
  buildJoinOptions,
  GAME_ROOM_NAME,
  requestLiveAccess,
} from "../live-room-facade";
import { getVirtualJoystick, resetVirtualJoystick } from "./room-controls";

type ConnectionState = "connecting" | "connected" | "reconnecting" | "offline";

type PlayerView = {
  sessionId: string;
  x: number;
  y: number;
  facing: string;
  connected: boolean;
};

type LiveState = {
  connectedCount: number;
  players: Map<string, PlayerView>;
};

export type RoomGameOptions = {
  parent: HTMLElement;
  partyId: string;
  displayName: string;
  onConnectionChange: (state: ConnectionState) => void;
  onPlayerCountChange: (count: number) => void;
};

export type RoomGameHandle = {
  destroy: () => void;
  setMinimapVisible: (visible: boolean) => void;
  setReducedMotion: (reduced: boolean) => void;
};

const ASSET_ROOT = "/game-assets/kenney-tiny-dungeon";

export function createRoomGame(options: RoomGameOptions): RoomGameHandle {
  class SocialRoomScene extends Phaser.Scene {
    private localPlayer?: Phaser.Physics.Arcade.Sprite;
    private localRing?: Phaser.GameObjects.Arc;
    private wallLayer?: Phaser.Tilemaps.TilemapLayer;
    private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd?: Record<string, Phaser.Input.Keyboard.Key>;
    private minimap?: Phaser.Cameras.Scene2D.Camera;
    private room?: Room;
    private remotePlayers = new Map<string, Phaser.Physics.Arcade.Sprite>();
    private remoteTargets = new Map<string, { x: number; y: number }>();
    private sequence = 0;
    private lastSentAt = 0;
    private reducedMotion = false;
    private connected = false;

    constructor() {
      super("social-room");
    }

    preload() {
      this.load.spritesheet("dungeon", `${ASSET_ROOT}/Tilemap/tilemap_packed.png`, {
        frameWidth: 16,
        frameHeight: 16,
      });
    }

    create() {
      this.createMap();
      this.createPlayer();
      this.createCamera();
      this.createAmbientDetails();
      this.cursors = this.input.keyboard?.createCursorKeys();
      this.wasd = this.input.keyboard?.addKeys("W,A,S,D") as Record<string, Phaser.Input.Keyboard.Key>;
      this.input.keyboard?.addCapture(["UP", "DOWN", "LEFT", "RIGHT", "W", "A", "S", "D"]);
      void this.connectLive();
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        resetVirtualJoystick();
        if (this.room) void this.room.leave(true);
      });
    }

    update(_time: number, delta: number) {
      const input = this.readDirection();
      if (this.localPlayer) {
        this.localPlayer.setVelocity(input.x * ROOM_PLAYER_SPEED, input.y * ROOM_PLAYER_SPEED);
        const body = this.localPlayer.body as Phaser.Physics.Arcade.Body;
        if (!this.connected) body.velocity.normalize().scale(
          input.x === 0 && input.y === 0 ? 0 : ROOM_PLAYER_SPEED,
        );
        this.localRing?.setPosition(this.localPlayer.x, this.localPlayer.y + 13);
      }

      this.lastSentAt += delta;
      if (this.room && this.lastSentAt >= 50) {
        this.lastSentAt = 0;
        this.sequence += 1;
        this.room.send("room:move", { sequence: this.sequence, x: input.x, y: input.y });
      }

      for (const [sessionId, sprite] of this.remotePlayers) {
        const target = this.remoteTargets.get(sessionId);
        if (!target) continue;
        const amount = this.reducedMotion ? 1 : 0.18;
        sprite.x = Phaser.Math.Linear(sprite.x, target.x, amount);
        sprite.y = Phaser.Math.Linear(sprite.y, target.y, amount);
      }
    }

    setMinimapVisible(visible: boolean) {
      this.minimap?.setVisible(visible);
    }

    setReducedMotion(reduced: boolean) {
      this.reducedMotion = reduced;
    }

    private createMap() {
      const ground = Array.from({ length: ROOM_MAP_HEIGHT }, (_, row) =>
        Array.from({ length: ROOM_MAP_WIDTH }, (_, col) => (row + col) % 9 === 0 ? 49 : 48),
      );
      const walls = Array.from({ length: ROOM_MAP_HEIGHT }, (_, row) =>
        Array.from({ length: ROOM_MAP_WIDTH }, (_, col) =>
          ROOM_COLLISION_GRID[row * ROOM_MAP_WIDTH + col] ? 16 + ((row + col) % 2) * 12 : -1,
        ),
      );
      const map = this.make.tilemap({ data: ground, tileWidth: 16, tileHeight: 16 });
      const tiles = map.addTilesetImage("dungeon", "dungeon", 16, 16, 0, 0);
      if (!tiles) throw new Error("Le tileset Kenney est indisponible");
      map.createLayer(0, tiles)?.setScale(ROOM_TILE_SIZE / 16).setDepth(0);
      const wallMap = this.make.tilemap({ data: walls, tileWidth: 16, tileHeight: 16 });
      const wallTiles = wallMap.addTilesetImage("dungeon", "dungeon", 16, 16, 0, 0);
      if (!wallTiles) throw new Error("Le tileset de collision est indisponible");
      this.wallLayer = wallMap.createLayer(0, wallTiles)?.setScale(ROOM_TILE_SIZE / 16).setDepth(3);
      this.wallLayer?.setCollisionByExclusion([-1]);
      this.physics.world.setBounds(0, 0, ROOM_WORLD_WIDTH, ROOM_WORLD_HEIGHT);
    }

    private createPlayer() {
      const spawn = ROOM_SPAWNS[0];
      this.localPlayer = this.physics.add.sprite(spawn.x, spawn.y, "dungeon", 84)
        .setScale(3)
        .setDepth(5)
        .setCollideWorldBounds(true);
      (this.localPlayer.body as Phaser.Physics.Arcade.Body).setSize(9, 10).setOffset(3.5, 5);
      if (this.wallLayer) this.physics.add.collider(this.localPlayer, this.wallLayer);
      this.localRing = this.add.circle(spawn.x, spawn.y + 13, 19, 0x69f58d, 0.12)
        .setStrokeStyle(2, 0x69f58d, 0.95)
        .setDepth(4)
        .setData("local-ring", true);
    }

    private createCamera() {
      const main = this.cameras.main;
      main.setBounds(0, 0, ROOM_WORLD_WIDTH, ROOM_WORLD_HEIGHT);
      main.setBackgroundColor("#07110c");
      main.setRoundPixels(true);
      if (this.localPlayer) main.startFollow(this.localPlayer, true, 0.12, 0.12);
      this.scale.on(Phaser.Scale.Events.RESIZE, (size: Phaser.Structs.Size) => {
        main.setZoom(size.width < 520 ? 1.18 : size.width < 900 ? 1.05 : 1.22);
        this.positionMinimap(size.width);
      });
      main.setZoom(this.scale.width < 520 ? 1.18 : 1.22);

      this.minimap = this.cameras.add(0, 0, 176, 112, false, "minimap");
      this.minimap.setBounds(0, 0, ROOM_WORLD_WIDTH, ROOM_WORLD_HEIGHT);
      this.minimap.setZoom(0.052).setBackgroundColor("#07110c").setRoundPixels(true);
      if (this.localPlayer) this.minimap.startFollow(this.localPlayer, true, 0.2, 0.2);
      this.positionMinimap(this.scale.width);
    }

    private positionMinimap(width: number) {
      if (!this.minimap) return;
      const compact = width < 700;
      const mapWidth = compact ? 116 : 176;
      const mapHeight = compact ? 82 : 112;
      this.minimap.setViewport(width - mapWidth - 16, compact ? 72 : 84, mapWidth, mapHeight);
    }

    private createAmbientDetails() {
      const zones = [
        { x: 9, y: 5, label: "SALON A" },
        { x: 54, y: 5, label: "SALON B" },
        { x: 9, y: 34, label: "ATELIER" },
        { x: 54, y: 34, label: "ARCADE" },
      ];
      for (const zone of zones) {
        this.add.image(zone.x * ROOM_TILE_SIZE, zone.y * ROOM_TILE_SIZE, "dungeon", 75)
          .setScale(3).setDepth(2);
        this.add.text(zone.x * ROOM_TILE_SIZE, (zone.y - 1) * ROOM_TILE_SIZE, zone.label, {
          fontFamily: "monospace", fontSize: "14px", color: "#bfffcf", backgroundColor: "#07110ccc",
          padding: { x: 8, y: 5 },
        }).setOrigin(0.5).setDepth(6);
      }
      this.add.text(32 * ROOM_TILE_SIZE, 19 * ROOM_TILE_SIZE, "NOYA SOCIAL HUB", {
        fontFamily: "monospace", fontSize: "18px", color: "#07110c", backgroundColor: "#69f58d",
        padding: { x: 12, y: 7 },
      }).setOrigin(0.5).setDepth(6);
    }

    private readDirection() {
      const virtual = getVirtualJoystick();
      let x = virtual.x;
      let y = virtual.y;
      if (this.cursors?.left.isDown || this.wasd?.A.isDown) x -= 1;
      if (this.cursors?.right.isDown || this.wasd?.D.isDown) x += 1;
      if (this.cursors?.up.isDown || this.wasd?.W.isDown) y -= 1;
      if (this.cursors?.down.isDown || this.wasd?.S.isDown) y += 1;
      const magnitude = Math.hypot(x, y);
      return magnitude > 1 ? { x: x / magnitude, y: y / magnitude } : { x, y };
    }

    private async connectLive() {
      options.onConnectionChange("connecting");
      const access = await requestLiveAccess(options.partyId);
      if (!access.success) {
        options.onPlayerCountChange(0);
        options.onConnectionChange("offline");
        return;
      }

      try {
        const client = new Client(access.data.endpoint);
        // Only partyId + connectionToken — never reconnectTimeout/maxClients/round fields.
        this.room = await client.joinOrCreate<LiveState>(
          GAME_ROOM_NAME,
          buildJoinOptions(options.partyId, access.data.connectionToken),
        );
        this.connected = true;
        options.onConnectionChange("connected");
        const callbacks = getStateCallbacks(this.room);
        callbacks(this.room.state).players.onAdd((player, sessionId) => {
          this.upsertNetworkPlayer(sessionId, player);
          callbacks(player).onChange(() => this.upsertNetworkPlayer(sessionId, player));
        }, true);
        callbacks(this.room.state).players.onRemove((_player, sessionId) => {
          this.remotePlayers.get(sessionId)?.destroy();
          this.remotePlayers.delete(sessionId);
          this.remoteTargets.delete(sessionId);
        });
        callbacks(this.room.state).listen("connectedCount", (count) => options.onPlayerCountChange(count));
        options.onPlayerCountChange(this.room.state.connectedCount);
        this.room.onDrop(() => options.onConnectionChange("reconnecting"));
        this.room.onReconnect(() => options.onConnectionChange("connected"));
        this.room.onLeave(() => {
          this.connected = false;
          options.onConnectionChange("offline");
        });
      } catch {
        options.onPlayerCountChange(0);
        options.onConnectionChange("offline");
      }
    }

    private upsertNetworkPlayer(sessionId: string, player: PlayerView) {
      if (sessionId === this.room?.sessionId && this.localPlayer) {
        const drift = Phaser.Math.Distance.Between(this.localPlayer.x, this.localPlayer.y, player.x, player.y);
        if (drift > 72 || this.reducedMotion) this.localPlayer.setPosition(player.x, player.y);
        else this.localPlayer.setPosition(
          Phaser.Math.Linear(this.localPlayer.x, player.x, 0.2),
          Phaser.Math.Linear(this.localPlayer.y, player.y, 0.2),
        );
        return;
      }
      let sprite = this.remotePlayers.get(sessionId);
      if (!sprite) {
        sprite = this.physics.add.sprite(player.x, player.y, "dungeon", 85 + this.remotePlayers.size % 3)
          .setScale(3).setDepth(5);
        this.remotePlayers.set(sessionId, sprite);
      }
      this.remoteTargets.set(sessionId, { x: player.x, y: player.y });
    }

  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: options.parent,
    width: options.parent.clientWidth,
    height: options.parent.clientHeight,
    backgroundColor: "#07110c",
    pixelArt: true,
    antialias: false,
    render: { roundPixels: true },
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scene: SocialRoomScene,
  });

  return {
    destroy: () => game.destroy(true, true),
    setMinimapVisible: (visible) => (game.scene.getScene("social-room") as SocialRoomScene).setMinimapVisible(visible),
    setReducedMotion: (reduced) => (game.scene.getScene("social-room") as SocialRoomScene).setReducedMotion(reduced),
  };
}
