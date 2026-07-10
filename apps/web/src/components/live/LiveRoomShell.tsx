"use client";

import { useMemo, useState, type ElementType, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Bell,
  ChevronDown,
  Gamepad2,
  LocateFixed,
  Map,
  MessageCircle,
  Radio,
  Shield,
  Target,
  UserRound,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { CountdownRing } from "@/components/game/motion-primitives";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/retroui/avatar";
import { Badge } from "@/components/retroui/badge";
import { Button } from "@/components/retroui/button";
import { SocialMapCanvas } from "@/components/social/SocialMapCanvas";
import { SocialPanelContent } from "@/components/social/SocialPanels";
import {
  buildSocialGroups,
  buildSocialRequests,
  groupForPlayer,
  socialGroupsFromLive,
  type SocialPanel,
  type SocialRequest,
} from "@/components/social/social-model";
import type { LiveChatChannel, LiveChatMessage, LivePlayer, LiveSnapshot, Status } from "@/hooks/useGameRoom";
import { cn } from "@/lib/utils";
import { juice } from "@/lib/juice";

type Props = {
  status: Status;
  snap: LiveSnapshot | null;
  currentGameName?: string;
  currentUserId?: string;
  eliminated?: boolean;
  chatMessages: LiveChatMessage[];
  onMove: (point: { x: number; y: number }) => void;
  onChat: (body: string, quick?: boolean, options?: { channel?: LiveChatChannel; targetUserId?: string; groupId?: string }) => void;
  onPing: (type: string, point?: { x: number; y: number }) => void;
  socialRequests?: SocialRequest[];
  onCreateGroup?: (name: string) => void;
  onApplyGroup?: (groupId: string) => void;
  onInvitePlayer?: (groupId: string, playerId: string) => void;
  onResolveGroupRequest?: (requestId: string, status: "ACCEPTED" | "REFUSED") => void;
  onLeaveGroup?: () => void;
  onLockGroup?: (groupId: string, locked: boolean) => void;
  children?: ReactNode;
};

const panelActions: Array<{
  panel: Exclude<SocialPanel, "NONE" | "PROFILE">;
  label: string;
  icon: ElementType;
}> = [
  { panel: "GROUPS", label: "Groupes", icon: Users },
  { panel: "PLAYERS", label: "Joueurs", icon: UserRound },
  { panel: "CHAT", label: "Chat", icon: MessageCircle },
  { panel: "REQUESTS", label: "Demandes", icon: Bell },
];

function initials(player?: Pick<LivePlayer, "displayName" | "userId">) {
  if (!player) return "SJ";
  return (player.displayName || player.userId).slice(0, 2).toUpperCase();
}

export function LiveRoomShell({
  status,
  snap,
  currentGameName,
  currentUserId,
  eliminated,
  chatMessages,
  onMove,
  onChat,
  onPing,
  socialRequests: externalSocialRequests,
  onCreateGroup,
  onApplyGroup,
  onInvitePlayer,
  onResolveGroupRequest,
  onLeaveGroup,
  onLockGroup,
  children,
}: Props) {
  const reduceMotion = useReducedMotion();
  const players = useMemo(() => snap?.players ?? [], [snap?.players]);
  const activePlayers = players.filter((player) => !player.isEliminated);
  const localPlayer = players.find((player) => player.userId === currentUserId) ?? activePlayers[0] ?? players[0];
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | undefined>();
  const [activePanel, setActivePanel] = useState<SocialPanel>("NONE");
  const [chatPeerId, setChatPeerId] = useState<string | undefined>();
  const [fallbackRequests, setFallbackRequests] = useState<SocialRequest[]>([]);
  const [gameExpanded, setGameExpanded] = useState(true);
  const [muted, setMuted] = useState(() => juice.isMuted);
  const [eliminationDismissed, setEliminationDismissed] = useState(false);

  const liveGroups = snap?.groups;
  const groups = useMemo(() => {
    if (liveGroups?.length) return socialGroupsFromLive(liveGroups);
    return buildSocialGroups(players);
  }, [liveGroups, players]);
  const selectedMapPlayerId = selectedPlayerId ?? localPlayer?.userId;
  const requests = externalSocialRequests ?? (fallbackRequests.length > 0 ? fallbackRequests : buildSocialRequests(players, groups));
  const currentGroup = localPlayer ? groupForPlayer(groups, localPlayer.userId) : undefined;
  const roundActive = Boolean(snap?.currentRoundId) || (snap?.roundNum ?? 0) > 0;
  const showGameSurface = Boolean(roundActive && children && gameExpanded);
  const showElimination = Boolean(eliminated && !eliminationDismissed);

  const openPlayer = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setActivePanel("PROFILE");
  };

  const focusOnMap = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setActivePanel("NONE");
    setGameExpanded(false);
  };

  const openChat = (playerId?: string) => {
    if (playerId) setChatPeerId(playerId);
    setActivePanel("CHAT");
  };

  const togglePanel = (panel: Exclude<SocialPanel, "NONE" | "PROFILE">) => {
    setActivePanel((current) => (current === panel ? "NONE" : panel));
  };

  return (
    <main className="fixed inset-0 z-50 h-dvh w-screen overflow-hidden bg-[--arena-ink] text-white">
      <div className="absolute inset-0">
        <SocialMapCanvas
          players={players}
          groups={groups}
          selectedPlayerId={selectedMapPlayerId}
          localPlayerId={localPlayer?.userId}
          readOnly={Boolean(eliminated)}
          onSelectPlayer={openPlayer}
          onMove={onMove}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_42%,rgba(0,0,0,.35)_100%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.11] [background-image:linear-gradient(rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:100%_4px]" />
      </div>

      <header className="safe-area-top pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 px-3 md:px-5">
        <div className="premium-toolbar pointer-events-auto flex min-w-0 items-center gap-3 px-3 py-2.5">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/45 bg-primary/18 shadow-[0_0_24px_rgba(237,27,118,.18)]">
            <Shield className="size-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-head text-sm font-black uppercase tracking-wide">Social Survivor</p>
            <div className="mt-0.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/45">
              <span className={cn("status-dot", status === "connected" ? "text-[--arena-green]" : "text-[--arena-gold]")} />
              <span>{status === "connected" ? "Connecté" : status}</span>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          {snap?.deadlineEpochMs ? (
            <div className="premium-toolbar pointer-events-auto hidden items-center gap-2 px-2.5 py-1.5 sm:flex">
              <CountdownRing
                deadlineEpochMs={snap.deadlineEpochMs}
                totalMs={30_000}
                className="size-12"
                label="Temps restant dans le round"
              />
              <div className="pr-1 text-right">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/42">Round</p>
                <p className="font-head text-lg font-black">{snap.roundNum}</p>
              </div>
            </div>
          ) : null}
          <div className="premium-toolbar pointer-events-auto max-w-[54vw] px-3 py-2.5 text-right md:max-w-sm">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/42">{snap?.phase ?? "Lobby"}</p>
            <p className="truncate font-head text-sm font-black uppercase md:text-base">{currentGameName || "Carte sociale"}</p>
          </div>
          <button
            type="button"
            className="premium-toolbar pointer-events-auto grid size-11 place-items-center text-white/65 hover:text-white"
            aria-label={muted ? "Activer les sons et vibrations" : "Couper les sons et vibrations"}
            onClick={() => {
              const next = !muted;
              setMuted(next);
              juice.setMuted(next);
              if (!next) juice.play("action_ok");
            }}
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
        </div>
      </header>

      {localPlayer && !showGameSurface && (
        <div className="pointer-events-none absolute bottom-24 left-3 z-10 hidden max-w-sm md:block">
          <button type="button" onClick={() => openPlayer(localPlayer.userId)} className="premium-floating pointer-events-auto flex w-full items-center gap-3 p-3 text-left">
            <Avatar className="size-12 border border-white/18">
              {localPlayer.avatarUrl ? <AvatarImage src={localPlayer.avatarUrl} alt={localPlayer.displayName} /> : null}
              <AvatarFallback className="bg-gradient-to-br from-primary to-[#7356ff] font-head">{initials(localPlayer)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-head text-sm font-black uppercase">{localPlayer.displayName}</p>
                <Badge variant="secondary" className="h-5">En vie</Badge>
              </div>
              <p className="mt-1 truncate text-xs text-white/48">{currentGroup?.name ?? "Aucun groupe"} · Centre de la carte</p>
            </div>
            <LocateFixed className="size-5 text-[--arena-cyan]" />
          </button>
        </div>
      )}

      <AnimatePresence>
        {showGameSurface && (
          <motion.section
            key="game-surface"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.975, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985, y: 10 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="absolute inset-x-3 bottom-24 top-[5.4rem] z-10 overflow-hidden rounded-[1.65rem] border border-white/15 bg-[#0c0e15]/94 shadow-[var(--shadow-overlay)] backdrop-blur-xl md:inset-x-[5vw] md:bottom-24 md:top-24 xl:inset-x-[11vw]"
          >
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-white/10 bg-black/25 px-3 py-2 backdrop-blur-md">
              <div className="flex min-w-0 items-center gap-2">
                <Gamepad2 className="size-4 text-primary" />
                <p className="truncate font-head text-xs font-black uppercase">{currentGameName || "Mini-jeu"}</p>
              </div>
              <button type="button" onClick={() => setGameExpanded(false)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] uppercase text-white/48 hover:bg-white/7 hover:text-white">
                Réduire <ChevronDown className="size-3" />
              </button>
            </div>
            <div className="h-full pt-9">{children}</div>
          </motion.section>
        )}
      </AnimatePresence>

      {!gameExpanded && roundActive && children && (
        <button
          type="button"
          onClick={() => setGameExpanded(true)}
          className="premium-floating absolute left-1/2 top-24 z-10 flex -translate-x-1/2 items-center gap-2 px-4 py-2 text-xs uppercase"
        >
          <Gamepad2 className="size-4 text-primary" /> Reprendre le mini-jeu
        </button>
      )}

      {!roundActive && children && (
        <div className="absolute inset-x-3 bottom-24 z-10 md:left-auto md:right-5 md:w-[28rem]">
          <div className="premium-floating max-h-[39dvh] overflow-y-auto p-4">{children}</div>
        </div>
      )}

      <AnimatePresence>
        {activePanel !== "NONE" && (
          <motion.aside
            key={activePanel}
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 36, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28, scale: 0.985 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            className="premium-floating absolute inset-x-2 bottom-[5.6rem] z-30 flex max-h-[67dvh] min-h-[24rem] flex-col overflow-hidden md:inset-y-20 md:left-auto md:right-4 md:max-h-none md:w-[25rem]"
          >
            <button type="button" onClick={() => setActivePanel("NONE")} className="absolute right-3 top-3 z-20 grid size-8 place-items-center rounded-xl border border-white/10 bg-black/25 text-white/55 hover:text-white" aria-label="Fermer le panneau">
              <X className="size-4" />
            </button>
            <SocialPanelContent
              panel={activePanel}
              players={players}
              groups={groups}
              selectedPlayerId={selectedMapPlayerId}
              chatPeerId={chatPeerId}
              localPlayerId={localPlayer?.userId}
              chatMessages={chatMessages}
              requests={requests}
              onSelectPlayer={openPlayer}
              onFocusMap={focusOnMap}
              onChat={onChat}
              onOpenChat={openChat}
              onRequestUpdate={(requestId, requestStatus) => {
                if (onResolveGroupRequest) onResolveGroupRequest(requestId, requestStatus);
                else setFallbackRequests((current) => current.map((request) => request.id === requestId ? { ...request, status: requestStatus } : request));
              }}
              onApplyGroup={(groupId) => onApplyGroup?.(groupId)}
              onCreateGroup={(name) => onCreateGroup?.(name)}
              onInvitePlayer={(groupId, playerId) => onInvitePlayer?.(groupId, playerId)}
              onLeaveGroup={() => onLeaveGroup?.()}
              onLockGroup={(groupId, locked) => onLockGroup?.(groupId, locked)}
            />
          </motion.aside>
        )}
      </AnimatePresence>

      <div className="safe-area-bottom pointer-events-none absolute inset-x-0 bottom-0 z-40 px-2 md:px-4">
        <nav className="premium-toolbar pointer-events-auto mx-auto flex max-w-xl items-center justify-between gap-1 p-1.5" aria-label="Navigation sociale du lobby">
          <button
            type="button"
            onClick={() => {
              setActivePanel("NONE");
              setGameExpanded(false);
            }}
            className={cn("flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[9px] font-bold uppercase transition", activePanel === "NONE" ? "bg-white/10 text-white" : "text-white/45 hover:bg-white/5 hover:text-white")}
          >
            <Map className="size-4" /> Carte
          </button>
          {panelActions.map(({ panel, label, icon: Icon }) => (
            <button
              key={panel}
              type="button"
              onClick={() => togglePanel(panel)}
              className={cn("relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[9px] font-bold uppercase transition", activePanel === panel ? "bg-primary text-white shadow-sm" : "text-white/45 hover:bg-white/5 hover:text-white")}
            >
              <Icon className="size-4" />
              <span className="truncate">{label}</span>
              {panel === "REQUESTS" && requests.some((request) => request.status === "PENDING") && (
                <span className="absolute right-[22%] top-1 size-2 rounded-full bg-[--arena-gold] shadow-[0_0_10px_var(--arena-gold)]" />
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="pointer-events-none absolute bottom-[5.7rem] right-3 z-10 hidden flex-col gap-2 lg:flex">
        <button type="button" onClick={() => onPing("here")} className="premium-toolbar pointer-events-auto grid size-11 place-items-center text-white/60 hover:text-white" aria-label="Placer un signal ici">
          <Target className="size-4" />
        </button>
        <div className="premium-toolbar flex items-center gap-2 px-3 py-2 text-xs">
          <Radio className="size-3 text-[--arena-green]" />
          <span className="font-head font-black">{activePlayers.length}/{players.length}</span>
        </div>
      </div>

      <AnimatePresence>
        {(status === "reconnecting" || status === "connecting") && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="absolute inset-x-0 top-0 z-50 bg-[--arena-gold] px-4 py-2 text-center font-head text-xs font-black uppercase text-black shadow-lg"
          >
            {status === "connecting" ? "Connexion à la salle…" : "Reconnexion en cours — ne quitte pas"}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showElimination && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] grid place-items-center bg-[#07080c]/88 p-5 backdrop-blur-xl"
          >
            <motion.div
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 1.25 }}
              animate={{ opacity: 1, scale: 1 }}
              className="premium-floating max-w-md border-destructive/50 p-7 text-center shadow-[var(--shadow-critical)]"
            >
              <p className="font-head text-5xl font-black uppercase text-[--arena-danger]">Éliminé</p>
              <p className="mt-3 text-sm leading-relaxed text-white/58">La partie continue. Tu peux observer les joueurs sans recevoir d’informations privées supplémentaires.</p>
              <Button className="mt-5 w-full" onClick={() => { setEliminationDismissed(true); setGameExpanded(true); }}>
                <EyeIcon /> Regarder la fin
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function EyeIcon() {
  return <span aria-hidden className="text-base">◉</span>;
}
