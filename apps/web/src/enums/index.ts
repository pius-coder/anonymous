export const UserRoles = {
  PLAYER: "PLAYER",
  SUPPORT: "SUPPORT",
  FINANCE: "FINANCE",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles];

export const SessionStatuses = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  OPEN: "OPEN",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type SessionStatus = (typeof SessionStatuses)[keyof typeof SessionStatuses];
