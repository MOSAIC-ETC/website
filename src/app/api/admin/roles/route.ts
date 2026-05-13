// GET  /api/admin/roles — list roles
// POST /api/admin/roles — create a role

import { errorResponse, HttpError, requirePermission, writeAuditLog } from "@/lib/api-helpers";
import { ALL_PERMISSIONS, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.ROLES_MANAGE);
    const roles = await prisma.role.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { users: true } } },
    });
    return Response.json({
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        permissions: r.permissions,
        userCount: r._count.users,
      })),
      availablePermissions: ALL_PERMISSIONS,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requirePermission(PERMISSIONS.ROLES_MANAGE);
    const body = (await req.json()) as { name?: unknown; description?: unknown; permissions?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : null;
    const description = typeof body.description === "string" ? body.description : null;
    const permissions = Array.isArray(body.permissions)
      ? body.permissions.filter((p): p is string => typeof p === "string" && (ALL_PERMISSIONS as string[]).includes(p))
      : null;
    if (!name) throw new HttpError(400, "name is required");
    if (!permissions) throw new HttpError(400, "permissions must be an array of valid permission keys");

    const role = await prisma.role.create({
      data: { name, description, permissions },
    });
    await writeAuditLog({
      action: "role.create",
      resourceType: "role",
      resourceId: role.id,
      description: `Created role ${name}`,
      metadata: { permissions },
      performedBy: session.user.id,
    });
    return Response.json(role, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
