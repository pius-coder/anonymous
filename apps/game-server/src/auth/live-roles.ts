const ADMIN_ROLES = new Set(["admin", "superadmin", "super_admin", "adminprimary", "admin_primary"]);
const PLAYER_ROLES = new Set(["player"]);
const READONLY_ROLES = new Set(["readobserver", "read_observer", "readonlyobserver", "readonly_observer", "observer", "readonly"]);

export function normalizeLiveRole(role: string | null | undefined): string {
  return (role ?? "").trim().toLowerCase();
}

export function isPlayerRole(role: string | null | undefined): boolean {
  return PLAYER_ROLES.has(normalizeLiveRole(role));
}

export function isAdminRole(role: string | null | undefined): boolean {
  return ADMIN_ROLES.has(normalizeLiveRole(role));
}

export function isReadonlyObserverRole(role: string | null | undefined): boolean {
  return READONLY_ROLES.has(normalizeLiveRole(role));
}

export function canSubmitPlayerCommand(role: string | null | undefined): boolean {
  return isPlayerRole(role);
}

export function canRequestAdminSnapshot(role: string | null | undefined): boolean {
  return isAdminRole(role);
}

export function canRequestReadonlySnapshot(role: string | null | undefined): boolean {
  return isAdminRole(role) || isReadonlyObserverRole(role);
}
