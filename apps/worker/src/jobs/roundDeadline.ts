import { participationRepository, partyRepository, roundRepository } from "@session-jeu/db";

export type RoundDeadlineCloseResult = {
  closed: number;
  skipped: number;
  failed: number;
  errors: string[];
};

export async function closeDueRoundDeadlines(now = new Date()): Promise<RoundDeadlineCloseResult> {
  const result: RoundDeadlineCloseResult = { closed: 0, skipped: 0, failed: 0, errors: [] };

  try {
    const due = await roundRepository.listDueRoundDeadlines(now);

    for (const deadline of due) {
      try {
        if (deadline.round.status !== "ACTIVE") {
          result.skipped++;
          continue;
        }

        const claimed = await roundRepository.claimDueRoundDeadline(deadline.roundId, now);
        if (!claimed) {
          result.skipped++;
          continue;
        }

        await roundRepository.updateRoundLifecycle(deadline.roundId, { status: "VERIFICATION" });
        await partyRepository.updatePartyStatus(deadline.round.partyId, "ROUND_VERIFICATION");
        const participants = await roundRepository.listRoundParticipants(deadline.roundId);
        await roundRepository.markRoundParticipantsWaitingReview(deadline.roundId);
        await Promise.all(participants.map(async (participant) => {
          await participationRepository.updateParticipationStatus(participant.participationId, "WAITING_REVIEW");
        }));
        result.closed++;
      } catch (err) {
        result.failed++;
        result.errors.push(`Round ${deadline.roundId}: ${err instanceof Error ? err.message : "unknown error"}`);
      }
    }
  } catch (err) {
    result.errors.push(`Round deadline scan failed: ${err instanceof Error ? err.message : "unknown error"}`);
  }

  return result;
}
