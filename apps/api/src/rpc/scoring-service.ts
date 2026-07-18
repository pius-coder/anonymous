import { Code, ConnectError, type ServiceImpl } from "@connectrpc/connect";
import { CommonV1, ScoringV1 } from "@session-jeu/contracts";
import {
  ScoringUseCaseError,
  correctProvisionalScore,
  getPublishedResults,
  listProvisionalScores,
  publishResults,
  type DurableScoreStatus,
  type ProvisionalScoreView,
  type PublishedScoreView,
} from "../use-cases/scoring/scoring.use-case.js";
import {
  connectCodeFromHttpStatus,
  requireRpcRole,
  requireRpcUser,
} from "./auth-context.js";

function toTimestamp(value: string | Date | null | undefined) {
  if (!value) return undefined;
  const milliseconds = new Date(value).getTime();
  return {
    seconds: BigInt(Math.floor(milliseconds / 1_000)),
    nanos: (milliseconds % 1_000) * 1_000_000,
  };
}

function toProtoScoreStatus(status: DurableScoreStatus): ScoringV1.ScoreStatus {
  switch (status) {
    case "PROVISIONAL":
    case "PENDING":
      return ScoringV1.ScoreStatus.PROVISIONAL;
    case "UNDER_REVIEW":
      return ScoringV1.ScoreStatus.UNDER_REVIEW;
    case "CORRECTED":
    case "VERIFIED":
      return ScoringV1.ScoreStatus.CORRECTED;
    case "PUBLISHED":
      return ScoringV1.ScoreStatus.PUBLISHED;
    case "VOIDED":
      return ScoringV1.ScoreStatus.VOIDED;
    default:
      return ScoringV1.ScoreStatus.UNSPECIFIED;
  }
}

function toPlayerScore(view: ProvisionalScoreView | PublishedScoreView) {
  return {
    playerId: { value: view.playerId },
    score: view.score,
    rank: view.rank ?? 0,
    eliminated: false,
  };
}

function handleScoringError(error: unknown): never {
  if (error instanceof ScoringUseCaseError) {
    // Prefix stable application code so L4 tests can assert without leaking provisional rows.
    throw new ConnectError(
      `[${error.code}] ${error.message}`,
      connectCodeFromHttpStatus(error.httpStatus),
    );
  }
  throw ConnectError.from(error, Code.Internal);
}

function ensureText(value: string | undefined, field: string): string {
  if (!value?.trim()) throw new ConnectError(`${field} est requis`, Code.InvalidArgument);
  return value.trim();
}

/**
 * ScoringService transport adapter.
 * Mount via SEQ-03 (central router ownership). Handlers are testable in isolation.
 */
export const scoringService: Partial<ServiceImpl<typeof ScoringV1.ScoringService>> = {
  async listProvisionalScores(request, context) {
    // Admin / super-admin only — never project to player or observer (AC-13-01, AC-13-06).
    await requireRpcRole(context, "ADMIN", "SUPER_ADMIN");
    try {
      const roundId = ensureText(request.roundId, "round_id");
      const result = await listProvisionalScores(roundId);
      return {
        scores: result.scores.map(toPlayerScore),
        status: toProtoScoreStatus(result.aggregateStatus),
        audience: CommonV1.Audience.ADMIN,
      };
    } catch (error) {
      handleScoringError(error);
    }
  },

  async correctProvisionalScore(request, context) {
    const actor = await requireRpcRole(context, "ADMIN", "SUPER_ADMIN");
    try {
      const roundId = ensureText(request.roundId, "round_id");
      const playerId = ensureText(request.playerId?.value, "player_id");
      const reason = ensureText(request.reason, "reason");
      await correctProvisionalScore({
        roundId,
        playerId,
        correctedScore: request.correctedScore,
        reason,
        actorId: actor.id,
        // corrected_by is informational; authoritative actor comes from session.
      });
      return {};
    } catch (error) {
      handleScoringError(error);
    }
  },

  async publishResults(request, context) {
    const actor = await requireRpcRole(context, "ADMIN", "SUPER_ADMIN");
    try {
      const roundId = ensureText(request.roundId, "round_id");
      const partyId = ensureText(request.partyId?.value, "party_id");
      await publishResults({
        roundId,
        partyId,
        actorId: actor.id,
      });
      return {};
    } catch (error) {
      handleScoringError(error);
    }
  },

  async getPublishedResults(request, context) {
    // Authenticated audiences only; provisional scores never included.
    const user = await requireRpcUser(context);
    try {
      const partyId = ensureText(request.partyId?.value, "party_id");
      const isAdmin = user.roles.some((role) => role === "ADMIN" || role === "SUPER_ADMIN");
      const isObserver = user.roles.includes("OBSERVER");
      const audience = isAdmin ? "admin" : isObserver ? "observer" : "player";
      const result = await getPublishedResults(partyId, audience);

      // Explicit waiting projection: empty final_scores, no provisional fields.
      if (result.waitingVerification || result.scores.length === 0) {
        return {
          roundId: result.roundId,
          finalScores: [],
          publishedAt: undefined,
          audience:
            audience === "admin"
              ? CommonV1.Audience.ADMIN
              : audience === "observer"
                ? CommonV1.Audience.READONLY_OBSERVER
                : CommonV1.Audience.PLAYER,
        };
      }

      return {
        roundId: result.roundId,
        finalScores: result.scores.map(toPlayerScore),
        publishedAt: toTimestamp(result.publishedAt),
        audience:
          audience === "admin"
            ? CommonV1.Audience.ADMIN
            : audience === "observer"
              ? CommonV1.Audience.READONLY_OBSERVER
              : CommonV1.Audience.PLAYER,
      };
    } catch (error) {
      handleScoringError(error);
    }
  },
};

/** Helper for SEQ-03 router registration documentation / tests. */
export const SCORING_SERVICE_MOUNT = {
  package: "sessionjeu.scoring.v1",
  service: "ScoringService",
  impl: "apps/api/src/rpc/scoring-service.ts",
  note: "Register in apps/api/src/rpc/routes.ts during SEQ-03 merge train only.",
} as const;
