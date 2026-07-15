import { api } from "@/lib/api";

type CommandResult = {
  roundId: string;
  status: string;
};

type PlayerFinishedResult = {
  status: string;
  duplicate: boolean;
};

export type ConfigureRoundRequest = {
  roundNumber: number;
  minigameId: string;
  durationSeconds: number;
  auditReason?: string;
};

export type FinishRoundRequest = {
  actionNonce: string;
  payload?: Record<string, string | number | boolean | null>;
};

export const RoundService = {
  configure(partyId: string, body: ConfigureRoundRequest) {
    return api<CommandResult>(`/v1/admin/parties/${partyId}/rounds/configure`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  startBriefing(roundId: string) {
    return api<CommandResult>(`/v1/admin/rounds/${roundId}/briefing`, { method: "POST" });
  },
  activate(roundId: string) {
    return api<CommandResult>(`/v1/admin/rounds/${roundId}/start`, { method: "POST" });
  },
  pause(roundId: string, auditReason: string) {
    return api<CommandResult>(`/v1/admin/rounds/${roundId}/pause`, {
      method: "POST",
      body: JSON.stringify({ auditReason }),
    });
  },
  resume(roundId: string, auditReason: string) {
    return api<CommandResult>(`/v1/admin/rounds/${roundId}/resume`, {
      method: "POST",
      body: JSON.stringify({ auditReason }),
    });
  },
  close(roundId: string, auditReason: string) {
    return api<CommandResult>(`/v1/admin/rounds/${roundId}/close`, {
      method: "POST",
      body: JSON.stringify({ auditReason }),
    });
  },
  finish(roundId: string, body: FinishRoundRequest) {
    return api<PlayerFinishedResult>(`/v1/rounds/${roundId}/finish`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
