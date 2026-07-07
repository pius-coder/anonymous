export interface BaseEvent {
  id: string;
  type: string;
  timestamp: string;
  source: string;
}

export interface SessionEvent extends BaseEvent {
  type: "session.created" | "session.updated" | "session.started" | "session.completed";
  data: {
    sessionId: string;
    code: string;
    name: string;
    status: string;
  };
}

export interface RegistrationEvent extends BaseEvent {
  type: "registration.created" | "registration.confirmed" | "registration.cancelled";
  data: {
    registrationId: string;
    sessionId: string;
    userId: string;
    status: string;
  };
}

export interface PaymentEvent extends BaseEvent {
  type: "payment.completed" | "payment.failed" | "payment.refunded";
  data: {
    paymentId: string;
    userId: string;
    amount: number;
    status: string;
  };
}

export type AppEvent = SessionEvent | RegistrationEvent | PaymentEvent;
