export type Direction = { x: number; y: number };

let joystick: Direction = { x: 0, y: 0 };

export function setVirtualJoystick(direction: Direction): void {
  joystick = direction;
}

export function getVirtualJoystick(): Direction {
  return joystick;
}

export function resetVirtualJoystick(): void {
  joystick = { x: 0, y: 0 };
}
