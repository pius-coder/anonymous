export const ROOM_TILE_SIZE = 48;
export const ROOM_MAP_WIDTH = 64;
export const ROOM_MAP_HEIGHT = 40;
export const ROOM_WORLD_WIDTH = ROOM_MAP_WIDTH * ROOM_TILE_SIZE;
export const ROOM_WORLD_HEIGHT = ROOM_MAP_HEIGHT * ROOM_TILE_SIZE;
export const ROOM_PLAYER_RADIUS = 13;
export const ROOM_PLAYER_SPEED = 190;

export type RoomPoint = { x: number; y: number };
export type RoomMovementInput = { x: number; y: number };

const collision = new Uint8Array(ROOM_MAP_WIDTH * ROOM_MAP_HEIGHT);

function block(col: number, row: number): void {
  if (col < 0 || row < 0 || col >= ROOM_MAP_WIDTH || row >= ROOM_MAP_HEIGHT) return;
  collision[row * ROOM_MAP_WIDTH + col] = 1;
}

function horizontal(row: number, from: number, to: number, doors: number[] = []): void {
  for (let col = from; col <= to; col += 1) {
    if (!doors.includes(col)) block(col, row);
  }
}

function vertical(col: number, from: number, to: number, doors: number[] = []): void {
  for (let row = from; row <= to; row += 1) {
    if (!doors.includes(row)) block(col, row);
  }
}

for (let col = 0; col < ROOM_MAP_WIDTH; col += 1) {
  block(col, 0);
  block(col, ROOM_MAP_HEIGHT - 1);
}
for (let row = 1; row < ROOM_MAP_HEIGHT - 1; row += 1) {
  block(0, row);
  block(ROOM_MAP_WIDTH - 1, row);
}

// Four social alcoves surround an open central concourse. Wide doors prevent crowding.
horizontal(10, 3, 25, [13, 14, 15]);
horizontal(10, 38, 60, [48, 49, 50]);
horizontal(29, 3, 25, [13, 14, 15]);
horizontal(29, 38, 60, [48, 49, 50]);
vertical(20, 11, 28, [19, 20, 21]);
vertical(43, 11, 28, [19, 20, 21]);

// Central briefing stage and furniture islands are physical obstacles.
for (let col = 28; col <= 35; col += 1) {
  block(col, 16);
  block(col, 22);
}
for (let row = 17; row <= 21; row += 1) {
  block(28, row);
  block(35, row);
}
[
  [7, 6], [8, 6], [7, 7],
  [55, 6], [56, 6], [56, 7],
  [7, 33], [8, 33], [8, 34],
  [55, 33], [56, 33], [55, 34],
].forEach(([col, row]) => block(col, row));

export const ROOM_COLLISION_GRID: Readonly<Uint8Array> = collision;

export const ROOM_SPAWNS: readonly RoomPoint[] = [
  { x: 32 * ROOM_TILE_SIZE, y: 26 * ROOM_TILE_SIZE },
  { x: 30 * ROOM_TILE_SIZE, y: 26 * ROOM_TILE_SIZE },
  { x: 34 * ROOM_TILE_SIZE, y: 26 * ROOM_TILE_SIZE },
  { x: 32 * ROOM_TILE_SIZE, y: 13 * ROOM_TILE_SIZE },
  { x: 24 * ROOM_TILE_SIZE, y: 20 * ROOM_TILE_SIZE },
  { x: 40 * ROOM_TILE_SIZE, y: 20 * ROOM_TILE_SIZE },
];

export function isRoomTileBlocked(col: number, row: number): boolean {
  if (col < 0 || row < 0 || col >= ROOM_MAP_WIDTH || row >= ROOM_MAP_HEIGHT) return true;
  return collision[row * ROOM_MAP_WIDTH + col] === 1;
}

export function canOccupyRoomPosition(
  x: number,
  y: number,
  radius = ROOM_PLAYER_RADIUS,
): boolean {
  const samples = [
    [x - radius, y - radius],
    [x + radius, y - radius],
    [x - radius, y + radius],
    [x + radius, y + radius],
  ];
  return samples.every(([sampleX, sampleY]) =>
    !isRoomTileBlocked(
      Math.floor(sampleX / ROOM_TILE_SIZE),
      Math.floor(sampleY / ROOM_TILE_SIZE),
    ));
}

export function resolveRoomMovement(
  current: RoomPoint,
  input: RoomMovementInput,
  deltaMs: number,
): RoomPoint {
  const magnitude = Math.hypot(input.x, input.y);
  if (magnitude === 0 || !Number.isFinite(magnitude)) return current;

  const scale = ROOM_PLAYER_SPEED * Math.min(Math.max(deltaMs, 0), 100) / 1000 / Math.max(1, magnitude);
  const nextX = current.x + input.x * scale;
  const nextY = current.y + input.y * scale;
  const resolved = { ...current };

  if (canOccupyRoomPosition(nextX, current.y)) resolved.x = nextX;
  if (canOccupyRoomPosition(resolved.x, nextY)) resolved.y = nextY;
  return resolved;
}
