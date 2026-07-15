import type { ConnectRouter } from "@connectrpc/connect";
import { IdentityV1, RoundV1 } from "@session-jeu/contracts";
import { identityService } from "./identity-service.js";
import { roundService } from "./round-service.js";

export function registerRpcRoutes(router: ConnectRouter): void {
  router.service(IdentityV1.IdentityService, identityService);
  router.service(RoundV1.RoundService, roundService);
}
