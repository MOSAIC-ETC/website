// PATCH  /api/admin/users/[id] — change a user's role
// DELETE /api/admin/users/[id] — delete a user

import { errorResponse, HttpError, requirePermission, writeAuditLog } from "@/lib/api-helpers";
import { ensureUserDeletionIsSafe, ensureUserRoleChangeIsSafe } from "@/lib/admin-guards";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission(PERMISSIONS.USERS_MANAGE);
    const { id } = await params;
    const body = (await req.json()) as { roleId?: unknown };
    const roleId = typeof body.roleId === "string" ? body.roleId : null;
    if (!roleId) throw new HttpError(400, "roleId is required");

    const before = await prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!before) throw new HttpError(404, "User not found");

    try {
      await ensureUserRoleChangeIsSafe({ userId: id, newRoleId: roleId });
    } catch (e) {
      const status = (e as { status?: number }).status ?? 409;
      throw new HttpError(status, (e as Error).message);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { roleId },
      include: { role: true },
    });
    await writeAuditLog({
      action: "user.role_change",
      resourceType: "user",
      resourceId: id,
      description: `Changed ${updated.email} role from ${before.role.name} to ${updated.role.name}`,
      metadata: { fromRole: before.role.name, toRole: updated.role.name },
      performedBy: session.user.id,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission(PERMISSIONS.USERS_MANAGE);
    const { id } = await params;
    if (id === session.user.id) throw new HttpError(409, "You cannot delete your own account");

    const before = await prisma.user.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, "User not found");

    try {
      await ensureUserDeletionIsSafe(id);
    } catch (e) {
      const status = (e as { status?: number }).status ?? 409;
      throw new HttpError(status, (e as Error).message);
    }

    await prisma.user.delete({ where: { id } });
    await writeAuditLog({
      action: "user.delete",
      resourceType: "user",
      resourceId: id,
      description: `Deleted user ${before.email}`,
      performedBy: session.user.id,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
