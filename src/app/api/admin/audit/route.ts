// GET /api/admin/audit?cursor=…&action=…&resourceType=…&performedBy=…
//   Paginated audit log (newest first). Cursor is the id of the last seen row.

import { errorResponse, requirePermission } from "@/lib/api-helpers";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

export async function GET(req: Request) {
  try {
    await requirePermission(PERMISSIONS.USERS_MANAGE);
    const url = new URL(req.url);
    const cursor = url.searchParams.get("cursor");
    const action = url.searchParams.get("action");
    const resourceType = url.searchParams.get("resourceType");
    const performedBy = url.searchParams.get("performedBy");

    const rows = await prisma.auditLog.findMany({
      where: {
        action: action ?? undefined,
        resourceType: resourceType ?? undefined,
        performedBy: performedBy ?? undefined,
      },
      orderBy: { performedAt: "desc" },
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { performer: { select: { id: true, name: true, email: true } } },
    });

    const hasMore = rows.length > PAGE_SIZE;
    const items = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
    const nextCursor = hasMore ? items[items.length - 1].id : null;
    return Response.json({ items, nextCursor });
  } catch (err) {
    return errorResponse(err);
  }
}
