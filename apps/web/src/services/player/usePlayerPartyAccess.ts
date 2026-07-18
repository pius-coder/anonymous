"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getMyParticipation,
  participationQueryKeys,
} from "@/services/participation/participationAdapter";
import {
  getPlayerJourneyState,
  type PlayerJourneyState,
} from "@/services/player/player-journey";
import {
  getPublicPartyByCode,
  sessionQueryKeys,
} from "@/services/session/sessionAdapter";

export function usePlayerPartyAccess(partyCode: string) {
  const code = decodeURIComponent(partyCode).trim().toUpperCase();

  const partyQuery = useQuery({
    queryKey: sessionQueryKeys.detail(code),
    queryFn: async () => {
      const result = await getPublicPartyByCode(code);
      if (!result.success) {
        throw Object.assign(new Error(result.error.message), { code: result.error.code });
      }
      return result.data;
    },
    staleTime: 20_000,
  });

  const participationQuery = useQuery({
    queryKey: participationQueryKeys.mine(code),
    queryFn: async () => {
      const result = await getMyParticipation(code);
      if (!result.success) {
        throw Object.assign(new Error(result.error.message), { code: result.error.code });
      }
      return result.data;
    },
    staleTime: 10_000,
    retry: false,
  });

  const party = partyQuery.data;
  const participation = participationQuery.data ?? null;
  const journeyState: PlayerJourneyState | null =
    party ? getPlayerJourneyState(party, participation) : null;

  return {
    code,
    partyQuery,
    participationQuery,
    party,
    participation,
    journeyState,
  };
}
