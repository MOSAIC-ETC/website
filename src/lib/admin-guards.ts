// Guards that prevent the system from locking itself out. See TCC.md §3 — the
// "last-admin" problem: any mutation that could remove the only user holding
// `users.manage` or `roles.manage` must be rejected, or there'd be no path back.

import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const SELF_LOCKING = [PERMISSIONS.USERS_MANAGE, PERMISSIONS.ROLES_MANAGE] as const;

async function countUsersWithPermission(perm: string, excludeUserId?: string): Promise<number> {
  return prisma.user.count({
    where: {
      id: excludeUserId ? { not: excludeUserId } : undefined,
      role: { permissions: { has: perm } },
    },
  });
}

async function countUsersWithRole(roleId: string, excludeUserId?: string): Promise<number> {
  return prisma.user.count({
    where: {
      roleId,
      id: excludeUserId ? { not: excludeUserId } : undefined,
    },
  });
}

// Throws if changing `userId` from their current role would leave 0 users holding
// any self-locking permission they currently provide.
export async function ensureUserRoleChangeIsSafe(args: { userId: string; newRoleId: string }): Promise<void> {
  const [user, newRole] = await Promise.all([
    prisma.user.findUnique({ where: { id: args.userId }, include: { role: true } }),
    prisma.role.findUnique({ where: { id: args.newRoleId } }),
  ]);
  if (!user || !newRole) return; // let the caller produce the 404

  for (const perm of SELF_LOCKING) {
    const oldHas = user.role.permissions.includes(perm);
    const newHas = newRole.permissions.includes(perm);
    if (oldHas && !newHas) {
      const remaining = await countUsersWithPermission(perm, args.userId);
      if (remaining === 0) throw lockoutError(perm);
    }
  }
}

// Throws if editing `roleId`'s permissions to `newPermissions` would zero out
// any self-locking permission system-wide.
export async function ensureRolePermissionEditIsSafe(args: { roleId: string; newPermissions: string[] }): Promise<void> {
  const role = await prisma.role.findUnique({ where: { id: args.roleId } });
  if (!role) return;

  for (const perm of SELF_LOCKING) {
    const currentlyHas = role.permissions.includes(perm);
    const willHave = args.newPermissions.includes(perm);
    if (currentlyHas && !willHave) {
      const others = await prisma.user.count({
        where: { roleId: { not: args.roleId }, role: { permissions: { has: perm } } },
      });
      if (others === 0) throw lockoutError(perm);
    }
  }
}

// Throws if deleting `userId` would zero out any self-locking permission system-wide.
export async function ensureUserDeletionIsSafe(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (!user) return;
  for (const perm of SELF_LOCKING) {
    if (!user.role.permissions.includes(perm)) continue;
    const remaining = await countUsersWithPermission(perm, userId);
    if (remaining === 0) throw lockoutError(perm);
  }
}

// Throws if deleting `roleId` would orphan users.
export async function ensureRoleDeletionIsSafe(roleId: string): Promise<void> {
  const inUse = await countUsersWithRole(roleId);
  if (inUse > 0) {
    const err = new Error(`Role is assigned to ${inUse} user(s); reassign them before deleting.`);
    (err as Error & { status?: number }).status = 409;
    throw err;
  }
  // also re-check self-locking perms
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return;
  for (const perm of SELF_LOCKING) {
    if (!role.permissions.includes(perm)) continue;
    const others = await prisma.user.count({
      where: { roleId: { not: roleId }, role: { permissions: { has: perm } } },
    });
    if (others === 0) throw lockoutError(perm);
  }
}

function lockoutError(perm: string): Error & { status: number } {
  const err = new Error(`Refusing to perform action — would leave no user holding permission "${perm}".`) as Error & { status: number };
  err.status = 409;
  return err;
}
