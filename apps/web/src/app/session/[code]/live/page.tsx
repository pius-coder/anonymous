"use client";

import { useEffect, useMemo, useReducer } from "react";
import { useParams, useRouter } from "next/navigation";
import { GameShell } from "@/components/lobby/GameShell";
import { MemorySequenceGame } from "@/components/games/MemorySequenceGame";
import { ReactionDuelGame } from "@/components/games/ReactionDuelGame";
import { SafeZonesGame } from "@/components/games/SafeZonesGame";
import { useGameRoom, type LivePlayer } from "@/hooks/useGameRoom";
import { useSession } from "@/lib/useSession";
import { juice } from "@/lib/juice";

type ActiveGame = "memory" | "duel" | "zones" | null;

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
  const { status, snap, lastMessage, sendAction, errorCode } = useGameRoom(params.code);

  const [eliminated, eliminatedDispatch] = useReducer(eliminateReducer, false);

  useEffect(() => {
    juice.unlock();
  }, []);

  const activeGame: ActiveGame = (() => {
    if (!lastMessage) return null;
    if (lastMessage.type === "sequence.show") return "memory";
    if (lastMessage.type === "signal" || lastMessage.type === "manche.armed") return "duel";
    if (lastMessage.type === "zones.round" || lastMessage.type === "zones.locked") return "zones";
    return null;
  })();

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

  const surface = (() => {
    if (activeGame === "memory") {
      return (
        <MemorySequenceGame
          incomingSequence={sequenceData?.steps ?? null}
          level={snap?.roundNum ?? 1}
          onSubmit={(steps) => sendAction("sequence-input", { steps })}
        />
      );
    }
    if (activeGame === "duel") {
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
          onTap={() => sendAction("reaction-click", { clientTs: Date.now() })}
        />
      );
    }
    if (activeGame === "zones") {
      return (
        <SafeZonesGame
          gridSize={zonesData?.gridSize ?? 5}
          safeCells={zonesData?.safeCells ?? []}
          lockAtEpochMs={zonesData?.lockAtEpochMs ?? 0}
          players={(snap?.players ?? []) as unknown as { userId: string; name: string; cell: number | null; eliminated: boolean }[]}
          youUserId={user?.id ?? ""}
          myClaim={null}
          locked={lastMessage?.type === "zones.locked"}
          onClaim={(cell) => sendAction("claim-cell", { cell })}
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
          <p className="mt-2 text-muted-foreground">{errorCode ?? "Erreur inconnue"}</p>
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
