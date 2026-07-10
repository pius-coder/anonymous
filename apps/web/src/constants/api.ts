export const API_BASE = process.env.API_URL || "http://localhost:3001";
export const API_REWRITE_BASE = "/api/v1";

export const PAGINATION = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/v1/auth/login",
    REGISTER: "/v1/auth/register",
    LOGOUT: "/v1/auth/logout",
  },
  ME: "/v1/me",
  SESSIONS: {
    PUBLIC: "/v1/public/sessions",
    DETAIL: (code: string) => `/v1/public/sessions/${code}`,
    REGISTER: (id: string) => `/v1/sessions/${id}/register`,
    REGISTRATION: (id: string) => `/v1/sessions/${id}/registration`,
    CANCEL: (id: string) => `/v1/registrations/${id}/cancel`,
    LOBBY: (id: string) => `/v1/sessions/${id}/lobby`,
    JOIN_TOKEN: (id: string) => `/v1/sessions/${id}/join-token`,
    CHECK_IN: (id: string) => `/v1/sessions/${id}/check-in`,
  },
  ADMIN: {
    DASHBOARD: "/v1/admin/dashboard",
    SESSIONS: "/v1/admin/sessions",
    SESSION: (id: string) => `/v1/admin/sessions/${id}`,
    PAYMENTS: "/v1/admin/payments",
    PAYMENT: (id: string) => `/v1/admin/payments/${id}`,
    WALLET: (userId: string) => `/v1/admin/wallets/${userId}`,
    MINIGAMES: "/v1/admin/minigames",
    MINIGAME: (id: string) => `/v1/admin/minigames/${id}`,
    COMPLIANCE: "/v1/admin/compliance/gates",
    COMPLIANCE_GATE: (id: string) => `/v1/admin/compliance/gates/${id}`,
    AUDIT_LOGS: "/v1/admin/audit-logs",
    USERS: "/v1/admin/support/users",
    USER: (id: string) => `/v1/admin/support/users/${id}`,
    LIVE: {
      ROUNDS_START: (id: string) => `/v1/admin/live/${id}/rounds/start`,
      PAUSE: (id: string) => `/v1/admin/live/${id}/pause`,
      RESUME: (id: string) => `/v1/admin/live/${id}/resume`,
    },
  },
  PLAYERS: {
    ME: "/v1/players/me",
    HISTORY: "/v1/players/me/history",
    STATS: "/v1/players/me/stats",
  },
  NOTIFICATIONS: "/v1/me/notifications",
  NOTIFICATION_PREFERENCES: "/v1/me/notification-preferences",
  PAYMENTS: {
    FAPSHI_INITIATE: "/v1/payments/fapshi/initiate",
    STATUS: (id: string) => `/v1/payments/${id}/status`,
  },
  WALLET: {
    ME: "/v1/wallet/me",
    LEDGER: "/v1/wallet/me/ledger",
    WITHDRAW: "/v1/wallet/me/withdraw",
  },
  LIVE: {
    STATE: (id: string) => `/v1/live/${id}/state`,
    RESERVATION: (id: string) => `/v1/live/sessions/${id}/reservation`,
  },
} as const;
