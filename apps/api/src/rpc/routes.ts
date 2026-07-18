import type { ConnectRouter } from "@connectrpc/connect";
import {
  IdentityV1,
  ParticipationV1,
  PaymentV1,
  PreparationV1,
  RealtimeV1,
  RoundV1,
  ScoringV1,
  SessionV1,
} from "@session-jeu/contracts";
import { identityService } from "./identity-service.js";
import { participationService } from "./participation-service.js";
import { paymentService } from "./payment-service.js";
import { preparationService } from "./preparation-service.js";
import { realtimeService } from "./realtime-service.js";
import { roundService } from "./round-service.js";
import { scoringService } from "./scoring-service.js";
import { sessionService } from "./session-service.js";

/**
 * Central Connect composition (SEQ-03 ownership).
 * Handlers are public exports from WAVE-A / core lots — do not inline domain logic here.
 */
export function registerRpcRoutes(router: ConnectRouter): void {
  router.service(IdentityV1.IdentityService, identityService);
  router.service(SessionV1.SessionService, sessionService);
  router.service(ParticipationV1.ParticipationService, participationService);
  router.service(PreparationV1.PreparationService, preparationService);
  router.service(PaymentV1.PaymentService, paymentService);
  router.service(RoundV1.RoundService, roundService);
  router.service(RealtimeV1.RealtimeAccessService, realtimeService);
  router.service(ScoringV1.ScoringService, scoringService);
}
