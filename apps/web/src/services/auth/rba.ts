import { isStaff, isAdmin, hasAnyPermission } from "@session-jeu/game-engine";
import type { SystemRole, Permission } from "@session-jeu/game-engine";

export { isStaff, isAdmin, hasAnyPermission };
export type { SystemRole, Permission };

export const STAFF_ROLES: readonly SystemRole[] = ["SUPPORT", "FINANCE", "ADMIN", "SUPER_ADMIN"];
export const ADMIN_ROLES: readonly SystemRole[] = ["ADMIN", "SUPER_ADMIN"];

export function hasRole(userRoles: SystemRole[], targetRoles: SystemRole[]): boolean {
  return userRoles.some((r) => targetRoles.includes(r));
}
