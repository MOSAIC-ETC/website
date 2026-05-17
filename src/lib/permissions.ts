// Canonical list of permission keys used across the system. Keep in sync with
// the seeded `admin` role and any documentation.

export const PERMISSIONS = {
  FILES_UPLOAD: "files.upload",
  FILES_DELETE: "files.delete",
  FILES_RESTORE: "files.restore",
  PARAMS_EDIT: "params.edit",
  PARAMS_REVERT: "params.revert",
  USERS_MANAGE: "users.manage",
  ROLES_MANAGE: "roles.manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);

export function hasPermission(userPermissions: readonly string[] | undefined, required: PermissionKey): boolean {
  return userPermissions?.includes(required) ?? false;
}
