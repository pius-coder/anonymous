"use client";

import { useRef, useState, type PointerEvent } from "react";
import { setVirtualJoystick } from "./phaser/room-controls";

const TRAVEL = 42;

export function MobileJoystick() {
  const baseRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  function update(event: PointerEvent<HTMLDivElement>) {
    const base = baseRef.current;
    if (!base) return;
    const bounds = base.getBoundingClientRect();
    const x = event.clientX - (bounds.left + bounds.width / 2);
    const y = event.clientY - (bounds.top + bounds.height / 2);
    const distance = Math.hypot(x, y);
    const scale = distance > TRAVEL ? TRAVEL / distance : 1;
    const next = { x: x * scale, y: y * scale };
    setKnob(next);
    const magnitude = Math.hypot(next.x, next.y);
    const active = magnitude > 8;
    setVirtualJoystick(active ? { x: next.x / TRAVEL, y: next.y / TRAVEL } : { x: 0, y: 0 });
  }

  function release(event: PointerEvent<HTMLDivElement>) {
    if (pointerRef.current !== event.pointerId) return;
    pointerRef.current = null;
    setKnob({ x: 0, y: 0 });
    setVirtualJoystick({ x: 0, y: 0 });
  }

  return (
    <div
      ref={baseRef}
      className="mobile-joystick"
      aria-label="Joystick de déplacement"
      onPointerDown={(event) => {
        pointerRef.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        update(event);
      }}
      onPointerMove={(event) => {
        if (pointerRef.current === event.pointerId) update(event);
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <span style={{ transform: `translate3d(${knob.x}px, ${knob.y}px, 0)` }} />
    </div>
  );
}
