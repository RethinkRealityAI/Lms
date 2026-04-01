export const ADMIN_ROLES = new Set(["platform_admin", "institution_admin", "instructor", "admin"]);

export function isAdminRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return ADMIN_ROLES.has(role.trim().toLowerCase());
}

export function normalizeRole(role: string | null | undefined): string | null {
  if (!role) return null;
  return role.trim().toLowerCase();
}
