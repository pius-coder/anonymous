/**
 * SEQ-03: prove central router mounts WAVE-A public exports (composition only).
 * Domain L4 stays in per-lot tests with local createRouterTransport mounts.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Code,
  ConnectError,
  createClient,
  createRouterTransport,
} from "@connectrpc/connect";
import {
  ParticipationV1,
  PaymentV1,
  PreparationV1,
  ScoringV1,
  SessionV1,
} from "@session-jeu/contracts";
import { describe, expect, it } from "vitest";
import { registerRpcRoutes } from "../routes.js";

const routesPath = resolve(dirname(fileURLToPath(import.meta.url)), "../routes.ts");
const routesSource = readFileSync(routesPath, "utf8");

const REQUIRED_MOUNTS = [
  "IdentityV1.IdentityService",
  "SessionV1.SessionService",
  "ParticipationV1.ParticipationService",
  "PreparationV1.PreparationService",
  "PaymentV1.PaymentService",
  "RoundV1.RoundService",
  "RealtimeV1.RealtimeAccessService",
  "ScoringV1.ScoringService",
] as const;

describe("SEQ-03 registerRpcRoutes composition", () => {
  it("registers all WAVE-A + core services in routes.ts source", () => {
    for (const mount of REQUIRED_MOUNTS) {
      expect(routesSource, `missing mount ${mount}`).toContain(`router.service(${mount}`);
    }
  });

  it("builds a Connect router transport without throw", () => {
    expect(() => createRouterTransport(registerRpcRoutes)).not.toThrow();
  });

  it("exposes mounted WAVE-A procedures (not missing-service Unimplemented)", async () => {
    const transport = createRouterTransport(registerRpcRoutes);
    const session = createClient(SessionV1.SessionService, transport);
    const participation = createClient(ParticipationV1.ParticipationService, transport);
    const preparation = createClient(PreparationV1.PreparationService, transport);
    const payment = createClient(PaymentV1.PaymentService, transport);
    const scoring = createClient(ScoringV1.ScoringService, transport);

    const probes: Array<{ name: string; run: () => Promise<unknown> }> = [
      { name: "Session.ListParties", run: () => session.listParties({ pageSize: 1, pageToken: "" }) },
      {
        name: "Participation.ListParticipations",
        run: () => participation.listParticipations({ partyId: { value: "probe" } }),
      },
      {
        name: "Preparation.GetPreparationState",
        run: () => preparation.getPreparationState({ partyId: { value: "probe" } }),
      },
      { name: "Payment.GetWallet", run: () => payment.getWallet({}) },
      {
        name: "Scoring.GetPublishedResults",
        run: () => scoring.getPublishedResults({ roundId: "probe" }),
      },
    ];

    for (const probe of probes) {
      try {
        await probe.run();
      } catch (error) {
        const ce = ConnectError.from(error);
        // Missing registration → Unimplemented with procedure/service message.
        // Registered handlers may fail auth/validation/DB with other codes.
        if (ce.code === Code.Unimplemented) {
          const msg = `${ce.rawMessage} ${ce.message}`.toLowerCase();
          expect(
            msg.includes("not implemented") &&
              (msg.includes("service") || msg.includes("procedure") || msg.includes("method")),
            `${probe.name} looks unregistered: ${ce.message}`,
          ).toBe(false);
        }
      }
    }
  });
});
