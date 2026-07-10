export const ROLES = {
  PLAYER: "PLAYER",
  SUPPORT: "SUPPORT",
  FINANCE: "FINANCE",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

export const ADMIN_ROLES: readonly string[] = [ROLES.ADMIN, ROLES.SUPER_ADMIN];
export const STAFF_ROLES: readonly string[] = [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.FINANCE, ROLES.SUPPORT];
export const FINANCE_ROLES: readonly string[] = [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.FINANCE];

export function hasRole(user: { role: string } | null, allowedRoles: readonly string[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

export function isAdmin(user: { role: string } | null): boolean {
  return hasRole(user, ADMIN_ROLES);
}

export function isStaff(user: { role: string } | null): boolean {
  return hasRole(user, STAFF_ROLES);
}

export type RoleGuardItem<T> = {
  value: T;
  roles: readonly string[];
  viewRoles?: readonly string[];
};

export function filterByRole<T>(items: RoleGuardItem<T>[], role: string): T[] {
  return items
    .filter((item) => item.roles.some((r) => r === role) || item.viewRoles?.some((r) => r === role))
    .map((item) => item.value);
}
