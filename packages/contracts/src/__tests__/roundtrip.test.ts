import { describe, it, expect } from "vitest";
import { create, toBinary, fromBinary } from "@bufbuild/protobuf";
import {
  MiniGameCommandSchema,
  MiniGamePublicStateSchema,
} from "../gen/minigame/v1/manifest_pb.js";
import { MemorySequencePlayerCommandSchema } from "../gen/minigame/v1/memory_sequence_pb.js";
import { SilentVotePrivateStateSchema } from "../gen/minigame/v1/silent_vote_pb.js";
import {
  ProcessPaymentCommandSchema,
  ProviderWebhookEventSchema,
  FapshiWireStatus,
  PaymentInternalStatus,
} from "../gen/payment/v1/payment_pb.js";
import { ErrorEnvelopeSchema, ErrorCode } from "../gen/common/v1/errors_pb.js";
import { assertAudienceSafe, findForbiddenFields } from "../audience.js";

describe("Protobuf golden round-trip", () => {
  it("round-trips typed memory-sequence command", () => {
    const cmd = create(MiniGameCommandSchema, {
      correlationId: "corr-1",
      roundId: "round-1",
      playerId: "player-1",
      action: "submit_input",
      nonce: "n1",
      clientSequence: BigInt(1),
      schemaId: "minigame.memory_sequence.command.v1",
      schemaVersion: "1.0.0",
      payloadMaxBytes: 4096,
      typed: {
        case: "memorySequence",
        value: create(MemorySequencePlayerCommandSchema, {
          schemaVersion: "1.0.0",
          action: "submit_input",
          symbolId: "sym-a",
          stepIndex: 0,
          clientTimestampMs: BigInt(1),
        }),
      },
    });

    const bytes = toBinary(MiniGameCommandSchema, cmd);
    const decoded = fromBinary(MiniGameCommandSchema, bytes);
    expect(decoded.action).toBe("submit_input");
    expect(decoded.typed.case).toBe("memorySequence");
    if (decoded.typed.case === "memorySequence") {
      expect(decoded.typed.value.symbolId).toBe("sym-a");
    }
  });

  it("round-trips public state without private fields", () => {
    const pub = create(MiniGamePublicStateSchema, {
      roundId: "r1",
      minigameId: "mg-1",
      phase: "ACTIVE",
      remainingSeconds: 30,
      participantCount: 2,
      version: "1.0.0",
    });
    const again = fromBinary(MiniGamePublicStateSchema, toBinary(MiniGamePublicStateSchema, pub));
    assertAudienceSafe(
      {
        round_id: again.roundId,
        phase: again.phase,
        participant_count: again.participantCount,
      },
      "observer",
    );
  });

  it("round-trips payment webhook event with wire vs internal separation", () => {
    const event = create(ProviderWebhookEventSchema, {
      inboxId: "inbox-1",
      provider: "fapshi",
      providerTransId: "trans-abc",
      wireStatus: FapshiWireStatus.SUCCESSFUL,
      externalEventId: "evt-1",
      redactedSummary: "status=SUCCESSFUL",
    });
    const decoded = fromBinary(ProviderWebhookEventSchema, toBinary(ProviderWebhookEventSchema, event));
    expect(decoded.wireStatus).toBe(FapshiWireStatus.SUCCESSFUL);
    expect(decoded.provider).toBe("fapshi");
  });

  it("round-trips process payment with idempotency", () => {
    const cmd = create(ProcessPaymentCommandSchema, {
      playerId: { value: "p1" },
      amount: { currency: "XAF", units: BigInt(2500), nanos: 0 },
      provider: "fapshi",
      idempotencyKey: "idem-1",
      partyId: "party-1",
    });
    const decoded = fromBinary(ProcessPaymentCommandSchema, toBinary(ProcessPaymentCommandSchema, cmd));
    expect(decoded.idempotencyKey).toBe("idem-1");
    expect(PaymentInternalStatus.AWAITING_PROVIDER).toBeDefined();
  });

  it("round-trips stable error envelope", () => {
    const env = create(ErrorEnvelopeSchema, {
      detail: {
        code: ErrorCode.PAYLOAD_TOO_LARGE,
        message: "payload exceeds contract max",
        domain: "minigame",
      },
      correlationId: { value: "c1" },
      retryable: false,
      publicReason: "PAYLOAD_TOO_LARGE",
    });
    const decoded = fromBinary(ErrorEnvelopeSchema, toBinary(ErrorEnvelopeSchema, env));
    expect(decoded.detail?.code).toBe(ErrorCode.PAYLOAD_TOO_LARGE);
  });
});

describe("Audience negative fixtures", () => {
  it("rejects secret and role leaks on player views", () => {
    const leak = {
      api_key: "x",
      provisional_scores: [{ score: 1 }],
      own_role_id: "saboteur",
      cached_choice: "hold",
      partner_choice_id: "release",
    };
    const hits = findForbiddenFields(leak, "player");
    expect(hits.join(" ")).toMatch(/api_key|provisional|own_role|cached_choice|partner_choice/);
    expect(() => assertAudienceSafe(leak, "player")).toThrow();
  });

  it("rejects silent-vote private fields for observer", () => {
    const privateView = create(SilentVotePrivateStateSchema, {
      schemaVersion: "1.0.0",
      playerId: { value: "p1" },
      ownRoleId: "saboteur",
      ownVoteTargetId: "p2",
      privateHint: "you are saboteur",
    });
    const asJson = {
      own_role_id: privateView.ownRoleId,
      private_hint: privateView.privateHint,
    };
    expect(findForbiddenFields(asJson, "observer").length).toBeGreaterThan(0);
  });

  it("allows public silent-vote phase without roles", () => {
    const publicOk = {
      phase: "DISCUSSION",
      participant_ids: ["p1", "p2"],
      votes_locked: 0,
    };
    assertAudienceSafe(publicOk, "observer");
    assertAudienceSafe(publicOk, "player");
  });
});
