"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  ArrowRight,
  Gamepad2,
  LogOut,
  Map,
  Maximize,
  MessageCircle,
  Mic,
  Settings,
  Users,
  Volume2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { PhaserRoomCanvas } from "./PhaserRoomCanvas";
import { MobileJoystick } from "./MobileJoystick";
import { PixelAvatar } from "@/components/ui/PixelAvatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type ConnectionState = "connecting" | "connected" | "reconnecting" | "preview" | "offline";

type RoomExperienceProps = {
  party: { id: string; code: string; name: string; game: string };
};

const participants = ["Vous", "Malo", "Aya", "Sam", "Inès", "Liam"];

const connectionCopy: Record<ConnectionState, string> = {
  connecting: "Connexion",
  connected: "Live",
  reconnecting: "Reconnexion",
  preview: "Aperçu local",
  offline: "Hors ligne",
};

export function RoomExperience({ party }: RoomExperienceProps) {
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [playerCount, setPlayerCount] = useState(0);
  const [panel, setPanel] = useState<"roster" | "chat" | "settings" | null>(null);
  const [minimapVisible, setMinimapVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [muted, setMuted] = useState(false);
  const onConnectionChange = useCallback((state: ConnectionState) => setConnection(state), []);
  const onPlayerCountChange = useCallback((count: number) => setPlayerCount(count), []);

  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  }

  return (
    <main className="game-shell">
      <PhaserRoomCanvas
        partyId={party.id}
        displayName="Vous"
        minimapVisible={minimapVisible}
        reducedMotion={reducedMotion}
        onConnectionChange={onConnectionChange}
        onPlayerCountChange={onPlayerCountChange}
      />

      <header className="game-hud game-hud--top">
        <div className="game-party-chip">
          <Gamepad2 />
          <span><small>ROOM {party.code}</small><strong>{party.name}</strong></span>
        </div>
        <div className="game-hud-actions">
          <button
            className={`game-connection game-connection--${connection}`}
            type="button"
            aria-label={`État réseau: ${connectionCopy[connection]}`}
            data-connection-state={connection}
            data-live-preview={connection === "preview" ? "true" : "false"}
          >
            {connection === "connected" ? <Wifi /> : <WifiOff />}
            <span>{connectionCopy[connection]}</span>
          </button>
          <button className="game-icon-button" type="button" onClick={() => setPanel("roster")} aria-label="Voir les joueurs">
            <Users /><b>{playerCount}</b>
          </button>
          <button className="game-icon-button" type="button" onClick={() => setMinimapVisible((value) => !value)} aria-label="Afficher ou masquer la mini-carte" aria-pressed={minimapVisible}>
            <Map />
          </button>
          <button className="game-icon-button" type="button" onClick={() => setPanel("settings")} aria-label="Ouvrir les paramètres">
            <Settings />
          </button>
        </div>
      </header>

      <div className="game-zone-label"><span>FOYER</span><strong>{party.game}</strong></div>
      <MobileJoystick />
      <div className="game-action-dock">
        <button className={`game-round-button${muted ? " is-muted" : ""}`} type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? "Activer le micro" : "Couper le micro"}>
          <Mic />
        </button>
        <button className="game-round-button game-round-button--primary" type="button" onClick={() => setPanel("chat")} aria-label="Ouvrir la discussion">
          <MessageCircle />
        </button>
      </div>

      {connection === "connecting" || connection === "reconnecting" ? (
        <div className="game-status-overlay" role="status">
          <span className="game-spinner" />
          <strong>{connectionCopy[connection]}</strong>
        </div>
      ) : null}

      <Sheet open={panel !== null} onOpenChange={(open) => { if (!open) setPanel(null); }}>
        <SheetContent className="game-sheet" side="right">
          {panel === "roster" ? (
            <>
              <SheetHeader><SheetTitle>Présents</SheetTitle><SheetDescription>{playerCount || 6} joueurs dans la room</SheetDescription></SheetHeader>
              <div className="game-roster-list">
                {participants.map((name, index) => (
                  <div key={name}><PixelAvatar seed={name} size="sm" /><span><strong>{name}</strong><small>{index < 4 ? "Dans le foyer" : "Salon vocal"}</small></span><i /></div>
                ))}
              </div>
              <div className="game-sheet-footer"><Button render={<Link href={`/parties/${party.code}/round`} />}>Ouvrir le briefing <ArrowRight /></Button></div>
            </>
          ) : null}
          {panel === "chat" ? (
            <>
              <SheetHeader><SheetTitle>Discussion</SheetTitle><SheetDescription>Messages de la room</SheetDescription></SheetHeader>
              <div className="game-chat-log">
                <p><strong>Malo</strong><span>On se retrouve près du briefing.</span></p>
                <p><strong>Aya</strong><span>Prête pour la prochaine manche.</span></p>
              </div>
              <form className="game-chat-compose" onSubmit={(event) => event.preventDefault()}><label className="sr-only" htmlFor="room-message">Message</label><input id="room-message" placeholder="Votre message" /><Button type="submit" size="icon" aria-label="Envoyer"><ArrowRight /></Button></form>
            </>
          ) : null}
          {panel === "settings" ? (
            <>
              <SheetHeader><SheetTitle>Paramètres</SheetTitle><SheetDescription>Affichage et commandes de la room</SheetDescription></SheetHeader>
              <div className="game-settings-list">
                <label><span><Volume2 />Volume</span><input type="range" min="0" max="100" defaultValue="70" /></label>
                <label><span><Map />Mini-carte</span><input type="checkbox" checked={minimapVisible} onChange={(event) => setMinimapVisible(event.target.checked)} /></label>
                <label><span><Gamepad2 />Animations réduites</span><input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} /></label>
                <button type="button" onClick={() => void toggleFullscreen()}><Maximize />Plein écran</button>
              </div>
              <div className="game-sheet-footer"><Button variant="destructive" render={<Link href={`/parties/${party.code}`} />}><LogOut />Quitter la room</Button></div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </main>
  );
}
