export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
};

export const EVENT_TYPES = {
  SESSION_CREATED: "session.created",
  SESSION_UPDATED: "session.updated",
  SESSION_STARTED: "session.started",
  SESSION_COMPLETED: "session.completed",
  REGISTRATION_CREATED: "registration.created",
  REGISTRATION_CONFIRMED: "registration.confirmed",
  PAYMENT_COMPLETED: "payment.completed",
  ROUND_STARTED: "round.started",
  ROUND_COMPLETED: "round.completed",
} as const;

export const OUTBOX_TYPES = {
  NOTIFICATION: "notification",
  EMAIL: "email",
  WEBHOOK: "webhook",
  WHATSAPP: "whatsapp",
} as const;

export const CACHE_TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
} as const;
