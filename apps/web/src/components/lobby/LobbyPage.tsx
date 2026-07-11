"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/retroui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/retroui/alert";
import { LiveRoomShell } from "@/components/live/LiveRoomShell";
import type { LiveSnapshot } from "@/hooks/useGameRoom";
import { apiGet, apiPost, type ApiError } from "@/lib/api";
import { translateError } from "@/lib/errors.fr";
import { juice } from "@/lib/juice";
import { useSession } from "@/lib/useSession";
import { useServerHealth } from "@/hooks/useServerHealth";

type LobbyResponse = {
  session: {
    id: string;
    code: string;
    name: string;
    status: string;
    minPlayers: number;
    maxPlayers: number;
    startTime: string | null;
    checkInDeadlineAt: string | null;
  };
  registration: { id: string; status: string; checkedInAt: string | null };
  players: Array<{
    userId: string;
    displayName: string;
    avatarUrl: string;
    registrationStatus: string;
    x: number;
    y: number;
  }>;
  presence: { checkedIn: number; paid: number };
};

export function LobbyPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { user } = useSession();
  const serverHealth = useServerHealth();
  const [data, setData] = useState<LobbyResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const load = useCallback(
    (signal?: AbortSignal, silent = false) => {
      apiGet<LobbyResponse>(`/sessions/${params.code}/lobby`, signal).then((res) => {
        if (res.ok) {
          setData(res.data);
          setError(null);
        } else if (!silent) {
          setError(res.error);
        }
      });
    },
    [params.code],
  );

  useEffect(() => {
    const initialController = new AbortController();
    let refreshController: AbortController | null = null;

    load(initialController.signal);
    const interval = setInterval(() => {
      refreshController?.abort();
      refreshController = new AbortController();
      load(refreshController.signal, true);
    }, 5_000);

    return () => {
      initialController.abort();
      refreshController?.abort();
      clearInterval(interval);
    };
  }, [load]);

  const checkIn = async () => {
    setCheckingIn(true);
    setError(null);
    const res = await apiPost<{ registration: { status: string } }>(
      `/sessions/${params.code}/check-in`,
    );
    setCheckingIn(false);
    if (res.ok) {
      juice.unlock();
      juice.play("success");
      load();
    } else {
      setError(res.error);
    }
  };

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Alert variant="destructive">
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>{translateError(error.code, error.status)}</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="fixed inset-0 z-50 grid h-dvh place-items-center bg-background text-muted-foreground">
        Chargement du lobby…
      </main>
    );
  }

  const isCheckedIn =
    data.registration.status === "CHECKED_IN" || data.registration.status === "IN_ROOM";
  const isLive = data.session.status === "LIVE";
  const snap: LiveSnapshot = {
    phase: isLive ? "LOBBY" : "WAITING_START",
    roundNum: 0,
    deadlineEpochMs: 0,
    currentRoundId: "",
    currentGameKey: "",
    currentGameFamily: "",
    currentGameName: "",
    groups: [],
    players: data.players.map((player) => ({
      userId: player.userId,
      displayName: player.displayName,
      avatarUrl: player.avatarUrl,
      connectionStatus:
        player.registrationStatus === "IN_ROOM"
          ? "CONNECTED"
          : player.registrationStatus === "CHECKED_IN"
            ? "READY"
            : "PAID",
      role: "",
      submittedAction: false,
      isEliminated: false,
      x: player.x,
      y: player.y,
      facing: "down",
      emote: player.registrationStatus === "CHECKED_IN" ? "✓" : "",
      chatBubble: "",
      chatBubbleUntil: 0,
      lastPing: "",
      pingX: 0,
      pingY: 0,
      teamId: "",
      pairId: "",
    })),
  };

  return (
    <LiveRoomShell
      status="connected"
      snap={snap}
      currentGameName={data.session.name}
      currentUserId={user?.id}
      serverHealth={serverHealth}
      chatMessages={[]}
      onMove={() => {}}
      onChat={() => {}}
      onPing={() => {}}
    >
      <div className="grid gap-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-head text-xl uppercase">{data.session.code}</p>
            <p className="text-white/60">
              {data.presence.checkedIn}/{data.session.minPlayers} check-in
            </p>
          </div>
          {isCheckedIn && isLive && (
            <Button size="lg" onClick={() => router.push(`/session/${params.code}/live`)}>
              Entrer
            </Button>
          )}
          {!isCheckedIn && (
            <Button size="lg" onClick={checkIn} disabled={checkingIn}>
              {checkingIn ? "Check-in…" : "Check-in"}
            </Button>
          )}
        </div>
        {isCheckedIn && !isLive && (
          <Alert>
            <AlertTitle>En salle d&apos;attente</AlertTitle>
            <AlertDescription>
              L&apos;admin peut forcer le live puis lancer le premier round.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </LiveRoomShell>
  );
}
