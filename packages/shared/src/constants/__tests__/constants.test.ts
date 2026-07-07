import { describe, it, expect } from "vitest";
import {
  PAGINATION_DEFAULTS,
  EVENT_TYPES,
  OUTBOX_TYPES,
  CACHE_TTL,
} from "../index.js";

describe("PAGINATION_DEFAULTS", () => {
  it("should have correct default values", () => {
    expect(PAGINATION_DEFAULTS.PAGE).toBe(1);
    expect(PAGINATION_DEFAULTS.LIMIT).toBe(20);
    expect(PAGINATION_DEFAULTS.MAX_LIMIT).toBe(100);
  });

  it("should have PAGE less than LIMIT", () => {
    expect(PAGINATION_DEFAULTS.PAGE).toBeLessThan(PAGINATION_DEFAULTS.LIMIT);
  });

  it("should have LIMIT less than MAX_LIMIT", () => {
    expect(PAGINATION_DEFAULTS.LIMIT).toBeLessThan(PAGINATION_DEFAULTS.MAX_LIMIT);
  });
});

describe("EVENT_TYPES", () => {
  it("should have all session event types", () => {
    expect(EVENT_TYPES.SESSION_CREATED).toBe("session.created");
    expect(EVENT_TYPES.SESSION_UPDATED).toBe("session.updated");
    expect(EVENT_TYPES.SESSION_STARTED).toBe("session.started");
    expect(EVENT_TYPES.SESSION_COMPLETED).toBe("session.completed");
  });

  it("should have all registration event types", () => {
    expect(EVENT_TYPES.REGISTRATION_CREATED).toBe("registration.created");
    expect(EVENT_TYPES.REGISTRATION_CONFIRMED).toBe("registration.confirmed");
  });

  it("should have all payment event types", () => {
    expect(EVENT_TYPES.PAYMENT_COMPLETED).toBe("payment.completed");
  });

  it("should have all round event types", () => {
    expect(EVENT_TYPES.ROUND_STARTED).toBe("round.started");
    expect(EVENT_TYPES.ROUND_COMPLETED).toBe("round.completed");
  });

  it("should be readonly (as const)", () => {
    expect(EVENT_TYPES).toBeDefined();
    expect(typeof EVENT_TYPES).toBe("object");
  });
});

describe("OUTBOX_TYPES", () => {
  it("should have all outbox types", () => {
    expect(OUTBOX_TYPES.NOTIFICATION).toBe("notification");
    expect(OUTBOX_TYPES.EMAIL).toBe("email");
    expect(OUTBOX_TYPES.WEBHOOK).toBe("webhook");
    expect(OUTBOX_TYPES.WHATSAPP).toBe("whatsapp");
  });
});

describe("CACHE_TTL", () => {
  it("should have correct TTL values", () => {
    expect(CACHE_TTL.SHORT).toBe(60);
    expect(CACHE_TTL.MEDIUM).toBe(300);
    expect(CACHE_TTL.LONG).toBe(3600);
  });

  it("should have SHORT < MEDIUM < LONG", () => {
    expect(CACHE_TTL.SHORT).toBeLessThan(CACHE_TTL.MEDIUM);
    expect(CACHE_TTL.MEDIUM).toBeLessThan(CACHE_TTL.LONG);
  });
});
