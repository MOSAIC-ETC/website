// GET /api/admin/users — list users

import { errorResponse, requirePermission } from "@/lib/api-helpers";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.USERS_MANAGE);
    const users = await prisma.user.findMany({
      include: { role: true },
      orderBy: { createdAt: "asc" },
    });
    return Response.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        createdAt: u.createdAt,
        role: { id: u.role.id, name: u.role.name, permissions: u.role.permissions },
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
