import { describe, it, expect } from "vitest";
import type {
  BaseEvent,
  SessionEvent,
  RegistrationEvent,
  PaymentEvent,
  AppEvent,
} from "../index.js";

describe("Event Types", () => {
  it("should create a valid BaseEvent", () => {
    const event: BaseEvent = {
      id: "evt-1",
      type: "session.created",
      timestamp: new Date().toISOString(),
      source: "api",
    };
    expect(event.id).toBe("evt-1");
    expect(event.type).toBe("session.created");
    expect(event.source).toBe("api");
  });

  it("should create a valid SessionEvent", () => {
    const event: SessionEvent = {
      id: "evt-1",
      type: "session.created",
      timestamp: new Date().toISOString(),
      source: "api",
      data: {
        sessionId: "sess-1",
        code: "GAME001",
        name: "Test Session",
        status: "ACTIVE",
      },
    };
    expect(event.type).toBe("session.created");
    expect(event.data.sessionId).toBe("sess-1");
    expect(event.data.code).toBe("GAME001");
    expect(event.data.name).toBe("Test Session");
    expect(event.data.status).toBe("ACTIVE");
  });

  it("should create a valid RegistrationEvent", () => {
    const event: RegistrationEvent = {
      id: "evt-2",
      type: "registration.created",
      timestamp: new Date().toISOString(),
      source: "api",
      data: {
        registrationId: "reg-1",
        sessionId: "sess-1",
        userId: "user-1",
        status: "PENDING",
      },
    };
    expect(event.type).toBe("registration.created");
    expect(event.data.registrationId).toBe("reg-1");
    expect(event.data.sessionId).toBe("sess-1");
    expect(event.data.userId).toBe("user-1");
    expect(event.data.status).toBe("PENDING");
  });

  it("should create a valid PaymentEvent", () => {
    const event: PaymentEvent = {
      id: "evt-3",
      type: "payment.completed",
      timestamp: new Date().toISOString(),
      source: "worker",
      data: {
        paymentId: "pay-1",
        userId: "user-1",
        amount: 5000,
        status: "COMPLETED",
      },
    };
    expect(event.type).toBe("payment.completed");
    expect(event.data.paymentId).toBe("pay-1");
    expect(event.data.amount).toBe(5000);
    expect(event.data.status).toBe("COMPLETED");
  });

  it("should accept AppEvent union type", () => {
    const sessionEvent: AppEvent = {
      id: "evt-1",
      type: "session.started",
      timestamp: new Date().toISOString(),
      source: "api",
      data: {
        sessionId: "sess-1",
        code: "GAME001",
        name: "Test",
        status: "ACTIVE",
      },
    };
    expect(sessionEvent.type).toBe("session.started");
  });
});
