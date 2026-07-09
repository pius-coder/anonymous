"use client";

import { useEffect, useMemo, useReducer } from "react";
import { useParams, useRouter } from "next/navigation";
import { GameShell } from "@/components/lobby/GameShell";
import { MemorySequenceGame } from "@/components/games/MemorySequenceGame";
import { ReactionDuelGame } from "@/components/games/ReactionDuelGame";
import { SafeZonesGame } from "@/components/games/SafeZonesGame";
import { TrustBridgeGame } from "@/components/games/TrustBridgeGame";
import { TeamRelayGame } from "@/components/games/TeamRelayGame";
import { DangerSweepGame } from "@/components/games/DangerSweepGame";
import { SilentVoteGame } from "@/components/games/SilentVoteGame";
import { useGameRoom, type LivePlayer } from "@/hooks/useGameRoom";
import { useSession } from "@/lib/useSession";
import { juice } from "@/lib/juice";
import { translateError } from "@/lib/errors.fr";

function eliminateReducer(state: boolean, action: "eliminate" | "reconnect"): boolean {
  switch (action) {
    case "eliminate": return true;
    case "reconnect": return false;
    default: return state;
  }
}

export default function LivePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { user } = useSession();
  const { status, snap, lastMessage, currentGame: roundGame, sendAction, errorCode } = useGameRoom(params.code);

  const [eliminated, eliminatedDispatch] = useReducer(eliminateReducer, false);

  useEffect(() => {
    juice.unlock();
  }, []);

  useEffect(() => {
    if (lastMessage?.type === "you.eliminated") {
      juice.play("eliminated");
      eliminatedDispatch("eliminate");
    } else if (lastMessage?.type === "session.completed") {
      router.push(`/session/${params.code}/results`);
    }
  }, [lastMessage, params.code, router]);

  const you = snap?.players.find((p: LivePlayer) => p.userId === user?.id);
  const opponent = snap?.players.find((p: LivePlayer) => p.userId !== user?.id);
  const score = useMemo(() => ({ you: 0, opp: 0 }), []);

  const sequenceData = lastMessage?.type === "sequence.show" ? (lastMessage.data as { steps: number[] }) : null;
  const zonesData =
    lastMessage?.type === "zones.round"
      ? (lastMessage.data as { safeCells: number[]; lockAtEpochMs: number; gridSize?: number })
      : null;
  const publicState = roundGame?.publicState ?? {};
  const spectator = eliminated || you?.isEliminated;
  const livePlayers = (snap?.players ?? []).map((player) => ({
    userId: player.userId,
    displayName: player.displayName,
    name: player.displayName,
    isEliminated: player.isEliminated,
    eliminated: player.isEliminated,
    cell: null,
  }));

  const surface = (() => {
    if (roundGame?.key === "memory-sequence" || lastMessage?.type === "sequence.show") {
      return (
        <MemorySequenceGame
          incomingSequence={sequenceData?.steps ?? [0, 1, 2]}
          level={snap?.roundNum ?? 1}
          onSubmit={(steps) => sendAction("sequence-input", { roundIndex: 0, reproduction: steps })}
          readOnly={spectator}
        />
      );
    }
    if (roundGame?.key === "pure-reaction-duel" || lastMessage?.type === "signal" || lastMessage?.type === "manche.armed") {
      return (
        <ReactionDuelGame
          you={{ userId: you?.userId ?? user?.id ?? "", name: you?.displayName ?? user?.email ?? "Toi" }}
          opponent={{
            userId: opponent?.userId ?? "adv",
            name: opponent?.displayName ?? "Adversaire",
          }}
          signalOn={lastMessage?.type === "signal"}
          armed={lastMessage?.type === "manche.armed"}
          lastResult={null}
          score={score}
          roundsToWin={3}
          onTap={() => sendAction("reaction-click", { clickedAtMs: 2500, clientTs: Date.now() })}
          readOnly={spectator}
        />
      );
    }
    if (roundGame?.key === "trust-bridge") {
      return (
        <TrustBridgeGame
          routes={(publicState.routes as Array<{ id: string; label: string; risk: string }> | undefined) ?? undefined}
          pairs={(publicState.pairs as Array<{ userId: string; pairId: string }> | undefined) ?? []}
          players={snap?.players ?? []}
          youUserId={user?.id ?? ""}
          onChoose={(routeId) => sendAction("route-choice", { routeId })}
          readOnly={spectator}
        />
      );
    }
    if (roundGame?.key === "team-relay") {
      return (
        <TeamRelayGame
          steps={(publicState.steps as string[] | undefined) ?? undefined}
          teams={(publicState.teams as Array<{ userId: string; teamId: string }> | undefined) ?? []}
          youUserId={user?.id ?? ""}
          onStep={(stepId) => sendAction("team-relay", { stepId })}
          readOnly={spectator}
        />
      );
    }
    if (roundGame?.key === "danger-sweep") {
      const arena = publicState.arena as { width: number; height: number } | undefined;
      const sweep = publicState.sweep as { fn: "linear" | "rotate"; t0EpochMs: number; speed: number; width: number } | undefined;
      return (
        <DangerSweepGame
          arena={arena}
          sweep={sweep}
          players={(publicState.players as Array<{ userId: string; displayName?: string; x: number; y: number; eliminated?: boolean }> | undefined) ?? livePlayers.map((player, index) => ({ ...player, x: 120 + index * 80, y: 120 + index * 40 }))}
          youUserId={user?.id ?? ""}
          onMove={(point) => sendAction("move", point)}
          readOnly={spectator}
        />
      );
    }
    if (roundGame?.key === "silent-vote") {
      return (
        <SilentVoteGame
          candidates={(publicState.candidates as Array<{ userId: string; displayName: string; hasVoted?: boolean }> | undefined) ?? (snap?.players ?? [])}
          voteRound={(publicState.voteRound as number | undefined) ?? (snap?.roundNum ?? 1)}
          youUserId={user?.id ?? ""}
          onVote={(targetUserId) => sendAction("silent-vote", { targetUserId })}
          readOnly={spectator}
        />
      );
    }
    if (roundGame?.key === "safe-zones" || lastMessage?.type === "zones.round" || lastMessage?.type === "zones.locked") {
      return (
        <SafeZonesGame
          gridSize={zonesData?.gridSize ?? 5}
          safeCells={zonesData?.safeCells ?? []}
          lockAtEpochMs={zonesData?.lockAtEpochMs ?? 0}
          players={livePlayers}
          youUserId={user?.id ?? ""}
          myClaim={null}
          locked={lastMessage?.type === "zones.locked"}
          onClaim={(cell) => sendAction("move", { cell })}
          readOnly={spectator}
        />
      );
    }
    return (
      <div className="grid place-items-center text-center">
        <p className="font-head text-3xl font-black uppercase text-muted-foreground">En attente du serveur…</p>
      </div>
    );
  })();

  if (status === "error") {
    return (
      <main className="grid min-h-[70vh] place-items-center px-4 text-center">
        <div>
          <p className="font-head text-2xl font-black uppercase text-[--arena-danger]">Connexion impossible</p>
          <p className="mt-2 text-muted-foreground">
            {errorCode ? translateError(errorCode) : "Erreur inconnue"}
          </p>
          <button onClick={() => router.push(`/session/${params.code}/lobby`)} className="mt-4 underline">
            Retour au lobby
          </button>
        </div>
      </main>
    );
  }

  return (
    <GameShell
      snap={snap}
      status={status}
      reconnecting={status === "reconnecting"}
      eliminated={eliminated}
      onReconnect={() => eliminatedDispatch("reconnect")}
    >
      {surface}
    </GameShell>
  );
}
