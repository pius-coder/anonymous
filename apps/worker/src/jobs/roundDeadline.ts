import { participationRepository, partyRepository, roundRepository } from "@session-jeu/db";
import { log } from "../logging.js";
import { recordFailure, recordSkipped, recordSuccess } from "../metrics.js";

export type RoundDeadlineCloseResult = {
  closed: number;
  skipped: number;
  failed: number;
  errors: string[];
};

/**
 * Close ACTIVE rounds past their deadline into VERIFICATION.
 * Uses atomic claimDueRoundDeadline — concurrent workers cannot double-close.
 * Never starts a party and never publishes scores.
 */
export async function closeDueRoundDeadlines(
  now = new Date(),
  correlationId = "round-deadline",
): Promise<RoundDeadlineCloseResult> {
  const result: RoundDeadlineCloseResult = { closed: 0, skipped: 0, failed: 0, errors: [] };

  try {
    const due = await roundRepository.listDueRoundDeadlines(now);

    for (const deadline of due) {
      try {
        if (deadline.round.status !== "ACTIVE") {
          result.skipped++;
          recordSkipped();
          continue;
        }

        const claimed = await roundRepository.claimDueRoundDeadline(deadline.roundId, now);
        if (!claimed) {
          result.skipped++;
          recordSkipped();
          log.info("round deadline already claimed", {
            correlationId,
            jobName: "round-deadline-close",
            jobId: deadline.roundId,
          });
          continue;
        }

        await roundRepository.updateRoundLifecycle(deadline.roundId, { status: "VERIFICATION" });
        await partyRepository.updatePartyStatus(deadline.round.partyId, "ROUND_VERIFICATION");
        const participants = await roundRepository.listRoundParticipants(deadline.roundId);
        await roundRepository.markRoundParticipantsWaitingReview(deadline.roundId);
        await Promise.all(
          participants.map(async (participant) => {
            await participationRepository.updateParticipationStatus(
              participant.participationId,
              "WAITING_REVIEW",
            );
          }),
        );
        result.closed++;
        recordSuccess();
        log.info("round deadline closed to verification", {
          correlationId,
          jobName: "round-deadline-close",
          jobId: deadline.roundId,
        });
      } catch (err) {
        result.failed++;
        recordFailure();
        const msg = `Round ${deadline.roundId}: ${err instanceof Error ? err.message : "unknown error"}`;
        result.errors.push(msg);
        log.error(msg, { correlationId, jobName: "round-deadline-close" });
      }
    }
  } catch (err) {
    const msg = `Round deadline scan failed: ${err instanceof Error ? err.message : "unknown error"}`;
    result.errors.push(msg);
    recordFailure();
    log.error(msg, { correlationId, jobName: "round-deadline-close" });
  }

  return result;
}
