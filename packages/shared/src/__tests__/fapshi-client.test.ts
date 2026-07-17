import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FapshiClientError,
  resolveFapshiCredentials,
  wireStatusToEnum,
} from "../payments/fapshi-client.js";

afterEach(() => {
  delete process.env.APP_ENV;
  delete process.env.FAPSHI_API_USER;
  delete process.env.FAPSHI_API_KEY;
  delete process.env.FAPSHI_PAYOUT_API_USER;
  delete process.env.FAPSHI_PAYOUT_API_KEY;
  delete process.env.FAPSHI_COLLECTION_API_USER;
  delete process.env.FAPSHI_COLLECTION_API_KEY;
  vi.unstubAllGlobals();
});

describe("fapshi dual credentials", () => {
  it("keeps collection and payout credential resolvers independent", () => {
    process.env.FAPSHI_COLLECTION_API_USER = "col-user";
    process.env.FAPSHI_COLLECTION_API_KEY = "col-key";
    process.env.FAPSHI_PAYOUT_API_USER = "pay-user";
    process.env.FAPSHI_PAYOUT_API_KEY = "pay-key";

    expect(resolveFapshiCredentials("COLLECTION")).toEqual({
      apiuser: "col-user",
      apikey: "col-key",
    });
    expect(resolveFapshiCredentials("PAYOUT")).toEqual({
      apiuser: "pay-user",
      apikey: "pay-key",
    });
  });

  it("strict deploy requires dedicated payout keys", () => {
    process.env.APP_ENV = "production";
    process.env.FAPSHI_API_USER = "shared";
    process.env.FAPSHI_API_KEY = "shared-key";
    expect(() => resolveFapshiCredentials("PAYOUT")).toThrow(FapshiClientError);
  });

  it("maps UNKNOWN wire status to UNSPECIFIED enum name", () => {
    expect(wireStatusToEnum("UNKNOWN")).toBe("UNSPECIFIED");
    expect(wireStatusToEnum("SUCCESSFUL")).toBe("SUCCESSFUL");
  });
});
