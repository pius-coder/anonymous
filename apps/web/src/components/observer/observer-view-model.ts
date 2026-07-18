import { timestampToIso } from "@/lib/rpc";

export type ObserverParticipantView = {
  label: string;
  status: string;
};

export type ObserverEventView = {
  code: string;
  label: string;
};

export type ObserverSnapshotView = {
  partyId: string;
  currentPhase: string;
  currentRoundNumber: number;
  currentRoundStatus: string;
  connectedCount: number;
  participantCount: number;
  participants: ObserverParticipantView[];
  events: ObserverEventView[];
  publishedResultsAvailable: boolean;
  publicSignals: Array<{ label: string; value: string }>;
};

export type ObserverPublishedResultsView = {
  published: boolean;
  publishedAt?: string;
  rows: Array<{
    rank: number;
    player: string;
    status: string;
    score: string;
  }>;
};

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function fallbackEvents(snapshot: Pick<ObserverSnapshotView, "currentRoundNumber" | "currentRoundStatus" | "connectedCount" | "publishedResultsAvailable">): ObserverEventView[] {
  const events: ObserverEventView[] = [];
  if (snapshot.currentRoundStatus) {
    events.push({
      code: "ROUND_STATUS",
      label: `Manche ${snapshot.currentRoundNumber || "—"} · ${snapshot.currentRoundStatus}`,
    });
  }
  events.push({
    code: "CONNECTED_COUNT",
    label: `${snapshot.connectedCount} participant${snapshot.connectedCount > 1 ? "s" : ""} connecté${snapshot.connectedCount > 1 ? "s" : ""}`,
  });
  if (snapshot.publishedResultsAvailable) {
    events.push({
      code: "RESULTS_PUBLISHED",
      label: "Résultats publics disponibles",
    });
  }
  return events;
}

export function observerSnapshotFromRpc(
  snapshot: {
    partyId?: { value?: string };
    currentPhase?: string;
    currentRoundNumber?: number;
    currentRoundStatus?: string;
    connectedCount?: number;
    participantCount?: number;
  } | undefined,
  fallbackPartyId: string,
): ObserverSnapshotView {
  const participantCount = snapshot?.participantCount ?? 0;
  const view: ObserverSnapshotView = {
    partyId: snapshot?.partyId?.value ?? fallbackPartyId,
    currentPhase: snapshot?.currentPhase ?? "Observation publique",
    currentRoundNumber: snapshot?.currentRoundNumber ?? 0,
    currentRoundStatus: snapshot?.currentRoundStatus ?? "",
    connectedCount: snapshot?.connectedCount ?? 0,
    participantCount,
    participants: Array.from({ length: participantCount }, (_, index) => ({
      label: `Participant ${index + 1}`,
      status: "Visible",
    })),
    events: [],
    publishedResultsAvailable: false,
    publicSignals: [],
  };

  view.events = fallbackEvents(view);
  view.publicSignals = [
    { label: "Participants visibles", value: String(view.participantCount) },
    { label: "Connectés", value: String(view.connectedCount) },
    { label: "Phase", value: view.currentPhase || "Observation" },
  ];
  return view;
}

export function observerSnapshotFromLive(snapshot: unknown, fallbackPartyId: string): ObserverSnapshotView {
  const value = asRecord(snapshot);
  const participantsRaw = Array.isArray(value?.participants) ? value?.participants : [];
  const eventsRaw = Array.isArray(value?.timeline) ? value?.timeline : [];
  const participantCount = readNumber(value?.playerCount, participantsRaw.length);
  const publishedResultsAvailable = Boolean(value?.publishedResultsAvailable);

  const view: ObserverSnapshotView = {
    partyId: readString(value?.partyId, fallbackPartyId),
    currentPhase: readString(value?.currentPhase, readString(value?.currentRoundStatus, "Observation publique")),
    currentRoundNumber: readNumber(value?.currentRoundNumber, 0),
    currentRoundStatus: readString(value?.currentRoundStatus, ""),
    connectedCount: readNumber(value?.connectedCount, 0),
    participantCount,
    participants: participantsRaw.map((participant, index) => {
      const row = asRecord(participant);
      return {
        label: readString(row?.label, `Participant ${index + 1}`),
        status: readString(row?.status, "Visible"),
      };
    }),
    events: eventsRaw.map((event, index) => {
      const row = asRecord(event);
      return {
        code: readString(row?.code, `EVENT_${index + 1}`),
        label: readString(row?.label, "Événement public"),
      };
    }),
    publishedResultsAvailable,
    publicSignals: [],
  };

  if (view.events.length === 0) {
    view.events = fallbackEvents(view);
  }

  view.publicSignals = [
    { label: "Participants visibles", value: String(view.participantCount) },
    { label: "Connectés", value: String(view.connectedCount) },
    { label: "Phase", value: view.currentPhase || "Observation" },
  ];
  return view;
}

export function observerPublishedResultsFromRpc(data: {
  finalScores?: Array<{
    playerId?: { value?: string };
    score?: number;
    rank?: number;
    eliminated?: boolean;
  }>;
  publishedAt?: { seconds: bigint; nanos: number };
} | undefined): ObserverPublishedResultsView {
  const rows = (data?.finalScores ?? [])
    .map((row, index) => ({
      rank: row.rank || index + 1,
      player: `Participant ${row.rank || index + 1}`,
      status: row.eliminated ? "Éliminé" : "Classé",
      score: `${(row.score ?? 0).toLocaleString("fr-FR")} pts`,
    }))
    .sort((left, right) => left.rank - right.rank);

  return {
    published: rows.length > 0 && Boolean(data?.publishedAt),
    publishedAt: data?.publishedAt ? timestampToIso(data.publishedAt) : undefined,
    rows,
  };
}
