export const SYSTEM_ROLES = ["PLAYER", "SUPPORT", "FINANCE", "ADMIN", "SUPER_ADMIN"] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const STAFF_ROLES: readonly SystemRole[] = ["SUPPORT", "FINANCE", "ADMIN", "SUPER_ADMIN"];
export const ADMIN_ROLES: readonly SystemRole[] = ["ADMIN", "SUPER_ADMIN"];

export const PERMISSIONS = [
  "PARTY_START",
  "ROUND_START",
  "RESULT_VERIFY",
  "RESULT_PUBLISH",
  "READONLY_OBSERVE",
  "MANAGE_USERS",
  "MANAGE_PAYMENTS",
  "VIEW_AUDIT",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<SystemRole, readonly Permission[]> = {
  PLAYER: [],
  SUPPORT: ["VIEW_AUDIT"],
  FINANCE: ["MANAGE_PAYMENTS", "VIEW_AUDIT"],
  ADMIN: [
    "PARTY_START",
    "ROUND_START",
    "RESULT_VERIFY",
    "RESULT_PUBLISH",
    "MANAGE_USERS",
    "VIEW_AUDIT",
    "READONLY_OBSERVE",
  ],
  SUPER_ADMIN: [
    "PARTY_START",
    "ROUND_START",
    "RESULT_VERIFY",
    "RESULT_PUBLISH",
    "MANAGE_USERS",
    "MANAGE_PAYMENTS",
    "VIEW_AUDIT",
    "READONLY_OBSERVE",
  ],
};

export function roleHasPermission(role: SystemRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(roles: SystemRole[], permission: Permission): boolean {
  return roles.some((r) => roleHasPermission(r, permission));
}

export function isStaff(role: SystemRole): boolean {
  return STAFF_ROLES.includes(role);
}

export function isAdmin(role: SystemRole): boolean {
  return ADMIN_ROLES.includes(role);
}
