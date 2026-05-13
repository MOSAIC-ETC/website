// PATCH  /api/admin/roles/[id] — edit name / description / permissions
// DELETE /api/admin/roles/[id]

import { errorResponse, HttpError, requirePermission, writeAuditLog } from "@/lib/api-helpers";
import { ensureRoleDeletionIsSafe, ensureRolePermissionEditIsSafe } from "@/lib/admin-guards";
import { ALL_PERMISSIONS, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission(PERMISSIONS.ROLES_MANAGE);
    const { id } = await params;
    const body = (await req.json()) as { name?: unknown; description?: unknown; permissions?: unknown };

    const data: { name?: string; description?: string | null; permissions?: string[] } = {};
    if (typeof body.name === "string") data.name = body.name.trim();
    if (typeof body.description === "string" || body.description === null) data.description = body.description as string | null;
    if (Array.isArray(body.permissions)) {
      const cleaned = body.permissions.filter(
        (p): p is string => typeof p === "string" && (ALL_PERMISSIONS as string[]).includes(p),
      );
      try {
        await ensureRolePermissionEditIsSafe({ roleId: id, newPermissions: cleaned });
      } catch (e) {
        const status = (e as { status?: number }).status ?? 409;
        throw new HttpError(status, (e as Error).message);
      }
      data.permissions = cleaned;
    }

    if (Object.keys(data).length === 0) throw new HttpError(400, "Nothing to update");

    const before = await prisma.role.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, "Role not found");

    const updated = await prisma.role.update({ where: { id }, data });
    await writeAuditLog({
      action: "role.update",
      resourceType: "role",
      resourceId: id,
      description: `Updated role ${updated.name}`,
      metadata: { before: { name: before.name, permissions: before.permissions }, after: { name: updated.name, permissions: updated.permissions } },
      performedBy: session.user.id,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePermission(PERMISSIONS.ROLES_MANAGE);
    const { id } = await params;
    const before = await prisma.role.findUnique({ where: { id } });
    if (!before) throw new HttpError(404, "Role not found");

    try {
      await ensureRoleDeletionIsSafe(id);
    } catch (e) {
      const status = (e as { status?: number }).status ?? 409;
      throw new HttpError(status, (e as Error).message);
    }

    await prisma.role.delete({ where: { id } });
    await writeAuditLog({
      action: "role.delete",
      resourceType: "role",
      resourceId: id,
      description: `Deleted role ${before.name}`,
      performedBy: session.user.id,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
