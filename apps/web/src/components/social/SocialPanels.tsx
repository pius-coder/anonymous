"use client";

import { useMemo, useState, type ElementType, type ReactNode } from "react";
import {
  Check,
  ChevronRight,
  Crown,
  Eye,
  LocateFixed,
  Lock,
  LogOut,
  MessageCircle,
  Unlock,
  Search,
  Send,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/retroui/avatar";
import { Badge } from "@/components/retroui/badge";
import { Button } from "@/components/retroui/button";
import { Input } from "@/components/retroui/input";
import { Progress } from "@/components/retroui/progress";
import type { LiveChatChannel, LiveChatMessage, LivePlayer } from "@/hooks/useGameRoom";
import {
  groupForPlayer,
  playerDistance,
  playerPublicStats,
  type SocialGroup,
  type SocialPanel,
  type SocialRequest,
} from "./social-model";

const DEMO_CHAT_BASE_MS = Date.parse("2026-07-10T10:00:00.000Z");

function demoCreatedAt(offsetMs: number) {
  return new Date(DEMO_CHAT_BASE_MS - offsetMs).toISOString();
}

function initials(player?: Pick<LivePlayer, "displayName" | "userId">) {
  if (!player) return "?";
  return (player.displayName || player.userId).slice(0, 2).toUpperCase();
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function PanelTitle({ icon: Icon, title, subtitle }: { icon: ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-white/10 px-4 pb-4 pt-1">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/6 shadow-sm">
        <Icon className="size-5 text-[--arena-cyan]" />
      </div>
      <div className="min-w-0">
        <h2 className="retro-title text-xl font-black">{title}</h2>
        <p className="mt-0.5 text-xs text-white/52">{subtitle}</p>
      </div>
    </div>
  );
}

function EmptyPanel({ children }: { children: ReactNode }) {
  return <div className="grid min-h-56 place-items-center px-6 text-center text-sm text-white/50">{children}</div>;
}

export function SocialPanelContent({
  panel,
  players,
  groups,
  selectedPlayerId,
  chatPeerId,
  localPlayerId,
  chatMessages,
  requests,
  onSelectPlayer,
  onFocusMap,
  onChat,
  onOpenChat,
  onRequestUpdate,
  onApplyGroup,
  onCreateGroup,
  onInvitePlayer,
  onLeaveGroup,
  onLockGroup,
}: {
  panel: Exclude<SocialPanel, "NONE">;
  players: LivePlayer[];
  groups: SocialGroup[];
  selectedPlayerId?: string;
  chatPeerId?: string;
  localPlayerId?: string;
  chatMessages: LiveChatMessage[];
  requests: SocialRequest[];
  onSelectPlayer: (playerId: string) => void;
  onFocusMap: (playerId: string) => void;
  onChat: (body: string, quick?: boolean, options?: { channel?: LiveChatChannel; targetUserId?: string; groupId?: string }) => void;
  onOpenChat: (playerId?: string) => void;
  onRequestUpdate: (requestId: string, status: "ACCEPTED" | "REFUSED") => void;
  onApplyGroup: (groupId: string) => void;
  onCreateGroup: (name: string) => void;
  onInvitePlayer: (groupId: string, playerId: string) => void;
  onLeaveGroup: () => void;
  onLockGroup: (groupId: string, locked: boolean) => void;
}) {
  switch (panel) {
    case "PROFILE":
      return (
        <PlayerProfilePanel
          player={players.find((player) => player.userId === selectedPlayerId) ?? players[0]}
          localPlayer={players.find((player) => player.userId === localPlayerId)}
          groups={groups}
          onFocusMap={onFocusMap}
          onOpenChat={onOpenChat}
        />
      );
    case "GROUPS":
      return (
        <GroupsPanel
          groups={groups}
          players={players}
          localPlayerId={localPlayerId}
          onSelectPlayer={onSelectPlayer}
          onApplyGroup={onApplyGroup}
          onCreateGroup={onCreateGroup}
          onLeaveGroup={onLeaveGroup}
          onLockGroup={onLockGroup}
        />
      );
    case "PLAYERS":
      return (
        <PlayersPanel
          players={players}
          groups={groups}
          localPlayerId={localPlayerId}
          onSelectPlayer={onSelectPlayer}
          onFocusMap={onFocusMap}
          onInvitePlayer={onInvitePlayer}
          onOpenChat={onOpenChat}
        />
      );
    case "CHAT":
      return (
        <ChatPanel
          players={players}
          groups={groups}
          localPlayerId={localPlayerId}
          chatPeerId={chatPeerId}
          chatMessages={chatMessages}
          onSelectPeer={onOpenChat}
          onChat={onChat}
        />
      );
    case "REQUESTS":
      return (
        <RequestsPanel
          players={players}
          groups={groups}
          requests={requests}
          localPlayerId={localPlayerId}
          onRequestUpdate={onRequestUpdate}
        />
      );
  }
}

function PlayerProfilePanel({
  player,
  localPlayer,
  groups,
  onFocusMap,
  onOpenChat,
}: {
  player?: LivePlayer;
  localPlayer?: LivePlayer;
  groups: SocialGroup[];
  onFocusMap: (playerId: string) => void;
  onOpenChat: (playerId?: string) => void;
}) {
  if (!player) return <EmptyPanel>Aucun joueur sélectionné.</EmptyPanel>;
  const stats = playerPublicStats(player);
  const group = groupForPlayer(groups, player.userId);
  const distance = playerDistance(localPlayer, player);

  return (
    <div className="flex min-h-0 flex-col">
      <PanelTitle icon={Eye} title="Profil joueur" subtitle="Résumé public, position et performances" />
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div className="premium-inset flex items-center gap-3 p-3">
          <Avatar className="size-14 border border-white/20 shadow-lg">
            {player.avatarUrl ? <AvatarImage src={player.avatarUrl} alt={player.displayName} /> : null}
            <AvatarFallback className="bg-gradient-to-br from-primary to-[#6d48ff] font-head text-lg">
              {initials(player)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-head text-lg font-black uppercase">{player.displayName}</h3>
              <Badge variant={player.isEliminated ? "destructive" : "secondary"}>
                {player.isEliminated ? "Éliminé" : "En vie"}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-white/52">
              {group ? `${group.name} · ` : "Sans groupe · "}niveau {stats.level}
            </p>
          </div>
        </div>

        <section className="premium-inset p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">Position</p>
              <p className="mt-1 font-head text-lg uppercase">Zone centrale</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xl font-black text-[--arena-cyan]">{distance} m</p>
              <p className="text-[11px] text-white/45">distance estimée</p>
            </div>
          </div>
          <Button className="mt-3 w-full" variant="outline" onClick={() => onFocusMap(player.userId)}>
            <LocateFixed /> Voir sur la carte
          </Button>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">Performances précédentes</p>
            <ShieldCheck className="size-4 text-[--arena-green]" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Meilleur rang", `#${stats.bestRank}`],
              ["Victoires", String(stats.wins)],
              ["Survie max", formatDuration(stats.survivalSeconds)],
              ["Éliminations", String(stats.eliminations)],
            ].map(([label, value]) => (
              <div key={label} className="premium-inset p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/42">{label}</p>
                <p className="mt-1 font-head text-xl font-black">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="premium-inset p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-white/50">Score de confiance</span>
            <span className="font-mono font-black text-[--arena-green]">{stats.trust}/100</span>
          </div>
          <Progress value={stats.trust} className="mt-2" />
        </section>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary"><UserPlus /> Suivre</Button>
          <Button onClick={() => onOpenChat(player.userId)} disabled={player.userId === localPlayer?.userId}><MessageCircle /> Interagir</Button>
        </div>
      </div>
    </div>
  );
}

function GroupsPanel({
  groups,
  players,
  localPlayerId,
  onSelectPlayer,
  onApplyGroup,
  onCreateGroup,
  onLeaveGroup,
  onLockGroup,
}: {
  groups: SocialGroup[];
  players: LivePlayer[];
  localPlayerId?: string;
  onSelectPlayer: (playerId: string) => void;
  onApplyGroup: (groupId: string) => void;
  onCreateGroup: (name: string) => void;
  onLeaveGroup: () => void;
  onLockGroup: (groupId: string, locked: boolean) => void;
}) {
  const [appliedGroupId, setAppliedGroupId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState("");
  const localGroup = localPlayerId ? groupForPlayer(groups, localPlayerId) : undefined;
  const localIsLeader = localGroup?.leaderId === localPlayerId;
  return (
    <div className="flex min-h-0 flex-col">
      <PanelTitle icon={Users} title="Groupes" subtitle="Rejoins une alliance ou inspecte ses membres" />
      <div className="grid grid-cols-3 gap-2 px-4 pt-4">
        <MiniMetric label="Groupes" value={groups.length} />
        <MiniMetric label="Joueurs" value={players.length} />
        <MiniMetric label="Ouverts" value={groups.filter((group) => group.memberIds.length < group.maxMembers).length} />
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {groups.map((group, index) => {
          const leader = players.find((player) => player.userId === group.leaderId);
          const full = group.memberIds.length >= group.maxMembers;
          const unavailable = full || Boolean(group.locked);
          const applied = appliedGroupId === group.id;
          return (
            <article key={group.id} className="premium-inset p-3">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/12 bg-white/6 font-head text-sm">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-head text-sm font-black uppercase">{group.name}</h3>
                    {index === 0 && <Crown className="size-3.5 text-[--arena-gold]" />}
                  </div>
                  <button
                    type="button"
                    className="mt-1 flex items-center gap-1 text-xs text-white/48 hover:text-white"
                    onClick={() => leader && onSelectPlayer(leader.userId)}
                  >
                    Chef : {leader?.displayName ?? "—"} <ChevronRight className="size-3" />
                  </button>
                  <div className="mt-2 flex -space-x-1.5">
                    {group.memberIds.map((memberId) => {
                      const member = players.find((player) => player.userId === memberId);
                      return (
                        <Avatar key={memberId} className="size-7 border border-[#151821]">
                          {member?.avatarUrl ? <AvatarImage src={member.avatarUrl} alt={member.displayName} /> : null}
                          <AvatarFallback className="bg-secondary text-[10px]">{initials(member)}</AvatarFallback>
                        </Avatar>
                      );
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-black">{group.memberIds.length}/{group.maxMembers}</p>
                  <Badge className="mt-1" variant={unavailable ? "outline" : applied ? "secondary" : "default"}>
                    {full ? "Complet" : unavailable ? "Fermé" : applied ? "Envoyée" : "Ouvert"}
                  </Badge>
                </div>
              </div>
              {!unavailable && !localGroup && (
                <Button
                  className="mt-3 w-full"
                  size="sm"
                  variant={applied ? "secondary" : "outline"}
                  disabled={applied}
                  onClick={() => { setAppliedGroupId(group.id); onApplyGroup(group.id); }}
                >
                  {applied ? <Check /> : <UserPlus />}
                  {applied ? "Candidature envoyée" : "Postuler"}
                </Button>
              )}
            </article>
          );
        })}
      </div>
      <div className="space-y-2 border-t border-white/10 p-4">
        {localGroup ? (
          <div className="grid grid-cols-2 gap-2">
            {localIsLeader ? (
              <Button
                variant="outline"
                onClick={() => onLockGroup(localGroup.id, !Boolean(localGroup.locked))}
              >
                {Boolean(localGroup.locked) ? <Unlock /> : <Lock />}
                {Boolean(localGroup.locked) ? "Ouvrir" : "Verrouiller"}
              </Button>
            ) : <div />}
            <Button variant="destructive" onClick={onLeaveGroup}><LogOut /> Quitter</Button>
          </div>
        ) : creating ? (
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              const name = groupName.trim();
              if (!name) return;
              onCreateGroup(name);
              setCreating(false);
              setGroupName("");
            }}
          >
            <Input value={groupName} maxLength={28} onChange={(event) => setGroupName(event.target.value)} placeholder="Nom de l’escouade" autoFocus />
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setCreating(false)}>Annuler</Button>
              <Button type="submit"><Users /> Créer</Button>
            </div>
          </form>
        ) : (
          <Button className="w-full" onClick={() => setCreating(true)}><Users /> Créer un groupe</Button>
        )}
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="premium-inset px-2 py-2 text-center">
      <p className="font-head text-lg font-black">{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-white/42">{label}</p>
    </div>
  );
}

function PlayersPanel({
  players,
  groups,
  localPlayerId,
  onSelectPlayer,
  onFocusMap,
  onInvitePlayer,
  onOpenChat,
}: {
  players: LivePlayer[];
  groups: SocialGroup[];
  localPlayerId?: string;
  onSelectPlayer: (playerId: string) => void;
  onFocusMap: (playerId: string) => void;
  onInvitePlayer: (groupId: string, playerId: string) => void;
  onOpenChat: (playerId?: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "NEAR" | "GROUP">("ALL");
  const local = players.find((player) => player.userId === localPlayerId);
  const localGroup = local ? groupForPlayer(groups, local.userId) : undefined;
  const localGroupId = localGroup?.id;
  const canInvite = Boolean(
    localGroup && localGroup.leaderId === localPlayerId && localGroup.memberIds.length < localGroup.maxMembers,
  );
  const rows = players
    .filter((player) => player.displayName.toLowerCase().includes(query.toLowerCase()))
    .filter((player) => {
      if (filter === "NEAR") return playerDistance(local, player) <= 260;
      if (filter === "GROUP") return Boolean(localGroup?.memberIds.includes(player.userId));
      return true;
    })
    .sort((a, b) => playerDistance(local, a) - playerDistance(local, b));

  return (
    <div className="flex min-h-0 flex-col">
      <PanelTitle icon={Users} title="Liste des joueurs" subtitle={`${players.length} joueurs visibles dans la salle`} />
      <div className="space-y-3 px-4 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un joueur…" className="pl-9" />
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-black/20 p-1">
          {(["ALL", "NEAR", "GROUP"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-lg px-2 py-2 font-head text-[10px] uppercase transition ${filter === value ? "bg-primary text-white shadow-sm" : "text-white/48 hover:bg-white/6 hover:text-white"}`}
            >
              {value === "ALL" ? "Tous" : value === "NEAR" ? "Ma zone" : "Mon groupe"}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-4">
        {rows.map((player) => {
          const group = groupForPlayer(groups, player.userId);
          const distance = playerDistance(local, player);
          return (
            <article key={player.userId} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-2.5 hover:bg-white/6">
              <Avatar className="size-10 border border-white/14">
                {player.avatarUrl ? <AvatarImage src={player.avatarUrl} alt={player.displayName} /> : null}
                <AvatarFallback className="bg-gradient-to-br from-secondary to-[#3153a4] font-head text-xs">{initials(player)}</AvatarFallback>
              </Avatar>
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelectPlayer(player.userId)}>
                <div className="flex items-center gap-2">
                  <p className="truncate font-head text-sm font-black uppercase">{player.displayName}</p>
                  <span className={`status-dot text-[8px] ${player.isEliminated ? "text-destructive" : "text-[--arena-green]"}`} />
                </div>
                <p className="truncate text-[11px] text-white/42">{group?.name ?? "Sans groupe"} · {distance} m</p>
              </button>
              {player.userId !== localPlayerId ? (
                <button
                  type="button"
                  onClick={() => onOpenChat(player.userId)}
                  className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/60 hover:text-white"
                  aria-label={`Écrire à ${player.displayName}`}
                >
                  <MessageCircle className="size-4" />
                </button>
              ) : null}
              {canInvite && localGroupId && !group && player.userId !== localPlayerId ? (
                <button
                  type="button"
                  onClick={() => onInvitePlayer(localGroupId, player.userId)}
                  className="grid size-9 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary hover:bg-primary/18"
                  aria-label={`Inviter ${player.displayName}`}
                >
                  <UserPlus className="size-4" />
                </button>
              ) : null}
              <button type="button" onClick={() => onFocusMap(player.userId)} className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/60 hover:text-white" aria-label={`Voir ${player.displayName} sur la carte`}>
                <LocateFixed className="size-4" />
              </button>
            </article>
          );
        })}
        {rows.length === 0 && <EmptyPanel>Aucun joueur ne correspond à ce filtre.</EmptyPanel>}
      </div>
    </div>
  );
}

function ChatPanel({
  players,
  groups,
  localPlayerId,
  chatPeerId,
  chatMessages,
  onSelectPeer,
  onChat,
}: {
  players: LivePlayer[];
  groups: SocialGroup[];
  localPlayerId?: string;
  chatPeerId?: string;
  chatMessages: LiveChatMessage[];
  onSelectPeer: (playerId?: string) => void;
  onChat: (body: string, quick?: boolean, options?: { channel?: LiveChatChannel; targetUserId?: string; groupId?: string }) => void;
}) {
  const [draft, setDraft] = useState("");
  const [channel, setChannel] = useState<"PRIVATE" | "GROUP" | "SYSTEM">("PRIVATE");
  const quickMessages = ["Restons ensemble", "Besoin d’aide", "Allons au centre", "Attention !"];
  const localPlayer = players.find((player) => player.userId === localPlayerId);
  const localGroup = localPlayerId ? groupForPlayer(groups, localPlayerId) : undefined;
  const peers = players.filter((player) => player.userId !== localPlayerId && !player.isEliminated);
  const peer = players.find((player) => player.userId === chatPeerId) ?? peers[0];

  const demoMessages = useMemo<LiveChatMessage[]>(() => {
    const sample = peers.slice(0, 2);
    if (channel === "GROUP") {
      return sample.map((player, index) => ({
        id: `demo-group-${index}`,
        userId: player.userId,
        displayName: player.displayName,
        body: ["On se retrouve au camp ?", "Oui, je surveille la zone nord."][index] ?? "Prêt.",
        type: "CHAT",
        channel: "GROUP",
        groupId: localGroup?.id,
        createdAt: demoCreatedAt((2 - index) * 60_000),
      }));
    }
    if (channel === "SYSTEM") {
      return [{
        id: "demo-system",
        userId: "system",
        displayName: "Système",
        body: "Les demandes de groupe expirent automatiquement. Les informations privées restent ciblées.",
        type: "SYSTEM",
        channel: "SYSTEM",
        createdAt: demoCreatedAt(90_000),
      }];
    }
    if (!peer) return [];
    return [
      {
        id: "demo-private-1",
        userId: peer.userId,
        targetUserId: localPlayerId,
        displayName: peer.displayName,
        body: "Tu vas vers le centre ?",
        type: "CHAT",
        channel: "PRIVATE",
        createdAt: demoCreatedAt(120_000),
      },
      {
        id: "demo-private-2",
        userId: localPlayerId ?? "local",
        targetUserId: peer.userId,
        displayName: localPlayer?.displayName ?? "Toi",
        body: "Oui, j’arrive. Restons prudents.",
        type: "CHAT",
        channel: "PRIVATE",
        createdAt: demoCreatedAt(60_000),
      },
    ];
  }, [channel, localGroup?.id, localPlayer?.displayName, localPlayerId, peer, peers]);

  const visibleMessages = useMemo(() => {
    const filtered = chatMessages.filter((message) => {
      const messageChannel = message.channel ?? "GLOBAL";
      if (channel === "SYSTEM") return messageChannel === "SYSTEM" || messageChannel === "GLOBAL";
      if (channel === "GROUP") return messageChannel === "GROUP" && message.groupId === localGroup?.id;
      if (messageChannel !== "PRIVATE" || !peer || !localPlayerId) return false;
      return (
        (message.userId === localPlayerId && message.targetUserId === peer.userId) ||
        (message.userId === peer.userId && message.targetUserId === localPlayerId)
      );
    });
    return filtered.length > 0 ? filtered : demoMessages;
  }, [channel, chatMessages, demoMessages, localGroup, localPlayerId, peer]);

  const send = (body: string, quick = false) => {
    const value = body.trim();
    if (!value || channel === "SYSTEM") return;
    if (channel === "PRIVATE") {
      if (!peer) return;
      onChat(value, quick, { channel: "PRIVATE", targetUserId: peer.userId });
    } else {
      if (!localGroup) return;
      onChat(value, quick, { channel: "GROUP", groupId: localGroup.id });
    }
    if (!quick) setDraft("");
  };

  const composerDisabled = channel === "SYSTEM" || (channel === "PRIVATE" ? !peer : !localGroup);
  const subtitle = channel === "PRIVATE"
    ? peer ? `Conversation privée avec ${peer.displayName}` : "Choisis un joueur"
    : channel === "GROUP"
      ? localGroup ? `Canal ${localGroup.name}` : "Rejoins un groupe pour écrire"
      : "Annonces et activité de la salle";

  return (
    <div className="flex min-h-0 flex-col">
      <PanelTitle icon={MessageCircle} title="Discussion" subtitle={subtitle} />
      <div className="grid grid-cols-3 gap-1 border-b border-white/10 p-3">
        {(["PRIVATE", "GROUP", "SYSTEM"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setChannel(value)}
            disabled={value === "GROUP" && !localGroup}
            className={`rounded-lg px-2 py-2 font-head text-[10px] uppercase transition disabled:cursor-not-allowed disabled:opacity-35 ${channel === value ? "bg-primary text-white" : "bg-white/5 text-white/55 hover:bg-white/9 hover:text-white"}`}
          >
            {value === "PRIVATE" ? "Privé" : value === "GROUP" ? "Groupe" : "Système"}
          </button>
        ))}
      </div>

      {channel === "PRIVATE" && peers.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto border-b border-white/8 px-3 py-2">
          {peers.map((candidate) => (
            <button
              key={candidate.userId}
              type="button"
              onClick={() => onSelectPeer(candidate.userId)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-[11px] transition ${peer?.userId === candidate.userId ? "border-primary/55 bg-primary/16 text-white" : "border-white/10 bg-white/4 text-white/52 hover:text-white"}`}
            >
              <span className="status-dot text-[--arena-green]" />
              {candidate.displayName}
            </button>
          ))}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {visibleMessages.slice(-30).map((message) => {
          const mine = message.userId === localPlayerId;
          const system = message.channel === "SYSTEM" || message.userId === "system";
          if (system) {
            return (
              <div key={message.id} className="mx-auto max-w-[94%] rounded-xl border border-[--arena-gold]/20 bg-[--arena-gold]/8 px-3 py-2 text-center text-xs text-white/65">
                {message.body}
              </div>
            );
          }
          return (
            <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[88%] rounded-2xl border px-3 py-2 ${mine ? "border-primary/35 bg-primary/18" : "border-white/9 bg-white/5"}`}>
                <p className="text-[10px] font-bold uppercase tracking-wide text-white/44">{mine ? "Toi" : message.displayName}</p>
                <p className="mt-1 text-sm leading-relaxed">{message.body}</p>
                <p className="mt-1 text-right font-mono text-[9px] text-white/34">
                  {new Date(message.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        {visibleMessages.length === 0 ? <EmptyPanel>Aucun message dans ce fil.</EmptyPanel> : null}
      </div>

      <div className="border-t border-white/10 p-3">
        {channel !== "SYSTEM" ? (
          <>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/38">Phrases rapides</p>
            <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
              {quickMessages.map((message) => (
                <button
                  key={message}
                  type="button"
                  disabled={composerDisabled}
                  onClick={() => send(message, true)}
                  className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/65 hover:bg-white/10 hover:text-white disabled:opacity-35"
                >
                  {message}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={draft}
                maxLength={160}
                disabled={composerDisabled}
                placeholder={channel === "PRIVATE" ? "Écrire un message privé…" : "Écrire dans le groupe…"}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) send(draft);
                }}
              />
              <Button size="icon" disabled={composerDisabled || !draft.trim()} onClick={() => send(draft)} aria-label="Envoyer le message"><Send /></Button>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-center text-xs text-white/42">
            Ce canal est en lecture seule.
          </div>
        )}
      </div>
    </div>
  );
}

function RequestsPanel({
  players,
  groups,
  requests,
  localPlayerId,
  onRequestUpdate,
}: {
  players: LivePlayer[];
  groups: SocialGroup[];
  requests: SocialRequest[];
  localPlayerId?: string;
  onRequestUpdate: (requestId: string, status: "ACCEPTED" | "REFUSED") => void;
}) {
  const pending = requests.filter((request) => request.status === "PENDING");
  const localGroup = localPlayerId ? groupForPlayer(groups, localPlayerId) : undefined;
  return (
    <div className="flex min-h-0 flex-col">
      <PanelTitle icon={UserPlus} title="Demandes" subtitle="Invitations, candidatures et capacité du groupe" />
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {pending.length === 0 ? (
          <EmptyPanel>
            <div>
              <Check className="mx-auto mb-3 size-8 text-[--arena-green]" />
              <p className="font-head uppercase text-white">Tout est traité</p>
              <p className="mt-1">Aucune demande en attente.</p>
            </div>
          </EmptyPanel>
        ) : (
          pending.map((request) => {
            const player = players.find((item) => item.userId === request.fromUserId);
            const group = groups.find((item) => item.id === request.groupId);
            const incoming = request.toUserId === localPlayerId;
            return (
              <article key={request.id} className="premium-inset p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="size-11 border border-white/15">
                    {player?.avatarUrl ? <AvatarImage src={player.avatarUrl} alt={player.displayName} /> : null}
                    <AvatarFallback className="bg-secondary font-head text-xs">{initials(player)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-head text-sm font-black uppercase">{player?.displayName ?? "Joueur"}</p>
                    <p className="mt-0.5 text-xs text-white/45">
                      {request.kind === "INVITATION" ? `t’invite dans ${group?.name ?? "son groupe"}` : `veut rejoindre ${group?.name ?? "ton groupe"}`}
                    </p>
                  </div>
                  <Badge variant={request.kind === "INVITATION" ? "default" : "secondary"}>
                    {request.kind === "INVITATION" ? "Invitation" : "Candidature"}
                  </Badge>
                </div>
                {incoming ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button size="sm" variant="secondary" onClick={() => onRequestUpdate(request.id, "ACCEPTED")}><Check /> Accepter</Button>
                    <Button size="sm" variant="outline" onClick={() => onRequestUpdate(request.id, "REFUSED")}><X /> Refuser</Button>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/42">
                    En attente de réponse
                  </div>
                )}
              </article>
            );
          })
        )}

        <section className="premium-inset p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/42">Capacité de ton groupe</p>
              <p className="mt-1 font-head text-2xl font-black">{localGroup ? `${localGroup.memberIds.length} / ${localGroup.maxMembers}` : "0 / 4"}</p>
            </div>
            <Users className="size-7 text-[--arena-gold]" />
          </div>
          <Progress value={localGroup ? (localGroup.memberIds.length / localGroup.maxMembers) * 100 : 0} className="mt-3" />
        </section>
      </div>
    </div>
  );
}
